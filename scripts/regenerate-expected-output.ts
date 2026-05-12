#!/usr/bin/env tsx
//
// Regenerate test-fixtures/sample-practice/expected-output.json by running
// the computation engine against the seeded input + benchmarks. Run after
// any spec change so the fixture stays in sync.

import fs from "node:fs";
import path from "node:path";
import {
  InMemoryBenchmarkSource,
  InMemoryGeoResolver,
  resolveBenchmarkWith,
} from "../lib/benchmark/resolve";
import { STATE_TO_REGION } from "../lib/seed/state-to-region";
import { ZIP_TO_METRO, ZIP_TO_STATE } from "../lib/data/zip-fixtures";
import { compute } from "../lib/computation/compute";
import type {
  ComputationInput,
  UcrBenchmarkRow,
} from "../lib/types/pipeline";

const FIXTURE_DIR = path.join(__dirname, "..", "test-fixtures", "sample-practice");

async function main() {
  const input: ComputationInput = JSON.parse(
    fs.readFileSync(path.join(FIXTURE_DIR, "input.json"), "utf8")
  );
  const benchmarks: UcrBenchmarkRow[] = JSON.parse(
    fs.readFileSync(path.join(FIXTURE_DIR, "benchmarks.json"), "utf8")
  );

  const geo = new InMemoryGeoResolver(ZIP_TO_STATE, ZIP_TO_METRO, STATE_TO_REGION);
  const src = new InMemoryBenchmarkSource(benchmarks);
  const resolve = resolveBenchmarkWith(src, geo);

  const out = await compute(input, resolve);
  const outPath = path.join(FIXTURE_DIR, "expected-output.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
  console.log(`Wrote ${outPath}`);
  console.log(`  total: $${out.executiveSummary.totalAnnualUnderpayment.toLocaleString()}`);
  console.log(`  topCarrier: ${out.executiveSummary.topCarrier?.name} ($${out.executiveSummary.topCarrier?.recoverable.toLocaleString()})`);
  console.log(`  belowP75: ${out.executiveSummary.codesBelowP75InTop20.count} of ${out.executiveSummary.codesBelowP75InTop20.total}`);
  console.log(`  workedExample: ${out.workedExample?.code}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
