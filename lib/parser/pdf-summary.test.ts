// Open Dental "Procedure Summary" run over all billing types: the report's
// "Average $" blends full office fees with PPO contracted fees. Quantities must
// come from the summary and fees from the office fee schedule (issue #80).

import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

vi.mock("server-only", () => ({}));

const FIXTURES = path.resolve(__dirname, "../../test-fixtures/parser-cases");
const summaryJson = fs.readFileSync(path.join(FIXTURES, "open-dental-summary-mixed.json"), "utf8");
const scheduleCsv = fs.readFileSync(path.join(FIXTURES, "open-dental-office-schedule.csv"), "utf8");

// Stand in for the model: return the fixture as the extraction output.
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = {
      stream: () => ({
        finalMessage: async () => ({ content: [{ type: "text", text: summaryJson }] }),
      }),
    };
  },
}));

import { parsePdfSummary } from "./pdf-summary";
import { parseCsv } from "./csv";
import { mergeUploads, type MergeSource } from "./merge-uploads";

/** The MergeSource fee-step builds from a /api/parse-pdf report response. */
async function summarySource(): Promise<MergeSource> {
  const r = await parsePdfSummary({ pdfBase64: "", apiKey: "test" });
  const volumes: Record<string, number> = {};
  const providerFees: Record<string, Record<string, number>> = {};
  for (const e of r.entries) {
    if (e.annualVolume > 0) volumes[e.code] = e.annualVolume;
    if (e.providerFees) providerFees[e.code] = e.providerFees;
  }
  return {
    id: "summary",
    name: "ProcedureSummary.pdf",
    kind: "pdf",
    rows: r.entries.map((e) => ({ code: e.code, fee: e.fee })),
    volumes,
    providerFees,
  };
}

function scheduleSource(): MergeSource {
  const r = parseCsv(scheduleCsv);
  return { id: "schedule", name: "fees.csv", kind: "csv", rows: r.valid, volumes: r.volumes, providerFees: {} };
}

describe("Open Dental Procedure Summary with mixed billing types", () => {
  it("takes fees from the office schedule and quantities from the summary", async () => {
    const office = Object.fromEntries(parseCsv(scheduleCsv).valid.map((e) => [e.code, String(e.fee)]));
    const merged = mergeUploads([await summarySource(), scheduleSource()]);

    expect(Object.fromEntries(merged.rows.map((r) => [r.code, r.fee]))).toEqual(office);
    expect(merged.frequencies).toEqual({
      D0120: 412,
      D0274: 288,
      D1110: 1050,
      D2392: 164,
      D2740: 200,
      D7140: 73,
    });
    expect(merged.feesFromReportsOnly).toBe(false);
  });

  it("leaves a code the schedule does not price unpriced instead of using its Average $", async () => {
    const merged = mergeUploads([await summarySource(), scheduleSource()]);
    expect(merged.rows.find((r) => r.code === "D4910")).toBeUndefined();
    expect(merged.frequencies.D4910).toBeUndefined();
    expect(merged.unpricedCodes).toEqual(["D4910"]);
  });

  it("does not depend on upload order", async () => {
    const a = mergeUploads([await summarySource(), scheduleSource()]);
    const b = mergeUploads([scheduleSource(), await summarySource()]);
    expect(b.rows).toEqual(a.rows);
    expect(b.frequencies).toEqual(a.frequencies);
  });
});
