import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  InMemoryBenchmarkSource,
  InMemoryGeoResolver,
  resolveBenchmarkWith,
} from "@/lib/benchmark/resolve";
import { STATE_TO_REGION } from "@/lib/seed/state-to-region";
import { ZIP_TO_METRO, ZIP_TO_STATE } from "@/lib/data/zip-fixtures";
import { compute } from "./compute";
import type {
  ComputationInput,
  UcrBenchmarkRow,
} from "@/lib/types/pipeline";

const FIXTURE_DIR = path.join(__dirname, "..", "..", "test-fixtures", "sample-practice");

function loadFixture<T>(name: string): T {
  return JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, name), "utf8"));
}

function buildResolver(rows: UcrBenchmarkRow[]) {
  const geo = new InMemoryGeoResolver(ZIP_TO_STATE, ZIP_TO_METRO, STATE_TO_REGION);
  const src = new InMemoryBenchmarkSource(rows);
  return resolveBenchmarkWith(src, geo);
}

describe("compute -- Underwood Family Dental fixture", () => {
  const input = loadFixture<ComputationInput>("input.json");
  const benchmarks = loadFixture<UcrBenchmarkRow[]>("benchmarks.json");
  const resolve = buildResolver(benchmarks);

  it("produces 20 code rows", async () => {
    const out = await compute(input, resolve);
    expect(out.codeRows).toHaveLength(20);
  });

  it("sets underpayment basis to carrier when carrier schedules are present", async () => {
    const out = await compute(input, resolve);
    expect(out.executiveSummary.underpaymentBasis).toBe("carrier");
  });

  it("flags two codes as medium confidence (state-level)", async () => {
    const out = await compute(input, resolve);
    const medium = out.codeRows
      .filter((r) => r.confidence === "medium")
      .map((r) => r.code)
      .sort();
    expect(medium).toEqual(["D3330", "D4910"]);
  });

  it("flags no codes as no_data (every code has a benchmark)", async () => {
    const out = await compute(input, resolve);
    expect(out.codeRows.filter((r) => r.confidence === "no_data")).toHaveLength(0);
  });

  it("D2740 worked example: Cigna gap $58, frequency 142, recoverable $8,236", async () => {
    const out = await compute(input, resolve);
    const d2740 = out.codeRows.find((r) => r.code === "D2740")!;
    expect(d2740.carrierGaps.Cigna).toBe(58);
    expect(d2740.annualFrequency).toBe(142);
    expect(d2740.annualRecoverableByCarrier.Cigna).toBe(8236);
  });

  it("includes D2740 in top10ByImpact", async () => {
    const out = await compute(input, resolve);
    const codes = out.top10ByImpact.map((r) => r.code);
    expect(codes).toContain("D2740");
  });

  it("worked example is a high-confidence row with positive market gap", async () => {
    const out = await compute(input, resolve);
    expect(out.workedExample).not.toBeNull();
    expect(out.workedExample!.confidence).toBe("high");
    expect(out.workedExample!.marketGap).toBeGreaterThan(0);
  });

  it("topCarrier is non-null when basis is carrier", async () => {
    const out = await compute(input, resolve);
    expect(out.executiveSummary.topCarrier).not.toBeNull();
  });

  it("Cigna is the worst-paying carrier (largest annual gap)", async () => {
    const out = await compute(input, resolve);
    expect(out.executiveSummary.topCarrier?.name).toBe("Cigna");
  });

  it("recoverableByCarrier puts Cigna first (worst) and MetLife last (best)", async () => {
    // Note: the brief's narrative claims Delta is smallest-gap, but the
    // brief's own fee data has MetLife paying highest across every code
    // (e.g. D2740: MetLife 195, Delta 192). So MetLife is last per the data.
    const out = await compute(input, resolve);
    const order = out.recoverableByCarrier.map((c) => c.carrier);
    expect(order[0]).toBe("Cigna");
    expect(order[order.length - 1]).toBe("MetLife");
  });

  it("totalAnnualUnderpayment is the fee-schedule gap (sum of per-code market recoverable)", async () => {
    const out = await compute(input, resolve);
    const manual = out.codeRows.reduce((s, r) => s + r.annualRecoverableMarket, 0);
    expect(out.executiveSummary.totalAnnualUnderpayment).toBe(manual);
    expect(out.executiveSummary.totalAnnualUnderpayment).toBe(67651);
  });

  it("carrierAnnualUnderpayment splits each code's volume evenly across its carriers", async () => {
    const out = await compute(input, resolve);
    let manual = 0;
    for (const row of out.codeRows) {
      const gaps = Object.values(row.carrierGaps);
      if (gaps.length === 0) continue;
      manual += (gaps.reduce((a, b) => a + b, 0) / gaps.length) * row.annualFrequency;
    }
    expect(out.executiveSummary.carrierAnnualUnderpayment).toBeCloseTo(manual, 6);
    expect(Math.round(out.executiveSummary.carrierAnnualUnderpayment!)).toBe(93624);
    // Not the old 5x-counted figure (every carrier billed for all the volume).
    expect(out.executiveSummary.carrierAnnualUnderpayment).toBeLessThan(468121 / 4);
  });

  it("per-carrier recoverable sums to the carrier total", async () => {
    const out = await compute(input, resolve);
    const sum = out.recoverableByCarrier.reduce((s, c) => s + c.recoverable, 0);
    expect(sum).toBeCloseTo(out.executiveSummary.carrierAnnualUnderpayment!, 6);
    expect(Math.round(out.executiveSummary.topCarrier!.recoverable)).toBe(26857);
  });

  it("D3330 percentile rank is 48 (fee $945 vs p50 $980)", async () => {
    const out = await compute(input, resolve);
    const d3330 = out.codeRows.find((r) => r.code === "D3330")!;
    expect(Math.round(d3330.percentileRank!)).toBe(48);
  });

  it("codesBelowP75InTop20 counts top-20 codes by volume where practice fee < p75", async () => {
    const out = await compute(input, resolve);
    expect(out.executiveSummary.codesBelowP75InTop20.total).toBeLessThanOrEqual(20);
    expect(out.executiveSummary.codesBelowP75InTop20.count).toBeLessThanOrEqual(
      out.executiveSummary.codesBelowP75InTop20.total
    );
  });

  it("market basis when carrier schedules are empty", async () => {
    const noCarriers: ComputationInput = {
      ...input,
      carrierSchedules: {},
    };
    const out = await compute(noCarriers, resolve);
    expect(out.executiveSummary.underpaymentBasis).toBe("market");
    expect(out.executiveSummary.topCarrier).toBeNull();
    expect(out.recoverableByCarrier).toEqual([]);
  });

  it("missing frequency flags the code and sets recoverable to 0", async () => {
    const noFreq: ComputationInput = {
      ...input,
      frequencies: { ...input.frequencies, D2740: 0 },
    };
    const out = await compute(noFreq, resolve);
    const d2740 = out.codeRows.find((r) => r.code === "D2740")!;
    expect(d2740.annualFrequency).toBe(0);
    expect(d2740.annualRecoverableMarket).toBe(0);
    expect(out.flags.some((f) => f.includes("D2740"))).toBe(true);
  });

  it("clamps market gap at zero when practice fee >= p75", async () => {
    const allAboveP75: ComputationInput = {
      ...input,
      masterSchedule: input.masterSchedule.map((e) => ({ ...e, fee: e.fee * 10 })),
      carrierSchedules: {},
    };
    const out = await compute(allAboveP75, resolve);
    expect(out.executiveSummary.totalAnnualUnderpayment).toBe(0);
    expect(out.codeRows.every((r) => r.marketGap === 0)).toBe(true);
  });

  it("snapshot: total under brief's spec produces stable headline numbers", async () => {
    const out = await compute(input, resolve);
    // Capture the actual numbers the engine produces for visibility.
    // total = fee-schedule gap to p75; carrier = contracted-rate gap to p75
    // with each code's volume split evenly across its carriers.
    expect({
      total: out.executiveSummary.totalAnnualUnderpayment,
      carrier: Math.round(out.executiveSummary.carrierAnnualUnderpayment!),
      cigna: Math.round(
        out.recoverableByCarrier.find((c) => c.carrier === "Cigna")?.recoverable ?? 0
      ),
      below_p75: out.executiveSummary.codesBelowP75InTop20,
    }).toMatchSnapshot();
  });
});
