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
import { compute, summarizeTotals } from "@/lib/computation/compute";
import { computationToReportData } from "./gate";
import { appendixAnnual, top10Rows } from "./pdf-columns";
import type { ComputationInput, UcrBenchmarkRow } from "@/lib/types/pipeline";

const FIXTURE_DIR = path.join(__dirname, "..", "..", "test-fixtures", "sample-practice");

function loadFixture<T>(name: string): T {
  return JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, name), "utf8"));
}

async function run() {
  const input = loadFixture<ComputationInput>("input.json");
  const benchmarks = loadFixture<UcrBenchmarkRow[]>("benchmarks.json");
  const geo = new InMemoryGeoResolver(ZIP_TO_STATE, ZIP_TO_METRO, STATE_TO_REGION);
  const resolve = resolveBenchmarkWith(new InMemoryBenchmarkSource(benchmarks), geo);
  return compute(input, resolve);
}

describe("PDF dollar columns reconcile with the report totals (fixture)", () => {
  it("Top 10 Annual values equal the web code-table values for the same codes", async () => {
    const out = await run();
    const table = computationToReportData(out, "02446").codes;
    const byCode = new Map(table.map((c) => [c.code, c]));
    const rows = top10Rows(out);
    expect(rows).toHaveLength(10);
    for (const r of rows) {
      const web = byCode.get(r.row.code)!;
      expect(r.annual).toBe(web.annualGap);
      expect(r.gap).toBe(web.gapPerProc);
    }
  });

  it("Top 10 is the ten largest code-table rows, so it is a subset of the headline", async () => {
    const out = await run();
    const table = computationToReportData(out, "02446").codes;
    const expected = table.filter((c) => c.annualGap > 0).slice(0, 10).map((c) => c.annualGap);
    expect(top10Rows(out).map((r) => r.annual)).toEqual(expected);
    const sum = top10Rows(out).reduce((s, r) => s + r.annual, 0);
    expect(sum).toBeLessThanOrEqual(out.executiveSummary.totalAnnualUnderpayment);
  });

  it("D3330 Top 10 Annual is its fee-schedule gap ($3,596), not the worst carrier x full volume ($13,206)", async () => {
    const out = await run();
    const d3330 = top10Rows(out).find((r) => r.row.code === "D3330")!;
    expect(d3330.annual).toBe(3596);
    expect(d3330.annual).not.toBe(13206);
  });

  it("appendix Annual column sums to the $67,651 headline", async () => {
    const out = await run();
    const sum = out.codeRows.reduce((s, r) => s + appendixAnnual(r), 0);
    expect(sum).toBe(out.executiveSummary.totalAnnualUnderpayment);
    expect(sum).toBe(67651);
    expect(sum).toBe(summarizeTotals(out.codeRows).feeScheduleGap);
  });
});
