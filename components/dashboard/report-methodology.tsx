"use client";

// Static methodology section for the unlocked report. Explains how the numbers
// were calculated so the figures are defensible.

import { formatPct } from "@/lib/storage";

export function ReportMethodology({ coverage }: { coverage?: number }) {
  const items: [string, string][] = [
    [
      "UCR geography.",
      "Each code's benchmark is resolved at the most specific geography available: ZIP3, then metro, then state, then region, then national, requiring a minimum sample of 30 to use a level.",
    ],
    [
      "Your fee.",
      "Your practice fee is the production-weighted average across providers, with $0 bundled and write-off lines excluded so they don't drag the average down.",
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
      `Benchmark coverage for this report is ${
        coverage != null ? formatPct(coverage) : "shown above"
      } of captured production; codes without a benchmark at the required sample are excluded from totals.`,
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
