import { describe, expect, it } from "vitest";
import {
  computationToReportData,
  teaserFigure,
  toGatedReport,
} from "./gate";
import fs from "node:fs";
import path from "node:path";
import type {
  CodeRow,
  ComputationInput,
  ComputationOutput,
  UcrBenchmarkRow,
} from "@/lib/types/pipeline";
import {
  InMemoryBenchmarkSource,
  InMemoryGeoResolver,
  resolveBenchmarkWith,
} from "@/lib/benchmark/resolve";
import { STATE_TO_REGION } from "@/lib/seed/state-to-region";
import { ZIP_TO_METRO, ZIP_TO_STATE } from "@/lib/data/zip-fixtures";
import { compute } from "@/lib/computation/compute";

function codeRow(partial: Partial<CodeRow> & { code: string }): CodeRow {
  return {
    code: partial.code,
    description: partial.description ?? "Procedure",
    practiceFee: partial.practiceFee ?? 1000,
    p50: partial.p50 ?? 1200,
    p75: partial.p75 ?? 1300,
    p90: partial.p90 ?? 1400,
    geoLevelUsed: partial.geoLevelUsed ?? "zip3",
    confidence: partial.confidence ?? "high",
    marketGap: partial.marketGap ?? 200,
    percentileRank: partial.percentileRank ?? 30,
    annualFrequency: partial.annualFrequency ?? 100,
    annualRecoverableMarket: partial.annualRecoverableMarket ?? 20000,
    carrierFees: partial.carrierFees ?? {},
    carrierGaps: partial.carrierGaps ?? {},
    annualRecoverableByCarrier: partial.annualRecoverableByCarrier ?? {},
  };
}

const OUTPUT: ComputationOutput = {
  codeRows: [
    codeRow({
      code: "D2740",
      description: "Crown",
      practiceFee: 1180,
      p50: 1395,
      p75: 1525,
      marketGap: 215,
      annualFrequency: 165,
      annualRecoverableMarket: 35475,
      carrierFees: { Aetna: 1100 },
      annualRecoverableByCarrier: { Aetna: 30000 },
    }),
    codeRow({
      code: "D1110",
      description: "Prophy",
      practiceFee: 118,
      p50: 138,
      p75: 152,
      marketGap: 20,
      annualFrequency: 800,
      annualRecoverableMarket: 16000,
      carrierFees: { Cigna: 110 },
      annualRecoverableByCarrier: { Cigna: 12000 },
    }),
  ],
  executiveSummary: {
    totalAnnualUnderpayment: 52000,
    codesBelowP75InTop20: { count: 2, total: 2 },
    topCarrier: { name: "Aetna", recoverable: 30000 },
    underpaymentBasis: "carrier",
  },
  top10ByImpact: [],
  recoverableByCarrier: [
    { carrier: "Aetna", recoverable: 30000 },
    { carrier: "Cigna", recoverable: 12000 },
  ],
  workedExample: null,
  flags: [],
};

describe("computationToReportData", () => {
  it("maps the compute output into the flat ReportData shape", () => {
    const r = computationToReportData(OUTPUT, "02446");
    expect(r.zip).toBe("02446");
    // Headline is re-derived from the code rows: 35475 + 16000.
    expect(r.annualUnderpaymentUsd).toBe(51475);
    expect(r.worstCarrier.name).toBe("Aetna");
    expect(r.worstCarrier.annualGapUsd).toBe(30000);
    // Codes sorted by annual gap desc.
    expect(r.codes[0].code).toBe("D2740");
    expect(r.codes[0].annualGap).toBe(35475);
    expect(r.codes[0].ucrMedian).toBe(1395);
    // Carrier share derived from recoverable distribution.
    const aetna = r.carriers.find((c) => c.name === "Aetna")!;
    expect(aetna.share).toBeCloseTo(30000 / 42000, 5);
  });
});

describe("teaserFigure", () => {
  it("rounds the headline down to a clean figure", () => {
    expect(teaserFigure(52000)).toBe(50000);
    expect(teaserFigure(7300)).toBe(7000);
    expect(teaserFigure(0)).toBe(0);
  });
});

describe("toGatedReport — unlocked", () => {
  it("returns the full numbers", () => {
    const g = toGatedReport(OUTPUT, "02446", true);
    expect(g.unlocked).toBe(true);
    expect(g.annualUnderpaymentUsd).toBe(51475);
    expect(g.carrierUnderpaymentUsd).toBe(42000);
    expect(g.worstCarrier.name).toBe("Aetna");
    expect(g.codes[0].annualGap).toBe(35475);
  });
});

