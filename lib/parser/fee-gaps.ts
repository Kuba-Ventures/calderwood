// Fees the practice still owes us before the report can be built (issue #80).
//
// A production report's "Average $" blends office fees with PPO contracted
// fees, so it never supplies a fee. Two situations follow:
//   - Only production reports uploaded: ask for the office fee schedule. A
//     practice without one can type its fees instead (typing).
//   - A code the reports list but no fee schedule prices: it needs a typed
//     fee, or the practice leaves it out on purpose.
// Typed fees act as one more fee schedule, so a typed code keeps the count
// its report gives it.

import { applyEdits, mergeUploads, type MergeResult, type MergeSource, type ReviewEdits } from "./merge-uploads";
import { FEE_MAX, FEE_MIN } from "@/lib/types/pipeline";
import { parseFee } from "./validate";

export const TYPED_SOURCE_ID = "typed-fees";

export type FeeGapInput = {
  /** Successfully read uploads. */
  files: MergeSource[];
  /** The practice chose to type its fees instead of adding a schedule. */
  typing: boolean;
  /** code -> fee typed for a code no schedule prices. */
  typedFees: Record<string, string>;
  /** Codes the practice chose to leave out. */
  leftOut: string[];
  edits: ReviewEdits;
};

export type FeeGap = { code: string; count: number };

export type FeeGapState = {
  merged: MergeResult;
  rows: Array<{ code: string; fee: string }>;
  frequencies: Record<string, number>;
  /** Only production reports, and no typed fees chosen: ask for the schedule. */
  needsSchedule: boolean;
  /** Codes that need a typed fee or "Leave out", most-done first. */
  gaps: FeeGap[];
  /** Gap codes with neither a fee nor a "Leave out" yet. */
  unresolved: string[];
};

export function isTypedFeeValid(fee: string | undefined): boolean {
  const n = parseFee(fee ?? "");
  return Number.isFinite(n) && n >= FEE_MIN && n <= FEE_MAX;
}

export function resolveFeeGaps(input: FeeGapInput): FeeGapState {
  const base = mergeUploads(input.files);
  const reportOnly = base.feesFromReportsOnly;
  const needsSchedule = reportOnly && !input.typing;

  // Counts per code from the files the merge kept (duplicates add nothing).
  const counts: Record<string, number> = {};
  for (const f of input.files) {
    if (base.duplicateOf[f.id]) continue;
    for (const [code, n] of Object.entries(f.volumes)) {
      if (n > 0) counts[code] = (counts[code] ?? 0) + n;
    }
  }

  const gapCodes = needsSchedule ? [] : reportOnly ? base.rows.map((r) => r.code) : base.unpricedCodes;
  const gaps = gapCodes
    .map((code) => ({ code, count: counts[code] ?? 0 }))
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));

  // Typed fees join as a schedule. Added even when empty while typing, so a
  // report's averages never price anything.
  const typedRows = gapCodes
    .filter((code) => isTypedFeeValid(input.typedFees[code]))
    .map((code) => ({ code, fee: input.typedFees[code].trim() }));
  const typed: MergeSource = {
    id: TYPED_SOURCE_ID,
    name: "Fees you typed",
    kind: "csv",
    rows: typedRows,
    volumes: {},
    providerFees: {},
  };
  const merged = needsSchedule ? base : mergeUploads([...input.files, typed]);
  const { rows, frequencies } = applyEdits(merged, input.edits);

  const priced = new Set(rows.map((r) => r.code));
  const out = new Set([...input.leftOut, ...input.edits.removed]);
  const unresolved = gaps.map((g) => g.code).filter((c) => !priced.has(c) && !out.has(c));

  return { merged, rows, frequencies, needsSchedule, gaps, unresolved };
}
