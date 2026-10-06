// Input sanity check for the uploaded fees. Catches the most common bad input:
// a production report (e.g. Open Dental "Procedure Summary") whose "Average $"
// blends full office fees with discounted PPO contracted fees. Those averages
// sit far below the local median on every code, which inflates the headline
// past anything a real practice could recover.
//
// Pure function over the stored code rows, so it also applies to reports that
// were computed before this check existed.

import type { CodeRow } from "@/lib/types/pipeline";

/** Fees below this share of the local median, volume-weighted, look like averages. */
export const FEE_TO_MEDIAN_FLOOR = 0.7;
/** Recoverable above this share of production is not believable. */
export const RECOVERABLE_SHARE_CEILING = 0.6;
/** Need at least this many benchmarked codes before judging the input. */
export const MIN_BENCHMARKED_CODES = 5;

export type FeeSanity = {
  /** True when the fees look like averages or contracted rates, not office fees. */
  suspect: boolean;
  /** Volume-weighted practice fee / local median (p50). Null when not enough data. */
  feeToMedian: number | null;
  /** Annual recoverable / annual production at the practice's fees. */
  recoverableShare: number | null;
  benchmarkedCodes: number;
};

export function assessFeeSanity(rows: CodeRow[]): FeeSanity {
  let feeVolume = 0;
  let medianVolume = 0;
  let production = 0;
  let recoverable = 0;
  let benchmarkedCodes = 0;

  for (const r of rows) {
    const volume = r.annualFrequency > 0 ? r.annualFrequency : 0;
    production += r.practiceFee * volume;
    recoverable += Math.max(0, r.annualRecoverableMarket);
    if (r.p50 && r.p50 > 0 && volume > 0) {
      benchmarkedCodes += 1;
      feeVolume += r.practiceFee * volume;
      medianVolume += r.p50 * volume;
    }
  }

  if (benchmarkedCodes < MIN_BENCHMARKED_CODES || medianVolume <= 0) {
    return { suspect: false, feeToMedian: null, recoverableShare: null, benchmarkedCodes };
  }

  const feeToMedian = feeVolume / medianVolume;
  const recoverableShare = production > 0 ? recoverable / production : null;
  const suspect =
    feeToMedian < FEE_TO_MEDIAN_FLOOR ||
    (recoverableShare !== null && recoverableShare > RECOVERABLE_SHARE_CEILING);

  return { suspect, feeToMedian, recoverableShare, benchmarkedCodes };
}
