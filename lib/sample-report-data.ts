// Sample report payload for State 3 demo. Plausible numbers for a 3-provider
// general-dentistry practice in 94110. Replace with real backend payload
// once Supabase + the analysis pipeline land.

import type { CodeRow, ReportData } from "./storage";

const CODES: Omit<CodeRow, "gapPerProc" | "annualGap">[] = [
  { code: "D0120", label: "Periodic oral evaluation", yourFee: 65, ucrMedian: 78, ucrP75: 88, annualVolume: 1820 },
  { code: "D0150", label: "Comprehensive oral evaluation", yourFee: 102, ucrMedian: 124, ucrP75: 138, annualVolume: 410 },
  { code: "D0210", label: "Intraoral, complete series", yourFee: 168, ucrMedian: 195, ucrP75: 215, annualVolume: 220 },
  { code: "D0274", label: "Bitewings, four films", yourFee: 78, ucrMedian: 92, ucrP75: 102, annualVolume: 1480 },
  { code: "D1110", label: "Prophylaxis, adult", yourFee: 118, ucrMedian: 138, ucrP75: 152, annualVolume: 2210 },
  { code: "D1206", label: "Topical fluoride varnish", yourFee: 42, ucrMedian: 51, ucrP75: 58, annualVolume: 690 },
  { code: "D2140", label: "Amalgam, one surface", yourFee: 165, ucrMedian: 178, ucrP75: 198, annualVolume: 95 },
  { code: "D2391", label: "Resin, one surface posterior", yourFee: 198, ucrMedian: 235, ucrP75: 262, annualVolume: 540 },
  { code: "D2392", label: "Resin, two surface posterior", yourFee: 245, ucrMedian: 298, ucrP75: 330, annualVolume: 380 },
  { code: "D2740", label: "Crown, porcelain/ceramic", yourFee: 1180, ucrMedian: 1395, ucrP75: 1525, annualVolume: 165 },
  { code: "D2750", label: "Crown, porcelain fused to metal", yourFee: 1095, ucrMedian: 1268, ucrP75: 1380, annualVolume: 75 },
  { code: "D3220", label: "Therapeutic pulpotomy", yourFee: 245, ucrMedian: 282, ucrP75: 312, annualVolume: 35 },
  { code: "D4341", label: "Perio scaling, 4+ teeth", yourFee: 268, ucrMedian: 312, ucrP75: 345, annualVolume: 240 },
  { code: "D4910", label: "Periodontal maintenance", yourFee: 162, ucrMedian: 188, ucrP75: 208, annualVolume: 880 },
  { code: "D7140", label: "Extraction, erupted tooth", yourFee: 195, ucrMedian: 228, ucrP75: 252, annualVolume: 120 },
  { code: "D7210", label: "Surgical extraction", yourFee: 348, ucrMedian: 412, ucrP75: 458, annualVolume: 55 },
];

// Delta intentionally omitted from the negotiation ranking. Delta does not
// renegotiate provider rates, so it is shown elsewhere as scope but never as
// recoverable revenue. Real backend should segregate non-negotiable carriers.
const CARRIERS: { name: ReportData["carriers"][number]["name"]; gapPct: number; share: number }[] = [
  { name: "Aetna", gapPct: 0.22, share: 0.28 },
  { name: "Cigna", gapPct: 0.14, share: 0.22 },
  { name: "UnitedHealthcare", gapPct: 0.18, share: 0.16 },
  { name: "MetLife", gapPct: 0.11, share: 0.14 },
  { name: "Guardian", gapPct: 0.09, share: 0.10 },
  { name: "BCBS", gapPct: 0.13, share: 0.10 },
];

export function getSampleReportData(zip = "94110"): ReportData {
  const codes: CodeRow[] = CODES.map((c) => {
    const gapPerProc = +(c.ucrMedian - c.yourFee).toFixed(2);
    const annualGap = Math.round(gapPerProc * c.annualVolume);
    return { ...c, gapPerProc, annualGap };
  });

  // Total practice underpayment vs UCR median across all volume.
  const totalAnnualGap = codes.reduce((sum, c) => sum + c.annualGap, 0);

  // Attribute the gap to carriers by their share and a blended gap-pct factor.
  const blendedFactor =
    CARRIERS.reduce((s, c) => s + c.gapPct * c.share, 0) || 1;
  const carriers: ReportData["carriers"] = CARRIERS.map((c) => ({
    name: c.name,
    gapPct: c.gapPct,
    share: c.share,
    annualGapUsd: Math.round(
      totalAnnualGap * ((c.gapPct * c.share) / blendedFactor)
    ),
  })).sort((a, b) => b.annualGapUsd - a.annualGapUsd);

  const worst = carriers[0];

  return {
    annualUnderpaymentUsd: totalAnnualGap,
    worstCarrier: {
      name: worst.name,
      annualGapUsd: worst.annualGapUsd,
      gapPct: worst.gapPct,
    },
    carriers,
    codes: codes.sort((a, b) => b.annualGap - a.annualGap),
    zip,
  };
}
