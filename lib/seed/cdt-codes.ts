// Top 50 CDT codes by national billing frequency. Sourced from public ADA
// summaries and supplemented from the public CDT code book. Descriptions
// kept short for table rendering; the official ADA descriptors should be
// the source of truth once a license is in place.

export type CdtSeedRow = {
  code: string;
  description: string;
  category: string;
};

export const CDT_CODES: CdtSeedRow[] = [
  // Diagnostic
  { code: "D0120", description: "Periodic oral evaluation", category: "Diagnostic" },
  { code: "D0140", description: "Limited oral evaluation, problem-focused", category: "Diagnostic" },
  { code: "D0150", description: "Comprehensive oral evaluation", category: "Diagnostic" },
  { code: "D0210", description: "Intraoral, complete series of radiographs", category: "Diagnostic" },
  { code: "D0220", description: "Intraoral periapical, first radiographic image", category: "Diagnostic" },
  { code: "D0230", description: "Intraoral periapical, each additional", category: "Diagnostic" },
  { code: "D0274", description: "Bitewings, four films", category: "Diagnostic" },
  { code: "D0330", description: "Panoramic radiographic image", category: "Diagnostic" },

  // Preventive
  { code: "D1110", description: "Prophylaxis, adult", category: "Preventive" },
  { code: "D1120", description: "Prophylaxis, child", category: "Preventive" },
  { code: "D1206", description: "Topical fluoride varnish", category: "Preventive" },
  { code: "D1208", description: "Topical fluoride, excluding varnish", category: "Preventive" },
  { code: "D1351", description: "Sealant, per tooth", category: "Preventive" },

  // Restorative
  { code: "D2140", description: "Amalgam, one surface", category: "Restorative" },
  { code: "D2150", description: "Amalgam, two surfaces", category: "Restorative" },
  { code: "D2160", description: "Amalgam, three surfaces", category: "Restorative" },
  { code: "D2330", description: "Resin, one surface anterior", category: "Restorative" },
  { code: "D2331", description: "Resin, two surfaces anterior", category: "Restorative" },
  { code: "D2332", description: "Resin, three surfaces anterior", category: "Restorative" },
  { code: "D2391", description: "Resin, one surface posterior", category: "Restorative" },
  { code: "D2392", description: "Resin, two surfaces posterior", category: "Restorative" },
  { code: "D2393", description: "Resin, three surfaces posterior", category: "Restorative" },
  { code: "D2740", description: "Crown, porcelain/ceramic", category: "Restorative" },
  { code: "D2750", description: "Crown, porcelain fused to metal", category: "Restorative" },
  { code: "D2950", description: "Core buildup, including pins", category: "Restorative" },

  // Endodontics
  { code: "D3220", description: "Therapeutic pulpotomy", category: "Endodontics" },
  { code: "D3310", description: "Endodontic therapy, anterior", category: "Endodontics" },
  { code: "D3320", description: "Endodontic therapy, premolar", category: "Endodontics" },
  { code: "D3330", description: "Endodontic therapy, molar", category: "Endodontics" },

  // Periodontics
  { code: "D4341", description: "Periodontal scaling, four or more teeth", category: "Periodontics" },
  { code: "D4342", description: "Periodontal scaling, one to three teeth", category: "Periodontics" },
  { code: "D4910", description: "Periodontal maintenance", category: "Periodontics" },

  // Prosthodontics
  { code: "D5110", description: "Complete denture, maxillary", category: "Prosthodontics" },
  { code: "D5120", description: "Complete denture, mandibular", category: "Prosthodontics" },
  { code: "D5213", description: "Maxillary partial denture, cast metal", category: "Prosthodontics" },
  { code: "D5214", description: "Mandibular partial denture, cast metal", category: "Prosthodontics" },

  // Implants
  { code: "D6010", description: "Surgical placement of implant body", category: "Implants" },
  { code: "D6056", description: "Prefabricated abutment", category: "Implants" },
  { code: "D6058", description: "Abutment-supported porcelain/ceramic crown", category: "Implants" },

  // Oral surgery
  { code: "D7140", description: "Extraction, erupted tooth", category: "Oral Surgery" },
  { code: "D7210", description: "Surgical removal of erupted tooth", category: "Oral Surgery" },
  { code: "D7220", description: "Removal of impacted tooth, soft tissue", category: "Oral Surgery" },
  { code: "D7230", description: "Removal of impacted tooth, partial bony", category: "Oral Surgery" },
  { code: "D7240", description: "Removal of impacted tooth, complete bony", category: "Oral Surgery" },
  { code: "D7250", description: "Surgical removal of residual roots", category: "Oral Surgery" },

  // Orthodontics
  { code: "D8070", description: "Comprehensive ortho, transitional dentition", category: "Orthodontics" },
  { code: "D8080", description: "Comprehensive ortho, adolescent", category: "Orthodontics" },
  { code: "D8090", description: "Comprehensive ortho, adult", category: "Orthodontics" },

  // Adjunctive
  { code: "D9110", description: "Palliative treatment of dental pain", category: "Adjunctive" },
  { code: "D9230", description: "Inhalation of nitrous oxide", category: "Adjunctive" },
];

// Quick lookup by code.
export const CDT_BY_CODE: Record<string, CdtSeedRow> = Object.fromEntries(
  CDT_CODES.map((c) => [c.code, c])
);

export function getCdtDescription(code: string): string {
  return CDT_BY_CODE[code]?.description ?? code;
}
