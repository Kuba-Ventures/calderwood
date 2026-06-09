// CDT code -> procedure category, derived from the code's leading digit.
// Used to roll per-code recoverable up into "opportunity by category".

const BY_PREFIX: Record<string, string> = {
  D0: "Diagnostic",
  D1: "Preventive",
  D2: "Restorative",
  D3: "Endodontics",
  D4: "Periodontics",
  D5: "Prosthodontics",
  D6: "Implant & Fixed Prosth",
  D7: "Oral Surgery",
  D8: "Orthodontics",
  D9: "Adjunctive",
};

export function categoryFor(code: string): string {
  const key = (code || "").slice(0, 2).toUpperCase();
  return BY_PREFIX[key] ?? "Other";
}
