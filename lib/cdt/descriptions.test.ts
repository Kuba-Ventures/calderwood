import { describe, expect, it } from "vitest";
import { describeWith, sentenceCase } from "./descriptions";
import { CDT_BY_CODE } from "@/lib/seed/cdt-codes";

describe("sentenceCase", () => {
  it("capitalizes the first letter of ADA's all-lowercase nomenclature", () => {
    expect(sentenceCase("prophylaxis - adult")).toBe("Prophylaxis - adult");
  });

  it("leaves acronyms later in the string alone", () => {
    expect(sentenceCase("cone beam CT capture and interpretation")).toBe(
      "Cone beam CT capture and interpretation"
    );
  });

  it("handles empty and whitespace-only input", () => {
    expect(sentenceCase("")).toBe("");
    expect(sentenceCase("   ")).toBe("");
  });
});

describe("describeWith", () => {
  it("prefers the curated short label over the official nomenclature", () => {
    // D1110 is in the in-repo seed, so the table-friendly label should win
    // over the longer ADA wording loaded from cdt_codes.
    const describe = describeWith(
      new Map([["D1110", "Prophylaxis - adult, a much longer official wording"]])
    );
    expect(describe("D1110")).toBe(CDT_BY_CODE["D1110"].description);
  });

  it("falls back to the database description for codes the seed lacks", () => {
    // D6114 is one of the ~800 codes the fee source ships that the 50-code
    // in-repo seed never covered.
    expect(CDT_BY_CODE["D6114"]).toBeUndefined();
    const describe = describeWith(
      new Map([["D6114", "Implant/abutment supported fixed denture"]])
    );
    expect(describe("D6114")).toBe("Implant/abutment supported fixed denture");
  });

  it("falls back to the bare code when neither source knows it", () => {
    const describe = describeWith(new Map());
    expect(describe("D9999")).toBe("D9999");
  });

  it("is unchanged from the seed-only behavior when the map is empty", () => {
    const describe = describeWith(new Map());
    expect(describe("D1110")).toBe(CDT_BY_CODE["D1110"].description);
  });
});
