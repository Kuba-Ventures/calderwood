// Procedures every general practice does all the time, with the plain-English
// names a front desk uses. A prices-only report (no procedure counts) leads
// with these: "$34 less per adult cleaning" reads instantly, a CDT code does not.
// Order is display priority; the first one below market becomes the headline.

export type EverydayCode = { code: string; name: string };

export const EVERYDAY_CODES: EverydayCode[] = [
  { code: "D1110", name: "Adult cleaning" },
  { code: "D0120", name: "Periodic exam" },
  { code: "D0150", name: "New-patient exam" },
  { code: "D0274", name: "Four bitewing X-rays" },
  { code: "D2392", name: "Two-surface filling" },
  { code: "D2391", name: "One-surface filling" },
  { code: "D2740", name: "Ceramic crown" },
  { code: "D2750", name: "Porcelain-fused-to-metal crown" },
  { code: "D4341", name: "Scaling & root planing" },
  { code: "D4910", name: "Perio maintenance" },
  { code: "D7140", name: "Simple extraction" },
  { code: "D3330", name: "Molar root canal" },
];

/** Rows shown in the prices-only "each time" table. */
export const EVERYDAY_TABLE_SIZE = 6;
