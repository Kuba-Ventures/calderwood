// The paywall boundary. Two jobs:
//   1. Map the stored ComputationOutput into the ReportData shape the dashboard
//      components render (these are different shapes — the DB stores the rich
//      compute output; the UI wants the flat ReportData).
//   2. Redact the gated numbers when the report is not yet paid for.
//
// This is the ONLY place gating happens. /api/report calls toGatedReport with
// the user's paid state; locked numbers (headline $, top-carrier $, per-code
// annual gap, per-carrier recoverable $) are zeroed so they never reach the
// browser pre-payment. The non-gated teaser (% of codes below UCR, fee vs UCR
// columns, the rounded opportunity figure) stays visible.

import type {
  CarrierRow,
  CodeRow,
  ReportData,
} from "@/lib/storage";
import type { ComputationOutput } from "@/lib/types/pipeline";
import { categoryFor } from "@/lib/data/cdt-categories";

/** Recoverable rolled up by procedure category. */
export type CategoryRollup = {
  name: string;
  recoverable: number;
  production: number;
  pct: number; // recoverable / production
};

/** One carrier in the scorecard. */
export type CarrierScore = {
  name: string;
  grade: string; // A..F, "" when locked
  blendedPctP75: number; // 0..1
  annualRecoverable: number;
};

/** One code's row across carriers in the heatmap. */
export type CarrierGridRow = {
  code: string;
  label: string;
  p75: number;
  volume: number;
  annualRecoverable: number;
  rates: Record<string, number>; // carrier name -> contracted rate (0 when locked)
};

export type CarrierGrid = {
  hasData: boolean; // any carrier schedules parsed
  carriers: CarrierScore[];
  rows: CarrierGridRow[];
};

/** One code's cross-provider fee spread. */
export type ProviderVarianceRow = {
  code: string;
  label: string;
  providers: Array<{ provider: string; fee: number }>;
  recoverable: number;
  spread: number;
};

export type GatedReport = Omit<ReportData, "worstCarrier"> & {
  // name is "" when locked (the worst carrier is itself a paid insight).
  worstCarrier: { name: string; annualGapUsd: number; gapPct: number };
  unlocked: boolean;
  /** Rounded-down headline used as the unlock hook. Safe to show when locked. */
  teaserUsd: number;
  /** Non-gated teaser stat: how many top codes sit below UCR. */
  codesBelowP75: { count: number; total: number };
  /** Recoverable by procedure category (benchmarked codes). */
  categories: CategoryRollup[];
  /** Carrier scorecard + code-by-carrier rate grid. */
  carrierGrid: CarrierGrid;
  /** Cross-provider fee variance per code. */
  providerVariance: ProviderVarianceRow[];
};

function gradeFor(blended: number): string {
  if (blended >= 0.97) return "A";
  if (blended >= 0.92) return "B";
  if (blended >= 0.87) return "C";
  if (blended >= 0.82) return "D";
  return "F";
}

