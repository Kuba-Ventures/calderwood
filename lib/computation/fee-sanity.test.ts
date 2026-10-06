import { describe, expect, it } from "vitest";
import type { CodeRow } from "@/lib/types/pipeline";
import { assessFeeSanity } from "./fee-sanity";

function row(code: string, fee: number, p50: number | null, freq: number): CodeRow {
  const p75 = p50 === null ? null : p50 * 1.12;
  const gap = p75 === null ? 0 : Math.max(0, p75 - fee);
  return {
    code,
    description: code,
    practiceFee: fee,
    p50,
    p75,
    p90: null,
    geoLevelUsed: null,
    confidence: "high" as CodeRow["confidence"],
    marketGap: gap,
    percentileRank: null,
    annualFrequency: freq,
    annualRecoverableMarket: gap * freq,
    carrierFees: {},
    carrierGaps: {},
    annualRecoverableByCarrier: {},
  };
}

const codes = ["D0120", "D0140", "D0220", "D1110", "D2330", "D2740"];

describe("assessFeeSanity", () => {
  it("passes fees near the local median", () => {
    const rows = codes.map((c, i) => row(c, 100 + i * 10, 105 + i * 10, 50));
    const s = assessFeeSanity(rows);
    expect(s.suspect).toBe(false);
    expect(s.feeToMedian).toBeGreaterThan(0.9);
  });

  it("flags blended averages at about half the median (Procedure Summary)", () => {
    const rows = codes.map((c) => row(c, 50, 100, 50));
    const s = assessFeeSanity(rows);
    expect(s.suspect).toBe(true);
    expect(s.feeToMedian).toBeCloseTo(0.5);
    expect(s.recoverableShare).toBeGreaterThan(1);
  });

  it("does not judge with too few benchmarked codes", () => {
    const rows = [row("D2740", 50, 100, 10), row("D9999", 50, null, 10)];
    const s = assessFeeSanity(rows);
    expect(s.suspect).toBe(false);
    expect(s.feeToMedian).toBeNull();
  });

  it("allows a practice moderately below market", () => {
    const rows = codes.map((c) => row(c, 85, 100, 50));
    expect(assessFeeSanity(rows).suspect).toBe(false);
  });
});
