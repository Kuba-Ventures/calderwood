"use client";

// Methodology section for the unlocked report. Explains how the numbers were
// calculated so the figures are defensible. Pass coverage (0..1, share of
// captured production with a benchmark) to print it.

import { formatPct } from "@/lib/storage";

export function ReportMethodology({ coverage }: { coverage?: number }) {
  const items: [string, string][] = [
    [
      "UCR geography.",
      "Each code's benchmark comes from the most specific geography available. First is your ZIP code: a national benchmark adjusted by a geographic factor for your ZIP. If that is not available, we use your three-digit ZIP area, then your metro area, state, region, and finally the national figure. A level is used only if its benchmark rests on at least 30 fees. The ZIP-level figure uses the sample size of the national benchmark it is built from.",
    ],
    [
      "Your fee.",
      "Your fee for each code is the fee you uploaded. For a practice-management report, that is the code's \"Average $\" figure, which already blends all providers. Codes with a $0 or blank average are left out, and provider rows at $0 are dropped from the per-provider comparison.",
    ],
    [
      "Per-code recoverable.",
      "Recoverable revenue is max(0, p75 - fee) × annual volume, with the zero-clamp applied per code, never netted at the aggregate, so an above-market code can't mask a below-market one.",
    ],
    [
      "Carrier rates.",
      "Carrier cells use each carrier's contracted allowed amount. When a carrier rate is missing we leave the cell empty rather than assuming your master fee applies.",
    ],
    [
      "Coverage.",
      coverage != null
        ? `Benchmarks cover ${formatPct(coverage)} of your captured production. Codes without a benchmark are left out of every total.`
        : "Codes without a benchmark are left out of every total.",
    ],
  ];
  return (
    <div className="rounded-xl border border-canvas-border bg-canvas px-6 py-6 shadow-sm">
      <h3 className="text-base font-semibold text-ink-900">
        How the numbers were calculated
      </h3>
      <ul className="mt-3">
        {items.map(([b, t]) => (
          <li
            key={b}
            className="relative border-t border-canvas-border py-3 pl-5 text-[13px] text-ink-600 first:border-t-0"
          >
            <span className="absolute left-0 top-[18px] h-1.5 w-1.5 rounded-full bg-accent" />
            <span className="font-semibold text-ink-900">{b}</span> {t}
          </li>
        ))}
      </ul>
    </div>
  );
}
