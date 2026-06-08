// Default annual procedure volumes, PER PROVIDER, for the common CDT codes.
//
// Why this exists: the user intake collects a fee schedule but NOT how often
// each procedure is billed. compute() needs an annual frequency per code to
// turn a per-procedure gap into an annual-dollars gap. Rather than ask the
// dentist for 20 volumes (friction we're explicitly cutting), we apply these
// per-provider industry-typical volumes scaled by the practice's provider
// count. These are estimates calibrated against the sample practice fixture
// (a 2-5 provider office); refine when real billing data is available.

// Per provider, per year.
export const ANNUAL_FREQUENCY_PER_PROVIDER: Record<string, number> = {
  // Diagnostic
  D0120: 120, // periodic oral evaluation
  D0150: 35, // comprehensive oral evaluation
  D0210: 60, // intraoral complete series
  D0220: 140, // periapical, first film
  D0230: 90, // periapical, each additional
  D0274: 150, // bitewings, four films
  D0140: 30, // limited oral evaluation, problem focused
  // Preventive
  D1110: 140, // prophylaxis, adult
  D1120: 35, // prophylaxis, child
  D1206: 160, // topical fluoride varnish
  D1208: 60, // topical fluoride
  D1351: 70, // sealant, per tooth
  // Restorative
  D2140: 50, // amalgam, one surface
  D2150: 25, // amalgam, two surface
  D2330: 30, // resin, one surface anterior
  D2331: 30, // resin, two surface anterior
  D2391: 50, // resin, one surface posterior
  D2392: 50, // resin, two surface posterior
  D2393: 40, // resin, three surface posterior
  D2740: 50, // crown, porcelain/ceramic
  D2750: 35, // crown, porcelain fused to metal
  D2950: 50, // core buildup, including pins
  D2954: 25, // prefabricated post and core
  // Endodontics
  D3220: 15, // therapeutic pulpotomy
  D3310: 15, // endodontic therapy, anterior
  D3320: 18, // endodontic therapy, premolar
  D3330: 20, // endodontic therapy, molar
  // Periodontics
  D4341: 60, // perio scaling/root planing, 4+ teeth
  D4342: 35, // perio scaling/root planing, 1-3 teeth
  D4910: 75, // periodontal maintenance
  // Prosthodontics
  D5110: 8, // complete denture, maxillary
  D5120: 8, // complete denture, mandibular
  D6010: 12, // surgical implant placement
  // Oral surgery
  D7140: 55, // extraction, erupted tooth
  D7210: 25, // surgical extraction
  // Orthodontics
  D8080: 10, // comprehensive ortho, adolescent
};

// Codes not in the table still get a modest non-zero volume so they contribute
// to the report instead of silently reading as zero.
export const FALLBACK_ANNUAL_FREQUENCY_PER_PROVIDER = 24;

/** Map provider-count bucket -> a representative provider count for scaling. */
export function providersFromBucket(bucket: "1" | "2-5" | "6+"): number {
  switch (bucket) {
    case "1":
      return 1;
    case "2-5":
      return 3;
    case "6+":
      return 7;
  }
}

/**
 * Build the frequencies map compute() expects: one annual volume per code in
 * the practice's fee schedule, scaled by provider count.
 */
export function defaultFrequencies(
  codes: string[],
  providerCount: number
): Record<string, number> {
  const n = Math.max(1, Math.round(providerCount));
  const out: Record<string, number> = {};
  for (const code of codes) {
    const perProvider =
      ANNUAL_FREQUENCY_PER_PROVIDER[code] ??
      FALLBACK_ANNUAL_FREQUENCY_PER_PROVIDER;
    out[code] = perProvider * n;
  }
  return out;
}
