"use client";

// Report-page percentile section: where each top code's fee sits in the local
// UCR distribution. Bars to the fee's percentile, a line at the 75th target.

import type { CodeRow } from "@/lib/storage";

function estimatePercentile(row: CodeRow): number {
  const span = row.ucrP75 - row.ucrMedian;
  if (span <= 0) return 50;
  const p = 50 + 25 * ((row.yourFee - row.ucrMedian) / span);
  return Math.max(1, Math.min(99, Math.round(p)));
}
function ordinal(n: number): string {
  const t = n % 100;
  if (t >= 11 && t <= 13) return "th";
  return { 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th";
}

export function ReportPercentile({ codes }: { codes: CodeRow[] }) {
  const rows = codes.filter((c) => c.ucrP75 > 0).slice(0, 12);
  if (rows.length === 0) return null;
  return (
    <div className="rounded-xl border border-canvas-border bg-canvas px-6 py-6 shadow-sm">
      <h3 className="text-base font-semibold text-ink-900">Percentile rank in your ZIP</h3>
      <p className="mt-1 text-xs text-ink-500">
        Where each top code&rsquo;s fee sits in the local distribution. The line marks
        the 75th percentile target.
      </p>
      <ul className="mt-5 space-y-2.5">
        {rows.map((row) => {
          const pct = estimatePercentile(row);
          return (
            <li key={row.code} className="grid grid-cols-[58px_1fr_44px] items-center gap-3">
              <div>
                <div className="font-mono text-xs font-bold text-accent">{row.code}</div>
              </div>
              <div className="relative h-2.5 rounded-full bg-canvas-tint2">
                <div className="absolute left-0 top-0 h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                <div aria-hidden className="absolute -top-1 h-4.5 w-px bg-accent-ink" style={{ left: "75%", height: "1.1rem" }} />
              </div>
              <div className="text-right font-serif text-sm text-ink-900 tabular-nums">
                {pct}
                <span className="text-[10px] text-ink-400">{ordinal(pct)}</span>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex items-center gap-3 text-[11px] text-ink-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-4 rounded-full bg-accent" /> your fee percentile
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-px bg-accent-ink" /> 75th percentile
        </span>
      </div>
    </div>
  );
}
