// Native-PDF parser for a single carrier's / PPO's fee schedule (a flat
// "CDT code -> contracted/allowed fee" list). Distinct from pdf-summary.ts,
// which reads a production report with volumes — a carrier schedule has no
// volumes, just the rate that plan pays per code.
//
// Sends the whole PDF to Claude as a native document block (no rasterizer) with
// a prompt tuned for fee schedules, and defensively re-validates the output.

import "server-only";
import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-opus-4-8";

export type ScheduleEntry = { code: string; fee: number };

export type PdfScheduleResult = {
  entries: ScheduleEntry[];
  notes: string[];
  confidence: "high" | "medium" | "low" | "failed";
};

const SYSTEM = `You extract a dental carrier/PPO fee schedule from a PDF: a list mapping CDT procedure codes to the fee that plan allows/contracts/pays.

Extract one row per CDT code:
- code: the CDT code (the letter D followed by exactly 4 digits, e.g. D0120, D2740).
- fee: the contracted/allowed/scheduled dollar amount for that code. If several fee columns exist (e.g. "office fee" vs "allowed"/"plan pays"/"scheduled"), use the carrier's ALLOWED/CONTRACTED amount, not the office's full fee.

STRICT rules:
- Include only valid CDT codes (D + 4 digits). Skip headers, category labels, totals, and any non-CDT row.
- Skip codes whose fee is 0 or blank.
- Do not invent values. Read them off the schedule. Round fee to cents.

Respond with ONLY a JSON object, no prose and no markdown fences, of the exact form:
{"entries":[{"code":"D0120","fee":52.00}],"notes":["..."]}
Put any caveats (which column you used, ambiguous rows) in "notes".`;

const CDT_RE = /^D\d{4}$/;

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) return text.slice(start, end + 1);
  return text.trim();
}

export async function parsePdfSchedule(opts: {
  pdfBase64: string;
  apiKey?: string;
}): Promise<PdfScheduleResult> {
  const apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      entries: [],
      notes: ["ANTHROPIC_API_KEY not configured; PDF extraction skipped."],
      confidence: "failed",
    };
  }

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: opts.pdfBase64,
            },
          },
          {
            type: "text",
            text: "Extract this carrier fee schedule's CDT codes and contracted fees. Respond with JSON only.",
          },
        ],
      },
    ],
  });

  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") {
    return { entries: [], notes: ["No text in model response."], confidence: "failed" };
  }

  let parsed: { entries?: unknown; notes?: unknown };
  try {
    parsed = JSON.parse(extractJson(text.text));
  } catch {
    return {
      entries: [],
      notes: ["Could not parse extraction output as JSON."],
      confidence: "failed",
    };
  }

  const raw = Array.isArray(parsed.entries) ? parsed.entries : [];
  const notes = Array.isArray(parsed.notes)
    ? (parsed.notes as unknown[]).filter((n): n is string => typeof n === "string")
    : [];

  const seen = new Set<string>();
  const entries: ScheduleEntry[] = [];
  for (const r of raw as Array<Record<string, unknown>>) {
    const code = String(r.code ?? "").trim().toUpperCase();
    const fee = Number(r.fee);
    if (!CDT_RE.test(code) || !Number.isFinite(fee) || fee <= 0) continue;
    if (seen.has(code)) continue;
    seen.add(code);
    entries.push({ code, fee: Math.round(fee * 100) / 100 });
  }

  const confidence: PdfScheduleResult["confidence"] =
    entries.length === 0 ? "failed" : entries.length >= 10 ? "medium" : "low";

  return { entries, notes, confidence };
}
