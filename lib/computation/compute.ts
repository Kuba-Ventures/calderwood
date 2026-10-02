// Pure computation: ComputationInput + benchmark resolver -> ComputationOutput.
// No DB writes. No I/O beyond the injected resolver; the description lookup is
// synchronous and resolved by the caller before compute runs. This function is
// re-runnable against the same input and must produce identical output.

import { DescribeCode } from "@/lib/cdt/descriptions";
import { getCdtDescription } from "@/lib/seed/cdt-codes";
import {
  Benchmark,
  CodeRow,
  ComputationInput,
  ComputationOutput,
  GeoLevel,
  UnderpaymentBasis,
} from "@/lib/types/pipeline";

export type ResolveBenchmark = (
  zip5: string,
  cdtCode: string
) => Promise<Benchmark | null>;

export async function compute(
  input: ComputationInput,
  resolve: ResolveBenchmark,
  // Defaults to the in-repo short labels, which only cover ~50 codes. Callers
  // with a Supabase client should pass loadCdtDescriptions(sb) so the long
  // tail gets words instead of a bare code next to a dollar figure.
  describe: DescribeCode = getCdtDescription
): Promise<ComputationOutput> {
  const flags: string[] = [];
  const codeRows: CodeRow[] = [];

  // Track whether any carrier schedule contributed at least one fee. If yes,
  // the report adds carrier figures next to the fee-schedule headline.
  const carriersWithData = new Set<string>();
  for (const [carrier, schedule] of Object.entries(input.carrierSchedules)) {
    if (schedule.length > 0) carriersWithData.add(carrier);
  }
  const haveCarrierData = carriersWithData.size > 0;
  const basis: UnderpaymentBasis = haveCarrierData ? "carrier" : "market";

  if (!haveCarrierData) {
    flags.push(
      "No carrier schedules parsed. Carrier figures are not available."
    );
  }

  // --- Per-code computation ----------------------------------------------

  for (const entry of input.masterSchedule) {
    const benchmark = await resolve(input.zip5, entry.code);
    const frequency = input.frequencies[entry.code];
    const haveFrequency = typeof frequency === "number" && frequency > 0;

    const annualFrequency = haveFrequency ? frequency : 0;
    if (!haveFrequency) {
      flags.push(
        `Frequency missing for ${entry.code}; annual recoverable cannot be computed.`
      );
    }

    if (!benchmark) {
      codeRows.push({
        code: entry.code,
        description: describe(entry.code),
        practiceFee: entry.fee,
        p50: null,
        p75: null,
        p90: null,
        geoLevelUsed: null,
        confidence: "no_data",
        marketGap: 0,
        percentileRank: null,
        annualFrequency,
        annualRecoverableMarket: 0,
        carrierFees: {},
        carrierGaps: {},
        annualRecoverableByCarrier: {},
      });
      flags.push(`No benchmark data for ${entry.code}; excluded from totals.`);
      continue;
    }

    const marketGap = Math.max(0, benchmark.p75 - entry.fee);
    const annualRecoverableMarket = marketGap * annualFrequency;
    const percentileRank = computePercentileRank(entry.fee, benchmark);

    const carrierFees: Record<string, number> = {};
    const carrierGaps: Record<string, number> = {};
    const annualRecoverableByCarrier: Record<string, number> = {};

    for (const [carrier, schedule] of Object.entries(input.carrierSchedules)) {
      const carrierRow = schedule.find((s) => s.code === entry.code);
      if (!carrierRow) continue; // do not assume the master fee applies
      carrierFees[carrier] = carrierRow.fee;
      const gap = Math.max(0, benchmark.p75 - carrierRow.fee);
      carrierGaps[carrier] = gap;
      annualRecoverableByCarrier[carrier] = gap * annualFrequency;
    }

    // Provider variance: bring lower-charging providers up to the highest
    // in-house fee for this code. Volume split evenly across providers.
    const provFees = input.providerFees?.[entry.code];
    let providerFees: Record<string, number> | undefined;
    let providerVarianceRecoverable: number | undefined;
    if (provFees) {
      const vals = Object.values(provFees).filter((v) => v > 0);
      if (vals.length > 1) {
        const hi = Math.max(...vals);
        const perProviderVol = annualFrequency / vals.length;
        providerFees = provFees;
        providerVarianceRecoverable = Math.round(
          vals.reduce((s, v) => s + Math.max(0, hi - v) * perProviderVol, 0)
        );
      }
    }

    codeRows.push({
      code: entry.code,
      description: describe(entry.code),
      practiceFee: entry.fee,
      p50: benchmark.p50,
      p75: benchmark.p75,
      p90: benchmark.p90,
      geoLevelUsed: benchmark.geoLevelUsed,
      confidence: benchmark.confidence as CodeRow["confidence"],
      marketGap,
      percentileRank,
      annualFrequency,
      annualRecoverableMarket,
      carrierFees,
      carrierGaps,
      annualRecoverableByCarrier,
      ...(providerFees ? { providerFees, providerVarianceRecoverable } : {}),
    });
  }

  // --- Executive summary --------------------------------------------------

  // Two distinct totals (see summarizeTotals): the fee-schedule gap is the
  // headline, the carrier gap is reported alongside it. Per-code clamp is
  // already applied above.
  const totals = summarizeTotals(codeRows);
  const totalAnnualUnderpayment = totals.feeScheduleGap;

  // Codes below p75 in top 20 -- sort by practice volume, exclude no_data.
  const scoredCodes = codeRows.filter((r) => r.confidence !== "no_data");
  const byVolume = [...scoredCodes].sort(
    (a, b) => b.practiceFee * b.annualFrequency - a.practiceFee * a.annualFrequency
  );
  const top20 = byVolume.slice(0, Math.min(20, byVolume.length));
  const belowP75 = top20.filter((r) => r.p75 !== null && r.practiceFee < r.p75);
  const codesBelowP75InTop20 = {
    count: belowP75.length,
    total: top20.length,
  };

  // Top carrier -- only meaningful if carrier schedules were parsed.
  let topCarrier: ComputationOutput["executiveSummary"]["topCarrier"] = null;
  if (haveCarrierData) {
    const sorted = Object.entries(totals.byCarrier).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0 && sorted[0][1] > 0) {
      topCarrier = { name: sorted[0][0], recoverable: sorted[0][1] };
    }
  }

  // Top 10 by impact: ranked by the same per-code fee-schedule gap the code
  // table shows (annualRecoverableMarket), so the ten rows are a subset of the
  // headline. Excludes no_data and zero-gap codes. Ranking by the worst
  // carrier's gap times the code's full volume would reconcile with neither
  // total.
  const top10ByImpact = [...scoredCodes]
    .filter((row) => row.annualRecoverableMarket > 0)
    .sort((a, b) => b.annualRecoverableMarket - a.annualRecoverableMarket)
    .slice(0, 10);

  // Recoverable by carrier -- volume-weighted total per carrier, descending.
  const recoverableByCarrier: ComputationOutput["recoverableByCarrier"] = [];
  if (haveCarrierData) {
    for (const [carrier, recoverable] of Object.entries(totals.byCarrier)) {
      if (recoverable > 0) recoverableByCarrier.push({ carrier, recoverable });
    }
    recoverableByCarrier.sort((a, b) => b.recoverable - a.recoverable);
  }

  // Worked example: top10 row with high confidence, marketGap > 0,
  // frequency >= 50. Relax frequency if no candidate.
  const workedExample = pickWorkedExample(top10ByImpact);

  return {
    codeRows,
    executiveSummary: {
      totalAnnualUnderpayment,
      carrierAnnualUnderpayment: totals.carrierGap,
      codesBelowP75InTop20,
      topCarrier,
      underpaymentBasis: basis,
    },
    top10ByImpact,
    recoverableByCarrier,
    workedExample,
    flags,
  };
}

