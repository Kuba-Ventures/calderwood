import { describe, expect, it } from "vitest";
import { checkUploadCompleteness, providerLabelsFrom } from "./completeness";

const missing = (r: ReturnType<typeof checkUploadCompleteness>) =>
  r.items.filter((i) => !i.ok).map((i) => i.id);

describe("checkUploadCompleteness", () => {
  it("passes a full file with counts and every provider", () => {
    const r = checkUploadCompleteness({
      codeCount: 120,
      volumeCount: 118,
      providerLabels: ["DDS0", "DDS3", "HYG2"],
      providerCount: 3,
    });
    expect(r.hasGaps).toBe(false);
    expect(r.items.map((i) => i.id)).toEqual(["fees", "counts", "providers"]);
    expect(r.consequences).toEqual([]);
    expect(r.fix).toBeNull();
  });

  it("flags a fee-only file with no procedure counts", () => {
    const r = checkUploadCompleteness({ codeCount: 150, volumeCount: 0, providerLabels: [] });
    expect(missing(r)).toEqual(["counts"]);
    expect(r.items[1].value).toBe("Not in this file");
    expect(r.consequences[0]).toMatch(/estimates/);
    expect(r.fix).toMatch(/Quantity/);
  });

  it("flags counts on fewer than half the codes", () => {
    const r = checkUploadCompleteness({ codeCount: 100, volumeCount: 30, providerLabels: [] });
    expect(missing(r)).toEqual(["counts"]);
    expect(r.items[1].value).toBe("30 of 100 codes");
    expect(r.consequences[0]).toMatch(/^Part of/);
  });

  it("accepts counts on half or more of the codes", () => {
    const r = checkUploadCompleteness({ codeCount: 100, volumeCount: 50, providerLabels: [] });
    expect(r.hasGaps).toBe(false);
  });

  it("flags a multi-provider practice whose file shows one provider", () => {
    const r = checkUploadCompleteness({
      codeCount: 100,
      volumeCount: 100,
      providerLabels: ["DDS0", "DDS0"],
      providerCount: 3,
    });
    expect(missing(r)).toEqual(["providers"]);
    expect(r.items[2].value).toBe("Only one provider");
    expect(r.fix).toMatch(/all providers/);
  });

  it("flags a multi-provider practice whose file has no provider breakdown", () => {
    const r = checkUploadCompleteness({ codeCount: 100, volumeCount: 100, providerLabels: [], providerCount: 2 });
    expect(missing(r)).toEqual(["providers"]);
    expect(r.items[2].value).toBe("Not broken out");
  });

  it("leaves out the provider row for solo practices or unknown provider count", () => {
    for (const providerCount of [1, undefined]) {
      const r = checkUploadCompleteness({ codeCount: 100, volumeCount: 100, providerLabels: [], providerCount });
      expect(r.items.map((i) => i.id)).toEqual(["fees", "counts"]);
      expect(r.hasGaps).toBe(false);
    }
  });

  it("flags a suspiciously short file", () => {
    const r = checkUploadCompleteness({ codeCount: 4, volumeCount: 4, providerLabels: [] });
    expect(missing(r)).toEqual(["fees"]);
    expect(r.items[0].value).toBe("Only 4 codes");
  });

  it("orders consequences counts, providers, then short file", () => {
    const r = checkUploadCompleteness({ codeCount: 3, volumeCount: 0, providerLabels: [], providerCount: 4 });
    expect(missing(r)).toEqual(["fees", "counts", "providers"]);
    expect(r.consequences).toHaveLength(3);
    expect(r.consequences[0]).toMatch(/estimates/);
    expect(r.consequences[2]).toMatch(/100 or more/);
  });

  it("returns nothing when no codes were parsed (the parse error covers it)", () => {
    const r = checkUploadCompleteness({ codeCount: 0, volumeCount: 0, providerLabels: [], providerCount: 3 });
    expect(r.items).toEqual([]);
    expect(r.hasGaps).toBe(false);
  });
});

describe("providerLabelsFrom", () => {
  it("collects distinct labels across codes", () => {
    expect(
      providerLabelsFrom({ D0120: { DDS0: 60, DDS3: 55 }, D1110: { DDS0: 100, HYG2: 95 } }).sort()
    ).toEqual(["DDS0", "DDS3", "HYG2"]);
  });
});