/** Build the rich (unredacted) category + carrier views from the compute output. */
function buildRich(output: ComputationOutput): {
  categories: CategoryRollup[];
  carrierGrid: CarrierGrid;
  providerVariance: ProviderVarianceRow[];
} {
  // Categories: benchmarked codes only (p75 present), recoverable vs production.
  const catMap: Record<string, CategoryRollup> = {};
  for (const r of output.codeRows) {
    if (!r.p75 || r.p75 <= 0) continue;
    const name = categoryFor(r.code);
    const m = catMap[name] || (catMap[name] = { name, recoverable: 0, production: 0, pct: 0 });
    m.recoverable += r.annualRecoverableMarket;
    m.production += r.practiceFee * r.annualFrequency;
  }
  const categories = Object.values(catMap)
    .map((c) => ({
      ...c,
      recoverable: Math.round(c.recoverable),
      production: Math.round(c.production),
      pct: c.production > 0 ? c.recoverable / c.production : 0,
    }))
    .filter((c) => c.recoverable > 0)
    .sort((a, b) => b.recoverable - a.recoverable);

  // Carriers present = any carrier that appears in any code's carrierFees.
  const present = new Set<string>();
  for (const r of output.codeRows) {
    for (const k of Object.keys(r.carrierFees)) present.add(k);
  }
  const recByCarrier: Record<string, number> = {};
  output.recoverableByCarrier.forEach((c) => (recByCarrier[c.carrier] = c.recoverable));

  const carriers: CarrierScore[] = Array.from(present)
    .map((name) => {
      let num = 0;
      let den = 0;
      for (const r of output.codeRows) {
        const rate = r.carrierFees[name];
        if (rate == null || !r.p75 || r.p75 <= 0) continue;
        num += rate * r.annualFrequency;
        den += r.p75 * r.annualFrequency;
      }
      const blended = den > 0 ? num / den : 0;
      return {
        name,
        grade: gradeFor(blended),
        blendedPctP75: Math.min(1.2, blended),
        annualRecoverable: Math.round(recByCarrier[name] ?? 0),
      };
    })
    .sort((a, b) => b.annualRecoverable - a.annualRecoverable);

  const rows: CarrierGridRow[] = output.codeRows
    .filter((r) => r.p75 && r.p75 > 0 && Object.keys(r.carrierFees).length > 0)
    .map((r) => ({
      code: r.code,
      label: r.description,
      p75: r.p75 ?? 0,
      volume: r.annualFrequency,
      annualRecoverable: Math.round(r.annualRecoverableMarket),
      rates: { ...r.carrierFees },
    }))
    .sort((a, b) => b.annualRecoverable - a.annualRecoverable);

  // Provider variance: codes with a real cross-provider fee spread.
  const providerVariance: ProviderVarianceRow[] = output.codeRows
    .filter((r) => r.providerFees && (r.providerVarianceRecoverable ?? 0) > 0)
    .map((r) => {
      const providers = Object.entries(r.providerFees ?? {})
        .map(([provider, fee]) => ({ provider, fee }))
        .sort((a, b) => b.fee - a.fee);
      const fees = providers.map((p) => p.fee);
      return {
        code: r.code,
        label: r.description,
        providers,
        recoverable: Math.round(r.providerVarianceRecoverable ?? 0),
        spread: fees.length ? Math.max(...fees) - Math.min(...fees) : 0,
      };
    })
    .filter((r) => r.spread > 0)
    .sort((a, b) => b.recoverable - a.recoverable);

  return {
    categories,
    carrierGrid: { hasData: present.size > 0, carriers, rows },
    providerVariance,
  };
}

/** Map the rich compute output into the flat ReportData the UI renders. */
export function computationToReportData(
  output: ComputationOutput,
  zip: string
): ReportData {
  const codes: CodeRow[] = output.codeRows.map((r) => ({
    code: r.code,
    label: r.description,
    yourFee: r.practiceFee,
    ucrMedian: r.p50 ?? 0,
    ucrP75: r.p75 ?? 0,
    annualVolume: r.annualFrequency,
    gapPerProc: r.marketGap,
    annualGap: r.annualRecoverableMarket,
  }));

  const totalRecoverable =
    output.recoverableByCarrier.reduce((s, c) => s + c.recoverable, 0) || 1;

  // Blended "% below UCR" per carrier from the code-level carrier gaps, when
  // carrier schedules were parsed. Falls back to 0 (chart hides the line).
  const carrierGapPct = (carrier: string): number => {
    let num = 0;
    let den = 0;
    for (const r of output.codeRows) {
      const gap = r.annualRecoverableByCarrier[carrier];
      const fee = r.carrierFees[carrier];
      if (gap != null) num += gap;
      if (fee != null) den += fee * r.annualFrequency;
    }
    return den > 0 ? Math.min(0.99, num / den) : 0;
  };

  const carriers: CarrierRow[] = output.recoverableByCarrier
    .map((c) => ({
      name: c.carrier as CarrierRow["name"],
      annualGapUsd: c.recoverable,
      gapPct: carrierGapPct(c.carrier),
      share: c.recoverable / totalRecoverable,
    }))
    .sort((a, b) => b.annualGapUsd - a.annualGapUsd);

  const top = output.executiveSummary.topCarrier;
  const worstCarrier = top
    ? {
        name: top.name as CarrierRow["name"],
        annualGapUsd: top.recoverable,
        gapPct: carrierGapPct(top.name),
      }
    : carriers[0] ?? { name: "Other" as CarrierRow["name"], annualGapUsd: 0, gapPct: 0 };

  return {
    annualUnderpaymentUsd: output.executiveSummary.totalAnnualUnderpayment,
    worstCarrier,
    carriers,
    codes: codes.sort((a, b) => b.annualGap - a.annualGap),
    zip,
  };
}

