// PDF fee schedule parser. Convert each page to a base64 image, send to
// Claude with a strict extraction prompt, parse the JSON response, and
// run every entry through the shared validator.
//
// We never retry a failed page against a different prompt. One attempt,
// then flag for human review. Retrying masks systematic problems.
//
// PDF -> image rasterization is delegated to a caller-supplied function
// so the renderer is interchangeable (sharp + pdfjs, pdf-to-png-converter,
// or whatever lands in the deployment env).

import Anthropic from "@anthropic-ai/sdk";
import { validateEntries, type ValidationResult } from "./validate";

const MODEL = "claude-sonnet-4-6";

export type PdfParseInput = {
  /** PDF bytes, e.g. from a Supabase storage download. */
  pdfBytes: Uint8Array;
  /** Schedule type so we can tune the "office fee vs insurance allowed" rule. */
  scheduleType: "master" | "carrier";
};

export type PageImage = {
  /** base64-encoded PNG, no data URI prefix. */
  base64: string;
  pageNumber: number;
};

export type PdfRasterizer = (pdfBytes: Uint8Array) => Promise<PageImage[]>;

export type PdfParseResult = ValidationResult & {
  pageCount: number;
  notes: string[];
};

const SYSTEM_PROMPT = `You are extracting a dental fee schedule from a document. The document contains CDT procedure codes (format: D followed by 4 digits, e.g., D2740) paired with dollar fees. Return ONLY valid JSON matching this schema:

{"entries": [{"code": "D####", "fee": <number>}], "notes": "<any concerns about the extraction>"}

Rules:
- Skip any row where the code is not a valid CDT format (D + 4 digits)
- Skip header rows, descriptions, totals
- If a code appears multiple times with different fees, include only the one labeled "fee" or "office fee" (not "insurance allowed" unless this is a carrier-specific schedule)
- If you cannot extract anything, return {"entries": [], "notes": "explanation"}
- Never invent codes or fees. If unclear, omit.`;

function carrierVariant(scheduleType: "master" | "carrier"): string {
  if (scheduleType === "carrier") {
    return ' This document IS a carrier-specific schedule, so prefer fields labeled "allowed", "carrier fee", or "contracted rate".';
  }
  return ' This document is the practice master fee schedule. Prefer the "office fee" / "UCR fee" / "billed amount" column over any "insurance allowed" or "carrier" columns.';
}

export function createPdfParser(opts: {
  apiKey: string | undefined;
  rasterize: PdfRasterizer;
}) {
  if (!opts.apiKey) {
    // Stub mode: the parser fails closed when no key is present. Caller
    // routes the upload to the review queue.
    return async function pdfParseStub(_input: PdfParseInput): Promise<PdfParseResult> {
      return {
        valid: [],
        rejected: [],
        pageCount: 0,
        notes: ["ANTHROPIC_API_KEY not configured; PDF parsing skipped."],
      };
    };
  }

  const client = new Anthropic({ apiKey: opts.apiKey });

  return async function pdfParse(input: PdfParseInput): Promise<PdfParseResult> {
    const pages = await opts.rasterize(input.pdfBytes);
    const notes: string[] = [];
    const allRaw: Array<{ code: unknown; fee: unknown }> = [];

    for (const page of pages) {
      const result = await callClaude(client, page, input.scheduleType);
      if (result.error) {
        notes.push(`page ${page.pageNumber}: ${result.error}`);
        continue;
      }
      if (result.notes) notes.push(`page ${page.pageNumber}: ${result.notes}`);
      for (const entry of result.entries) allRaw.push(entry);
    }

    const validation = validateEntries(allRaw);
    return {
      ...validation,
      pageCount: pages.length,
      notes,
    };
  };
}

async function callClaude(
  client: Anthropic,
  page: PageImage,
  scheduleType: "master" | "carrier"
): Promise<{ entries: Array<{ code: unknown; fee: unknown }>; notes?: string; error?: string }> {
  try {
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT + carrierVariant(scheduleType),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: "image/png", data: page.base64 },
            },
            {
              type: "text",
              text: `Extract the fee schedule entries from this page (page ${page.pageNumber}). Respond with JSON only.`,
            },
          ],
        },
      ],
    });

    const block = resp.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") {
      return { entries: [], error: "no text in response" };
    }
    const json = tryParseJson(block.text);
    if (!json) return { entries: [], error: "non-JSON response" };
    if (!Array.isArray(json.entries)) {
      return { entries: [], error: "missing entries array" };
    }
    return { entries: json.entries, notes: typeof json.notes === "string" ? json.notes : undefined };
  } catch (err) {
    return { entries: [], error: err instanceof Error ? err.message : String(err) };
  }
}

function tryParseJson(text: string): { entries?: unknown; notes?: unknown } | null {
  // Claude sometimes wraps JSON in ```json``` fences despite "JSON only".
  const stripped = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(stripped) as { entries?: unknown; notes?: unknown };
  } catch {
    return null;
  }
}

export function scorePdfConfidence(result: PdfParseResult): "high" | "medium" | "low" | "failed" {
  if (result.valid.length === 0) return "failed";
  if (result.valid.length < 10) return "low";
  if (result.rejected.length > 0) return "low";
  return "medium"; // PDF parsing is medium at best until visually QA'd
}
