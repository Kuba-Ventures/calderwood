import { describe, expect, it } from "vitest";
import { isTypedFeeValid, resolveFeeGaps, type FeeGapInput } from "./fee-gaps";
import { emptyEdits, type MergeSource } from "./merge-uploads";

const report: MergeSource = {
  id: "report",
  name: "ProcedureSummary.pdf",
  kind: "pdf",
  rows: [
    { code: "D0120", fee: 41.6 },
    { code: "D1110", fee: 71.2 },
    { code: "D4910", fee: 88.4 },
  ],
  volumes: { D0120: 412, D1110: 1050, D4910: 96 },
  providerFees: {},
};

const schedule: MergeSource = {
  id: "sched",
  name: "OfficeFees.csv",
  kind: "csv",
  rows: [
    { code: "D0120", fee: 65 },
    { code: "D1110", fee: 118 },
  ],
  volumes: {},
  providerFees: {},
};

function input(p: Partial<FeeGapInput>): FeeGapInput {
  return { files: [], typing: false, typedFees: {}, leftOut: [], edits: emptyEdits(), ...p };
}

describe("resolveFeeGaps: report only", () => {
  it("asks for the fee schedule and opens no gaps", () => {
    const s = resolveFeeGaps(input({ files: [report] }));
    expect(s.needsSchedule).toBe(true);
    expect(s.gaps).toEqual([]);
  });

  it("typing lists every report code, most-done first, and prices nothing from averages", () => {
    const s = resolveFeeGaps(input({ files: [report], typing: true }));
    expect(s.needsSchedule).toBe(false);
    expect(s.gaps.map((g) => g.code)).toEqual(["D1110", "D0120", "D4910"]);
    expect(s.rows).toEqual([]);
    expect(s.unresolved).toEqual(["D1110", "D0120", "D4910"]);
  });

  it("a typed fee keeps the report's count; left-out codes resolve", () => {
    const s = resolveFeeGaps(
      input({ files: [report], typing: true, typedFees: { D1110: "118" }, leftOut: ["D0120", "D4910"] })
    );
    expect(s.rows).toEqual([{ code: "D1110", fee: "118" }]);
    expect(s.frequencies).toEqual({ D1110: 1050 });
    expect(s.unresolved).toEqual([]);
  });

  it("ignores a typed fee outside the allowed range", () => {
    const s = resolveFeeGaps(input({ files: [report], typing: true, typedFees: { D1110: "5" } }));
    expect(s.rows).toEqual([]);
    expect(s.unresolved).toContain("D1110");
  });
});

describe("resolveFeeGaps: report + schedule", () => {
  it("lists only the codes the schedule does not price", () => {
    const s = resolveFeeGaps(input({ files: [report, schedule] }));
    expect(s.needsSchedule).toBe(false);
    expect(s.gaps).toEqual([{ code: "D4910", count: 96 }]);
    expect(s.unresolved).toEqual(["D4910"]);
    expect(s.rows.map((r) => r.code)).toEqual(["D0120", "D1110"]);
  });

  it("a typed fee prices the code with its report count", () => {
    const s = resolveFeeGaps(input({ files: [report, schedule], typedFees: { D4910: "$165" } }));
    expect(s.rows).toContainEqual({ code: "D4910", fee: "$165" });
    expect(s.frequencies.D4910).toBe(96);
    expect(s.unresolved).toEqual([]);
  });

  it("a code added in the review table counts as resolved", () => {
    const edits = { ...emptyEdits(), added: [{ code: "D4910", fee: "165" }] };
    const s = resolveFeeGaps(input({ files: [report, schedule], edits }));
    expect(s.unresolved).toEqual([]);
  });

  it("schedule only: no gaps", () => {
    const s = resolveFeeGaps(input({ files: [schedule] }));
    expect(s.gaps).toEqual([]);
    expect(s.unresolved).toEqual([]);
  });
});

describe("isTypedFeeValid", () => {
  it("accepts dollars and commas within range", () => {
    expect(isTypedFeeValid("$1,250")).toBe(true);
    expect(isTypedFeeValid("9")).toBe(false);
    expect(isTypedFeeValid("")).toBe(false);
    expect(isTypedFeeValid(undefined)).toBe(false);
  });
});