/** Round a headline down to a clean teaser figure ($X+). */
export function teaserFigure(total: number): number {
  if (total <= 0) return 0;
  const step = total >= 20000 ? 5000 : total >= 5000 ? 1000 : 500;
  return Math.floor(total / step) * step;
}

/**
 * Produce the client payload. When unlocked, full numbers. When locked, every
 * gated dollar figure is zeroed — the client blurs these and shows the teaser
 * instead, so the real values are never serialized to the browser.
 */
export function toGatedReport(
  output: ComputationOutput,
  zip: string,
  unlocked: boolean
): GatedReport {
  const full = computationToReportData(output, zip);
  const codesBelowP75 = output.executiveSummary.codesBelowP75InTop20;
  const teaserUsd = teaserFigure(full.annualUnderpaymentUsd);
  const rich = buildRich(output);

  if (unlocked) {
    return {
      ...full,
      unlocked: true,
      teaserUsd,
      codesBelowP75,
      categories: rich.categories,
      carrierGrid: rich.carrierGrid,
      providerVariance: rich.providerVariance,
    };
  }

  // Locked: strip every gated value AND anything that leaks the paid insight by
  // position. We keep fee vs UCR median (the teaser hook) and the practice's own
  // carrier names, but: zero all dollar figures + share, drop the worst-carrier
  // name, and sort neutrally (by code / name) so ordering can't reveal the
  // ranking. The exact headline becomes a rounded teaser only.
  const lockedCarriers = full.carriers
    .map((c) => ({ name: c.name, share: 0, annualGapUsd: 0, gapPct: 0 }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const lockedCodes = full.codes
    .map((c) => ({ ...c, gapPerProc: 0, annualGap: 0 }))
    .sort((a, b) => a.code.localeCompare(b.code));

  // Locked rich views: keep structure + names so the sections render a teaser,
  // but zero every dollar figure, rate, and grade so nothing paid leaks.
  const lockedCategories = rich.categories
    .map((c) => ({ name: c.name, recoverable: 0, production: 0, pct: 0 }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const lockedGrid: CarrierGrid = {
    hasData: rich.carrierGrid.hasData,
    carriers: rich.carrierGrid.carriers
      .map((c) => ({ name: c.name, grade: "", blendedPctP75: 0, annualRecoverable: 0 }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    rows: rich.carrierGrid.rows
      .map((r) => ({
        code: r.code,
        label: r.label,
        p75: r.p75,
        volume: r.volume,
        annualRecoverable: 0,
        rates: Object.fromEntries(Object.keys(r.rates).map((k) => [k, 0])),
      }))
      .sort((a, b) => a.code.localeCompare(b.code)),
  };

  const lockedProviderVariance: ProviderVarianceRow[] = rich.providerVariance
    .map((r) => ({
      code: r.code,
      label: r.label,
      providers: r.providers.map((p) => ({ provider: p.provider, fee: 0 })),
      recoverable: 0,
      spread: 0,
    }))
    .sort((a, b) => a.code.localeCompare(b.code));

  return {
    unlocked: false,
    teaserUsd,
    codesBelowP75,
    zip: full.zip,
    annualUnderpaymentUsd: 0,
    worstCarrier: { name: "", annualGapUsd: 0, gapPct: 0 },
    carriers: lockedCarriers,
    codes: lockedCodes,
    categories: lockedCategories,
    carrierGrid: lockedGrid,
    providerVariance: lockedProviderVariance,
  };
}
