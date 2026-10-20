import { describe, expect, it } from "vitest";
import { filesAsPdf, filesFeeSchema, inputMethodFor } from "./files-payload";

const base = {
  method: "files" as const,
  rows: [{ code: "D0120", fee: "65" }],
  frequencies: { D0120: 550 },
  providerFees: {},
  kinds: ["csv", "pdf", "pdf"] as const,
  pdfPaths: ["pdf/a.pdf", "pdf/b.pdf"],
  filenames: ["fees.csv", "dr-patel.pdf", "dr-wu.pdf"],
};

describe("files payload", () => {
  it("validates a combined upload", () => {
    expect(filesFeeSchema.safeParse({ ...base, kinds: [...base.kinds] }).success).toBe(true);
  });

  it("rejects more than 10 files and unknown kinds", () => {
    expect(filesFeeSchema.safeParse({ ...base, kinds: Array(11).fill("csv") }).success).toBe(false);
    expect(filesFeeSchema.safeParse({ ...base, kinds: ["png"] }).success).toBe(false);
  });

  it("records the input method the database allows", () => {
    expect(inputMethodFor(["csv", "pdf"])).toBe("pdf");
    expect(inputMethodFor(["csv", "xlsx"])).toBe("xlsx");
    expect(inputMethodFor(["csv", "csv"])).toBe("csv");
  });

  it("stores like a PDF payload, keeping the summed counts", () => {
    const pdf = filesAsPdf({ ...base, kinds: [...base.kinds] });
    expect(pdf).toEqual({
      method: "pdf",
      rows: base.rows,
      frequencies: { D0120: 550 },
      providerFees: {},
      pdfPath: "pdf/a.pdf",
      filename: "fees.csv, dr-patel.pdf, dr-wu.pdf",
    });
  });
});
