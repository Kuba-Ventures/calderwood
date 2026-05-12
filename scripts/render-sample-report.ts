#!/usr/bin/env tsx
//
// Render the sample-practice fixture to a PDF on disk for visual review.
// Output: test-fixtures/sample-practice/sample-report.pdf
//
// Usage: npm run render:sample-report

import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { ReportDoc } from "../components/report/report-doc";
import type { ComputationOutput } from "../lib/types/pipeline";

async function main() {
  const fixtureDir = path.join(__dirname, "..", "test-fixtures", "sample-practice");
  const data: ComputationOutput = JSON.parse(
    fs.readFileSync(path.join(fixtureDir, "expected-output.json"), "utf8")
  );

  const buffer = await renderToBuffer(
    React.createElement(ReportDoc, {
      data,
      meta: {
        practiceName: "Underwood Family Dental",
        zip5: "02446",
        providerCount: "2-5",
        generatedAt: new Date(),
      },
    })
  );

  const outPath = path.join(fixtureDir, "sample-report.pdf");
  fs.writeFileSync(outPath, buffer);
  console.log(`Wrote ${outPath} (${Math.round(buffer.length / 1024)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
