// Shared validation for parsed fee entries. CSV and PDF paths both run
// every row through these checks before declaring success.

import { CDT_REGEX, FEE_MAX, FEE_MIN, type FeeEntry } from "@/lib/types/pipeline";

export type ParsedEntry = { code: string; fee: number };

export type ValidationResult = {
  valid: ParsedEntry[];
  rejected: Array<{ raw: unknown; reason: string }>;
};

export function validateEntries(rows: Array<{ code: unknown; fee: unknown }>): ValidationResult {
  const valid: ParsedEntry[] = [];
  const rejected: ValidationResult["rejected"] = [];
  const seen = new Set<string>();

  for (const raw of rows) {
    const code = typeof raw.code === "string" ? raw.code.trim().toUpperCase() : "";
    const fee = typeof raw.fee === "number" ? raw.fee : Number(raw.fee);

    if (!CDT_REGEX.test(code)) {
      // Reject codes that don't match D + 4 digits (no silent normalization).
      rejected.push({ raw, reason: `Invalid CDT format: "${String(raw.code)}"` });
      continue;
    }
    if (!Number.isFinite(fee)) {
      rejected.push({ raw, reason: `Fee not a number: "${String(raw.fee)}"` });
      continue;
    }
    if (fee < FEE_MIN) {
      rejected.push({ raw, reason: `Fee below ${FEE_MIN} for ${code}: ${fee}` });
      continue;
    }
    if (fee > FEE_MAX) {
      rejected.push({ raw, reason: `Fee above ${FEE_MAX} for ${code}: ${fee}` });
      continue;
    }
    if (seen.has(code)) {
      // First occurrence wins; flag the duplicate.
      rejected.push({ raw, reason: `Duplicate code ${code} (kept first occurrence)` });
      continue;
    }
    seen.add(code);
    valid.push({ code, fee: Math.round(fee * 100) / 100 });
  }

  return { valid, rejected };
}

// Convert a raw fee string ("$1,234.56", "1234", "$ 1,234") into a number,
// or NaN if unparseable. We strip currency symbols and commas only.
export function parseFee(input: string | number | null | undefined): number {
  if (typeof input === "number") return input;
  if (typeof input !== "string") return NaN;
  const cleaned = input.replace(/[$,\s]/g, "");
  if (cleaned === "") return NaN;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

export type { FeeEntry };
