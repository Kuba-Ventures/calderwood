import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { parseCsv, scoreCsvConfidence } from "./csv";
import { parseUpload } from "./dispatch";
import { parseFee, validateEntries } from "./validate";

const FIXTURE_DIR = path.join(__dirname, "..", "..", "test-fixtures", "parser-cases");
function loadFixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURE_DIR, name), "utf8");
}

describe("parseFee", () => {
  it("parses plain numbers", () => {
    expect(parseFee("55")).toBe(55);
    expect(parseFee("1234.56")).toBe(1234.56);
  });
  it("strips currency and commas", () => {
    expect(parseFee("$1,234.56")).toBe(1234.56);
    expect(parseFee("$ 55")).toBe(55);
  });
  it("returns NaN for non-numeric", () => {
    expect(parseFee("abc")).toBeNaN();
    expect(parseFee("")).toBeNaN();
  });
});

describe("validateEntries", () => {
  it("rejects invalid CDT codes silently is forbidden -- reason must be set", () => {
    const result = validateEntries([
      { code: "D2740", fee: 185 },
      { code: "D2740X", fee: 185 },
      { code: "12345", fee: 100 },
    ]);
    expect(result.valid).toHaveLength(1);
    expect(result.rejected).toHaveLength(2);
    expect(result.rejected[0].reason).toContain("Invalid CDT format");
  });

  it("rejects fees outside the [10, 5000] bound", () => {
    const result = validateEntries([
      { code: "D2740", fee: 185 },
      { code: "D2750", fee: 9999 },
      { code: "D0120", fee: 2 },
    ]);
    expect(result.valid).toHaveLength(1);
    expect(result.rejected).toHaveLength(2);
  });

  it("keeps the first occurrence of a duplicate code", () => {
    const result = validateEntries([
      { code: "D2740", fee: 185 },
      { code: "D2740", fee: 200 },
    ]);
    expect(result.valid).toHaveLength(1);
    expect(result.valid[0].fee).toBe(185);
    expect(result.rejected).toHaveLength(1);
  });
});

describe("parseCsv", () => {
  it("clean.csv -> high confidence", () => {
    const r = parseCsv(loadFixture("clean.csv"));
    expect(r.valid).toHaveLength(12);
    expect(r.rejected).toHaveLength(0);
    expect(r.matchedColumns).not.toBeNull();
    expect(scoreCsvConfidence(r)).toBe("high");
  });

  it("reordered.csv -> high confidence (header names still recognized)", () => {
    const r = parseCsv(loadFixture("reordered.csv"));
    expect(r.valid).toHaveLength(10);
    expect(r.matchedColumns?.code).toBe("Procedure Code");
    expect(r.matchedColumns?.fee).toBe("Office Fee");
    expect(scoreCsvConfidence(r)).toBe("high");
  });

  it("messy-no-headers.csv -> falls back to first-row detection", () => {
    const r = parseCsv(loadFixture("messy-no-headers.csv"));
    expect(r.valid.length).toBeGreaterThan(0);
    expect(r.matchedColumns?.code).toMatch(/^column /);
  });

  it("partial-junk.csv -> low confidence with rejects flagged", () => {
    const r = parseCsv(loadFixture("partial-junk.csv"));
    expect(r.valid.length).toBeGreaterThan(8);
    expect(r.rejected.length).toBeGreaterThan(0);
    // D2740X is custom; must be rejected, not silently mapped to D2740
    expect(r.rejected.some((x) => JSON.stringify(x.raw).includes("D2740X"))).toBe(true);
    // D2750 with $99999 must be rejected (out of bounds)
    expect(r.rejected.some((x) => x.reason.includes("D2750"))).toBe(true);
  });

  it("empty.csv -> failed", () => {
    const r = parseCsv(loadFixture("empty.csv"));
    expect(r.valid).toHaveLength(0);
    expect(scoreCsvConfidence(r)).toBe("failed");
  });

  it("junk.txt -> failed", () => {
    const r = parseCsv(loadFixture("junk.txt"));
    expect(r.valid).toHaveLength(0);
    expect(scoreCsvConfidence(r)).toBe("failed");
  });
});

describe("parseUpload dispatcher", () => {
  it("dispatches CSV", async () => {
    const r = await parseUpload({ kind: "csv", text: loadFixture("clean.csv") });
    expect(r.confidence).toBe("high");
    expect(r.entries).toHaveLength(12);
  });

  it("dispatches paste with high confidence on clean rows", async () => {
    const r = await parseUpload({
      kind: "paste",
      rows: [
        { code: "D2740", fee: 185 },
        { code: "D0120", fee: 55 },
      ],
    });
    expect(r.confidence).toBe("high");
    expect(r.entries).toHaveLength(2);
  });

  it("dispatches PDF and stubs failed when no API key configured", async () => {
    const r = await parseUpload(
      { kind: "pdf", bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]), scheduleType: "master" },
      { anthropicApiKey: undefined }
    );
    expect(r.confidence).toBe("failed");
    expect(r.notes.some((n) => n.includes("ANTHROPIC_API_KEY"))).toBe(true);
  });
});
