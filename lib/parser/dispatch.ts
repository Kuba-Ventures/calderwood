// Top-level upload parser. Detects file type, dispatches to CSV or PDF,
// returns a normalized ParseOutcome that maps directly to the
// fee_schedules.parse_confidence / parsed_data columns.

import { parseCsv, scoreCsvConfidence } from "./csv";
import { createPdfParser, type PageImage, type PdfRasterizer } from "./pdf";
import { validateEntries } from "./validate";
import type { ParseConfidence, FeeEntry } from "@/lib/types/pipeline";

export type UploadKind = "csv" | "pdf" | "paste";

export type UploadInput =
  | { kind: "csv"; text: string }
  | { kind: "pdf"; bytes: Uint8Array; scheduleType: "master" | "carrier" }
  | { kind: "paste"; rows: Array<{ code: string; fee: number | string }> };

export type ParseOutcome = {
  entries: FeeEntry[];
  confidence: ParseConfidence;
  notes: string[];
  /** Rejected raw rows with the reason. Surfaced to the review queue. */
  rejected: Array<{ raw: unknown; reason: string }>;
};

export type ParserDeps = {
  /** Optional Anthropic API key. When absent, PDF parsing returns failed. */
  anthropicApiKey?: string;
  /** PDF -> page-images function. Required if PDF uploads are expected. */
  rasterize?: PdfRasterizer;
};

export async function parseUpload(
  input: UploadInput,
  deps: ParserDeps = {}
): Promise<ParseOutcome> {
  if (input.kind === "csv") {
    const result = parseCsv(input.text);
    return {
      entries: result.valid,
      confidence: scoreCsvConfidence(result),
      notes: result.matchedColumns
        ? [`matched ${result.matchedColumns.code}/${result.matchedColumns.fee}`]
        : ["no header match; used first-row fallback"],
      rejected: result.rejected,
    };
  }

  if (input.kind === "paste") {
    // Paste/manual entries are pre-structured; just validate.
    const validated = validatePasteRows(input.rows);
    const confidence: ParseConfidence =
      validated.valid.length === 0
        ? "failed"
        : validated.rejected.length === 0
        ? "high"
        : "medium";
    return {
      entries: validated.valid,
      confidence,
      notes: validated.rejected.length
        ? [`${validated.rejected.length} rejected during paste validation`]
        : [],
      rejected: validated.rejected,
    };
  }

  // PDF
  const rasterize = deps.rasterize ?? noRasterizer;
  const parsePdf = createPdfParser({
    apiKey: deps.anthropicApiKey,
    rasterize,
  });
  const result = await parsePdf({
    pdfBytes: input.bytes,
    scheduleType: input.scheduleType,
  });
  return {
    entries: result.valid,
    confidence:
      result.valid.length === 0
        ? "failed"
        : result.rejected.length > 0
        ? "low"
        : "medium",
    notes: result.notes,
    rejected: result.rejected,
  };
}

async function noRasterizer(_bytes: Uint8Array): Promise<PageImage[]> {
  // Deployment-time wiring: connect a real pdf-to-image function. Until
  // then, return empty pages so the parser fails closed.
  return [];
}

function validatePasteRows(rows: Array<{ code: string; fee: number | string }>) {
  return validateEntries(rows.map((r) => ({ code: r.code, fee: r.fee })));
}