/**
 * The two report totals, derived from the code rows so stored reports can be
 * re-summarized without re-running compute.
 *
 * - feeScheduleGap: the headline. Sum over codes of (UCR p75 minus your own
 *   fee, clamped at zero) times annual volume. This is what the code table
 *   and the category breakdown add up to.
 * - carrierGap: what contracted carriers pay below p75. A code's volume is
 *   split evenly across the carriers that list a rate for it, because intake
 *   does not capture payer mix. Each row's annualRecoverableByCarrier is that
 *   carrier's gap times the code's full volume, so it is divided by the
 *   number of carriers on the code before summing. Without the split, five
 *   carriers would count the same procedures five times.
 * - byCarrier: carrierGap broken out per carrier (sums to carrierGap).
 */
export function summarizeTotals(rows: CodeRow[]): {
  feeScheduleGap: number;
  carrierGap: number;
  byCarrier: Record<string, number>;
} {
  let feeScheduleGap = 0;
  let carrierGap = 0;
  const byCarrier: Record<string, number> = {};
  for (const row of rows) {
    feeScheduleGap += row.annualRecoverableMarket;
    const entries = Object.entries(row.annualRecoverableByCarrier);
    if (entries.length === 0) continue;
    for (const [carrier, amt] of entries) {
      const share = amt / entries.length;
      byCarrier[carrier] = (byCarrier[carrier] ?? 0) + share;
      carrierGap += share;
    }
  }
  return { feeScheduleGap, carrierGap, byCarrier };
}

export function computePercentileRank(fee: number, b: Benchmark): number {
  if (fee >= b.p90) return 99;
  if (fee >= b.p75) {
    const span = b.p90 - b.p75;
    if (span <= 0) return 75;
    return Math.min(99, 75 + (15 * (fee - b.p75)) / span);
  }
  if (fee >= b.p50) {
    const span = b.p75 - b.p50;
    if (span <= 0) return 50;
    return 50 + (25 * (fee - b.p50)) / span;
  }
  if (b.p50 <= 0) return 0;
  return Math.max(0, 50 * (fee / b.p50));
}

function pickWorkedExample(top10: CodeRow[]): CodeRow | null {
  const strict = top10.find(
    (r) => r.confidence === "high" && r.marketGap > 0 && r.annualFrequency >= 50
  );
  if (strict) return strict;
  const relaxed = top10.find(
    (r) => r.confidence === "high" && r.marketGap > 0 && r.annualFrequency >= 10
  );
  if (relaxed) return relaxed;
  return top10.find((r) => r.marketGap > 0) ?? null;
}

// Re-export the GeoLevel type for ergonomic imports downstream.
export type { GeoLevel };