describe("toGatedReport — locked (the paywall boundary)", () => {
  const g = toGatedReport(OUTPUT, "02446", false);

  it("zeroes every gated dollar figure", () => {
    expect(g.unlocked).toBe(false);
    expect(g.annualUnderpaymentUsd).toBe(0);
    expect(g.carrierUnderpaymentUsd).toBe(0);
    expect(g.worstCarrier.annualGapUsd).toBe(0);
    expect(g.worstCarrier.gapPct).toBe(0);
    expect(g.worstCarrier.name).toBe(""); // which-carrier is itself paid insight
    for (const c of g.carriers) {
      expect(c.annualGapUsd).toBe(0);
      expect(c.gapPct).toBe(0);
      expect(c.share).toBe(0);
    }
    for (const c of g.codes) {
      expect(c.gapPerProc).toBe(0);
      expect(c.annualGap).toBe(0);
    }
  });

  it("keeps the non-gated teaser values", () => {
    expect(g.teaserUsd).toBe(50000);
    expect(g.codesBelowP75).toEqual({ count: 2, total: 2 });
    // Fee vs UCR median stays as the hook.
    const crown = g.codes.find((c) => c.code === "D2740")!;
    expect(crown.yourFee).toBe(1180);
    expect(crown.ucrMedian).toBe(1395);
  });

  it("never serializes a real gated number to the client payload", () => {
    const json = JSON.stringify(g);
    // The true headline, a real per-code annual gap, and a real carrier
    // recoverable must all be absent from what reaches the browser. (Carrier
    // names themselves aren't secret — the dentist entered them — but the
    // worst-carrier identity and all dollar figures are.)
    expect(json).not.toContain("51475");
    expect(json).not.toContain("35475");
    expect(json).not.toContain("30000");
    expect(g.worstCarrier.name).toBe("");
  });

  it("does not leak the ranking through ordering", () => {
    // Carriers sorted by name, codes by code — not by gold-value.
    expect(g.carriers.map((c) => c.name)).toEqual(["Aetna", "Cigna"].sort());
    expect(g.codes.map((c) => c.code)).toEqual(["D1110", "D2740"]);
  });
});

describe("toGatedReport: sample-practice fixture totals", () => {
  const dir = path.join(__dirname, "..", "..", "test-fixtures", "sample-practice");
  const load = <T,>(name: string): T =>
    JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));

  async function fixtureOutput() {
    const geo = new InMemoryGeoResolver(ZIP_TO_STATE, ZIP_TO_METRO, STATE_TO_REGION);
    const src = new InMemoryBenchmarkSource(load<UcrBenchmarkRow[]>("benchmarks.json"));
    return compute(load<ComputationInput>("input.json"), resolveBenchmarkWith(src, geo));
  }

  it("headline is the fee-schedule gap and reconciles with the code and category tables", async () => {
    const g = toGatedReport(await fixtureOutput(), "02446", true);
    expect(g.annualUnderpaymentUsd).toBe(67651);
    expect(g.codes.reduce((s, c) => s + c.annualGap, 0)).toBe(67651);
    expect(g.categories.reduce((s, c) => s + c.recoverable, 0)).toBe(67651);
    expect(g.teaserUsd).toBe(65000);
  });

  it("carrier figure is distinct from the headline and equals the scorecard sum", async () => {
    const g = toGatedReport(await fixtureOutput(), "02446", true);
    expect(Math.round(g.carrierUnderpaymentUsd)).toBe(93624);
    expect(g.carrierUnderpaymentUsd).not.toBe(g.annualUnderpaymentUsd);
    const scorecard = g.carrierGrid.carriers.reduce((s, c) => s + c.annualRecoverable, 0);
    // Scorecard values are rounded per carrier.
    expect(Math.abs(scorecard - g.carrierUnderpaymentUsd)).toBeLessThanOrEqual(3);
    expect(g.worstCarrier.name).toBe("Cigna");
    expect(Math.round(g.worstCarrier.annualGapUsd)).toBe(26857);
  });

  it("web percentile rank is compute's rank (same value the PDF prints)", async () => {
    const out = await fixtureOutput();
    const g = toGatedReport(out, "02446", true);
    const web = g.codes.find((c) => c.code === "D3330")!;
    const pdf = out.codeRows.find((r) => r.code === "D3330")!;
    expect(web.percentileRank).toBe(pdf.percentileRank);
    expect(Math.round(web.percentileRank!)).toBe(48);
  });

  it("locked payload carries no carrier total or percentile", async () => {
    const g = toGatedReport(await fixtureOutput(), "02446", false);
    expect(g.carrierUnderpaymentUsd).toBe(0);
    expect(g.codes.every((c) => c.percentileRank === null)).toBe(true);
  });
});
