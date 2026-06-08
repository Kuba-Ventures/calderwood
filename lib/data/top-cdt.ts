// The ~20 highest-volume CDT codes, used for the "Top 20 codes" manual entry
// grid in onboarding/intake. Shared so the wizard and the intake page agree.

export type TopCdt = { code: string; label: string };

export const TOP_CDT: TopCdt[] = [
  { code: "D0120", label: "Periodic oral evaluation" },
  { code: "D0150", label: "Comprehensive oral evaluation" },
  { code: "D0210", label: "Intraoral, complete series" },
  { code: "D0220", label: "Intraoral periapical, first" },
  { code: "D0274", label: "Bitewings, four films" },
  { code: "D1110", label: "Prophylaxis, adult" },
  { code: "D1206", label: "Topical fluoride varnish" },
  { code: "D2140", label: "Amalgam, one surface" },
  { code: "D2330", label: "Resin, one surface anterior" },
  { code: "D2391", label: "Resin, one surface posterior" },
  { code: "D2392", label: "Resin, two surface posterior" },
  { code: "D2740", label: "Crown, porcelain/ceramic" },
  { code: "D2750", label: "Crown, porcelain fused to metal" },
  { code: "D3220", label: "Therapeutic pulpotomy" },
  { code: "D4341", label: "Perio scaling, 4+ teeth" },
  { code: "D4910", label: "Periodontal maintenance" },
  { code: "D5110", label: "Complete denture, maxillary" },
  { code: "D7140", label: "Extraction, erupted tooth" },
  { code: "D7210", label: "Surgical extraction" },
  { code: "D8080", label: "Comprehensive ortho, adolescent" },
];
