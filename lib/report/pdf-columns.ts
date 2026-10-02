// Per-code dollar columns shown in the PDF report. Kept here (pure, no
// react-pdf import) so the figures can be tested against the report totals.
//
// Both columns use the fee-schedule gap, the same per-code figure as the web
// code table: max(0, UCR p75 minus your fee) times annual volume. The Top 10
// rows are therefore a subset of the headline, and the appendix column sums to
// it (see summarizeTotals in lib/computation/compute.ts).

import type { CodeRow, ComputationOutput } from "@/lib/types/pipeline";

export type Top10Row = {
  row: CodeRow;
  /** UCR p75 minus your fee, clamped at zero. */
  gap: number;
  /** gap times annual volume. */
  annual: number;
};

export function top10Rows(data: ComputationOutput): Top10Row[] {
  return data.top10ByImpact.map((row) => ({
    row,
    gap: row.marketGap,
    annual: row.annualRecoverableMarket,
  }));
}

/** Appendix "Annual" column for one code. */
export function appendixAnnual(row: CodeRow): number {
  return row.annualRecoverableMarket;
}
