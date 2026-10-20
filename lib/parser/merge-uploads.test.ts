import { describe, expect, it } from "vitest";
import { applyEdits, emptyEdits, mergeUploads, type MergeSource } from "./merge-uploads";

function src(p: Partial<MergeSource> & Pick<MergeSource, "id" | "kind">): MergeSource {
  return { name: `${p.id}.${p.kind}`, rows: [], volumes: {}, providerFees: {}, ...p };
}

describe("mergeUploads", () => {
  it("adds counts together across per-provider reports", () => {
    const r = mergeUploads([
      src({ id: "a", kind: "pdf", rows: [{ code: "D0120", fee: 60 }], volumes: { D0120: 300 } }),
      src({ id: "b", kind: "pdf", rows: [{ code: "D0120", fee: 58 }], volumes: { D0120: 250 } }),
    ]);
    expect(r.frequencies).toEqual({ D0120: 550 });
    expect(r.rows).toEqual([{ code: "D0120", fee: "60" }]);
  });

  it("takes the fee from the first file that lists the code", () => {
    const r = mergeUploads([
      src({ id: "a", kind: "csv", rows: [{ code: "D0120", fee: 65 }] }),
      src({ id: "b", kind: "csv", rows: [{ code: "D0120", fee: 70 }, { code: "D1110", fee: 118 }] }),
    ]);
    expect(r.rows).toEqual([
      { code: "D0120", fee: "65" },
      { code: "D1110", fee: "118" },
    ]);
  });

  it("prefers a fee schedule's fee over a production report's average, even if uploaded later", () => {
    const r = mergeUploads([
      src({ id: "report", kind: "pdf", rows: [{ code: "D2740", fee: 864.43 }], volumes: { D2740: 200 } }),
      src({ id: "sched", kind: "xlsx", rows: [{ code: "D2740", fee: 1250 }] }),
    ]);
    expect(r.rows).toEqual([{ code: "D2740", fee: "1250" }]);
    expect(r.frequencies).toEqual({ D2740: 200 });
    expect(r.feesFromReportsOnly).toBe(false);
  });

  it("treats an office fee schedule PDF as a schedule, not a report", () => {
    const r = mergeUploads([
      src({ id: "report", kind: "pdf", rows: [{ code: "D2740", fee: 864 }], volumes: { D2740: 200 } }),
      src({ id: "sched", kind: "pdf", officeSchedule: true, rows: [{ code: "D2740", fee: 1454 }] }),
    ]);
    expect(r.rows).toEqual([{ code: "D2740", fee: "1454" }]);
    expect(r.feesFromReportsOnly).toBe(false);
  });

  it("flags when every fee came from production reports", () => {
    const r = mergeUploads([src({ id: "a", kind: "pdf", rows: [{ code: "D0120", fee: 50 }] })]);
    expect(r.feesFromReportsOnly).toBe(true);
    expect(r.unpricedCodes).toEqual([]);
  });

  it("never prices a code from a report's average once a schedule is present", () => {
    const r = mergeUploads([
      src({ id: "report", kind: "pdf", rows: [{ code: "D2740", fee: 864 }, { code: "D4910", fee: 88 }], volumes: { D2740: 200, D4910: 96 } }),
      src({ id: "sched", kind: "csv", rows: [{ code: "D2740", fee: 1250 }] }),
    ]);
    expect(r.rows).toEqual([{ code: "D2740", fee: "1250" }]);
    expect(r.frequencies).toEqual({ D2740: 200 });
    expect(r.unpricedCodes).toEqual(["D4910"]);
  });

  it("leaves an identical file out and flags it, whatever its name or row order", () => {
    const rows = [{ code: "D0120", fee: 65 }, { code: "D1110", fee: "118" }];
    const r = mergeUploads([
      src({ id: "a", kind: "csv", name: "fees.csv", rows, volumes: { D0120: 10 } }),
      src({ id: "b", kind: "csv", name: "fees (1).csv", rows: [...rows].reverse(), volumes: { D0120: 10 } }),
    ]);
    expect(r.duplicateOf).toEqual({ b: "a" });
    expect(r.frequencies).toEqual({ D0120: 10 });
  });

  it("does not treat files with the same codes but different counts as duplicates", () => {
    const rows = [{ code: "D0120", fee: 65 }];
    const r = mergeUploads([
      src({ id: "a", kind: "pdf", rows, volumes: { D0120: 10 } }),
      src({ id: "b", kind: "pdf", rows, volumes: { D0120: 12 } }),
    ]);
    expect(r.duplicateOf).toEqual({});
    expect(r.frequencies).toEqual({ D0120: 22 });
  });

  it("merges provider fees by label, first file wins a clash", () => {
    const r = mergeUploads([
      src({ id: "a", kind: "pdf", rows: [{ code: "D0120", fee: 60 }], providerFees: { D0120: { DDS0: 61, HYG2: 55 } } }),
      src({ id: "b", kind: "pdf", rows: [{ code: "D0120", fee: 62 }], providerFees: { D0120: { DDS3: 59, HYG2: 99 } } }),
    ]);
    expect(r.providerFees).toEqual({ D0120: { DDS0: 61, HYG2: 55, DDS3: 59 } });
  });

  it("returns an empty result for no files", () => {
    const r = mergeUploads([]);
    expect(r.rows).toEqual([]);
    expect(r.feesFromReportsOnly).toBe(false);
  });
});

describe("applyEdits", () => {
  const merged = {
    rows: [
      { code: "D0120", fee: "65" },
      { code: "D1110", fee: "118" },
    ],
    frequencies: { D0120: 400, D1110: 300 },
  };

  it("returns the merge unchanged with no edits", () => {
    expect(applyEdits(merged, emptyEdits())).toEqual(merged);
  });

  it("applies fee and count edits, removals, and added codes", () => {
    const out = applyEdits(merged, {
      fees: { D0120: "70" },
      volumes: { D1110: null, D2740: 5 },
      removed: ["D1110"],
      added: [{ code: "D2740", fee: "1250" }],
    });
    expect(out.rows).toEqual([
      { code: "D0120", fee: "70" },
      { code: "D2740", fee: "1250" },
    ]);
    expect(out.frequencies).toEqual({ D0120: 400, D2740: 5 });
  });

  it("keeps edits for a code even after the files change", () => {
    const fewer = { rows: [{ code: "D0120", fee: "65" }], frequencies: {} };
    const out = applyEdits(fewer, { ...emptyEdits(), volumes: { D0120: 12 } });
    expect(out.frequencies).toEqual({ D0120: 12 });
  });
});
