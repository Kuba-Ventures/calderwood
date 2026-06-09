// Native-PDF extractor for practice-management "Procedure Summary" reports.
//
// Unlike lib/parser/pdf.ts (which rasterizes a simple fee-schedule PDF page by
// page), this sends the whole PDF to Claude as a native `document` content
// block — no rasterizer needed — with a prompt tuned for the hierarchical
// production reports dentists actually export (Dentrix / Eaglesoft / Open
// Dental). Those reports give us BOTH the fee (the code-level "Average $") and
// the real annual volume (the code-level "Quantity"), so we return frequency
// alongside fee — richer than a bare fee schedule.
//
// Extraction rules the prompt enforces:
//   - code-level summary rows ONLY (skip the per-provider sub-rows like DDS0)
//   - "Average $" -> fee, "Quantity" -> annualVolume
//   - valid CDT codes only (D + 4 digits); skip category headers, grand totals,
//     and non-CDT custom/membership rows (BA, SINGLE, Ad Plan., D00000, etc.)
//   - skip $0 / zero-fee rows (no usable fee)

import "server-only";
import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-opus-4-8";

export type PdfSummaryEntry = {
  code: string;
  fee: number;
  annualVolume: number;
  /** Per-provider average fee for this code (provider label -> fee). */
  providerFees?: Record<string, number>;
};

export type PdfSummaryResult = {
  entries: PdfSummaryEntry[];
  notes: string[];
  confidence: "high" | "medium" | "low" | "failed";
};

const SYSTEM = `You extract dental fee data from practice-management "Procedure Summary" / production reports (Dentrix, Eaglesoft, Open Dental, etc.).

These reports list CDT procedure codes grouped by category, and for each code show columns like: Code, Provider, Quantity, Total $, Average $, % of Total. Each code has a bold code-level summary row, often followed by per-provider breakdown rows (provider labels such as DDS0, DDS3, DDS4, HYG2).

Extract ONE row per CDT code:
- Use the CODE-LEVEL summary row (the row whose Code column holds the CDT code), NOT the per-provider sub-rows.
- fee = the code's "Average $" value (the blended average fee per procedure).
- annualVolume = the code's "Quantity" value (count of procedures over the report's date range).

STRICT inclusion rules:
- Include only valid CDT codes: the letter D followed by exactly 4 digits (e.g. D0120, D2740, D7210).
- EXCLUDE category headers (Diagnostic, Preventive, Restorative, etc.), grand totals, and any non-CDT row (e.g. [None], BA, SINGLE, FLLW, "Redo fill", Ad Plan., Del Den, Case, D00000, D0001, 90620).
- EXCLUDE any code whose Average $ is 0 or blank (no usable fee).
- Do not invent or infer values. Read them off the report. Round fee to cents and annualVolume to a whole number.

ALSO, for each code, capture the per-provider average fee from the sub-rows under it (provider labels such as DDS0, DDS3, DDS4, HYG2). Put them in a "providers" object mapping each provider label to that provider's Average $ for the code. Omit providers whose Average $ is 0 or blank. If a code has no per-provider sub-rows, omit "providers".

Respond with ONLY a JSON object, no prose and no markdown fences, of the exact form:
{"entries":[{"code":"D2740","fee":864.43,"annualVolume":200,"providers":{"DDS0":942.93,"DDS3":839.65}}],"notes":["..."]}
Put any caveats (ambiguous rows, skipped sections) in "notes".`;

const CDT_RE = /^D\d{4}$/;

/** Pull a JSON object out of the model's text, tolerating ```json fences. */
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) return text.slice(start, end + 1);
  return text.trim();
}

/**
 * Extract code + fee + annual volume from a PM Procedure Summary PDF.
 * `pdfBase64` is the raw PDF, base64-encoded. Requires an Anthropic API key.
 */
export async function parsePdfSummary(opts: {
  pdfBase64: string;
  apiKey?: string;
}): Promise<PdfSummaryResult> {
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
            text: "Extract every CDT code's average fee and annual quantity from this Procedure Summary, following the rules exactly. Respond with JSON only.",
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

  // Defensive re-validation: enforce the inclusion rules even if the model slips.
  const seen = new Set<string>();
  const entries: PdfSummaryEntry[] = [];
  let dropped = 0;
  for (const r of raw as Array<Record<string, unknown>>) {
    const code = String(r.code ?? "").trim().toUpperCase();
    const fee = Number(r.fee);
    const annualVolume = Math.round(Number(r.annualVolume));
    if (!CDT_RE.test(code) || !Number.isFinite(fee) || fee <= 0) {
      dropped++;
      continue;
    }
    if (seen.has(code)) continue;
    seen.add(code);
    // Per-provider fees: keep numeric, positive entries only.
    let providerFees: Record<string, number> | undefined;
    const rawProv = r.providers;
    if (rawProv && typeof rawProv === "object") {
      const pf: Record<string, number> = {};
      for (const [label, v] of Object.entries(rawProv as Record<string, unknown>)) {
        const f = Number(v);
        if (label && Number.isFinite(f) && f > 0) pf[label] = Math.round(f * 100) / 100;
      }
      if (Object.keys(pf).length > 0) providerFees = pf;
    }
    entries.push({
      code,
      fee: Math.round(fee * 100) / 100,
      annualVolume: Number.isFinite(annualVolume) && annualVolume > 0 ? annualVolume : 0,
      ...(providerFees ? { providerFees } : {}),
    });
  }
  if (dropped > 0) notes.push(`${dropped} extracted row(s) failed validation and were dropped.`);

  const confidence: PdfSummaryResult["confidence"] =
    entries.length === 0 ? "failed" : entries.length >= 10 ? "medium" : "low";

  return { entries, notes, confidence };
}
