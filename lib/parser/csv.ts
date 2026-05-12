// CSV fee schedule parser. Auto-detect column headers first; if that fails,
// inspect the first data row for a CDT-shaped cell and a numeric cell.
// Never silently normalize codes or invent values.

import Papa from "papaparse";
import { CDT_REGEX } from "@/lib/types/pipeline";
import { parseFee, validateEntries, type ValidationResult } from "./validate";

const CODE_KEYWORDS = ["code", "cdt", "procedure", "proc"];
const FEE_KEYWORDS = ["fee", "amount", "charge", "allowed", "rate", "price"];

export type CsvParseResult = ValidationResult & {
  matchedColumns: { code: string; fee: string } | null;
  rowCount: number;
};

export function parseCsv(text: string): CsvParseResult {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const rows = parsed.data;
  if (rows.length === 0) {
    return {
      valid: [],
      rejected: [],
      matchedColumns: null,
      rowCount: 0,
    };
  }

  const headers = Object.keys(rows[0] ?? {});
  const matched = matchHeaders(headers);

  if (matched) {
    const raws = rows.map((row) => ({
      code: row[matched.code] ?? "",
      fee: parseFee(row[matched.fee]),
    }));
    return {
      ...validateEntries(raws),
      matchedColumns: matched,
      rowCount: rows.length,
    };
  }

  // Header detection failed. Fall back: inspect the first data row to find
  // a CDT-shaped cell and a numeric cell, then re-parse without headers.
  const fallback = detectColumnsFromFirstRow(text);
  if (fallback) {
    const raws = fallback.rows.map((row) => ({
      code: row[fallback.codeIdx] ?? "",
      fee: parseFee(row[fallback.feeIdx]),
    }));
    return {
      ...validateEntries(raws),
      matchedColumns: {
        code: `column ${fallback.codeIdx}`,
        fee: `column ${fallback.feeIdx}`,
      },
      rowCount: fallback.rows.length,
    };
  }

  // Could not identify columns. Caller marks confidence=failed.
  return {
    valid: [],
    rejected: [{ raw: rows[0], reason: "Could not identify code or fee columns" }],
    matchedColumns: null,
    rowCount: rows.length,
  };
}

function matchHeaders(headers: string[]): { code: string; fee: string } | null {
  const code = headers.find((h) => CODE_KEYWORDS.some((k) => h.toLowerCase().includes(k)));
  const fee = headers.find((h) => FEE_KEYWORDS.some((k) => h.toLowerCase().includes(k)));
  if (code && fee) return { code, fee };
  return null;
}

function detectColumnsFromFirstRow(text: string): {
  codeIdx: number;
  feeIdx: number;
  rows: string[][];
} | null {
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });
  const rows = parsed.data;
  if (rows.length < 2) return null;

  // Scan rows starting at index 0 (might be data) and 1 (skip header).
  for (let start = 0; start < Math.min(rows.length, 3); start++) {
    const row = rows[start];
    if (!row) continue;
    let codeIdx = -1;
    let feeIdx = -1;
    for (let i = 0; i < row.length; i++) {
      const v = (row[i] ?? "").trim().toUpperCase();
      if (CDT_REGEX.test(v) && codeIdx === -1) codeIdx = i;
      if (Number.isFinite(parseFee(row[i])) && parseFee(row[i]) >= 10 && feeIdx === -1)
        feeIdx = i;
    }
    if (codeIdx !== -1 && feeIdx !== -1 && codeIdx !== feeIdx) {
      return { codeIdx, feeIdx, rows: rows.slice(start) };
    }
  }
  return null;
}

// Confidence scoring for CSV uploads.
export function scoreCsvConfidence(result: CsvParseResult): "high" | "medium" | "low" | "failed" {
  if (result.valid.length === 0) return "failed";
  const total = result.valid.length + result.rejected.length;
  const validRatio = result.valid.length / total;
  // Clean headers + >90% valid rows.
  if (result.matchedColumns && !result.matchedColumns.code.startsWith("column") && validRatio > 0.9) {
    return "high";
  }
  if (validRatio > 0.7 && result.valid.length >= 10) return "medium";
  return "low";
}
