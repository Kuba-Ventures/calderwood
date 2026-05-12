"use client";

import {
  CarrierRow,
  CodeRow,
  ReportData,
  formatUsd,
} from "@/lib/storage";

// Estimate where yourFee sits in the local UCR distribution. Median = 50th,
// p75 = 75th. Linear extrapolation, clamped 1..99. Approximation only,
// real ranks come from the backend when it lands.
function estimatePercentile(row: CodeRow): number {
  const span = row.ucrP75 - row.ucrMedian;
  if (span <= 0) return 50;
  const p = 50 + 25 * ((row.yourFee - row.ucrMedian) / span);
  return Math.max(1, Math.min(99, Math.round(p)));
}

export function GlanceTiles({ data }: { data: ReportData | null }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <PercentileTile data={data} />
      <TopCodesTile data={data} />
      <CarrierRevenueTile data={data} />
    </div>
  );
}

function TileShell({
  title,
  children,
  empty,
}: {
  title: string;
  children?: React.ReactNode;
  empty: boolean;
}) {
  return (
    <div className="rounded-xl border border-canvas-border bg-canvas px-5 py-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">
        {title}
      </p>
      <div className="mt-4">
        {empty ? (
          <EmptyTile />
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function EmptyTile() {
  return (
    <div className="space-y-3">
      <div className="space-y-2.5">
        {[60, 80, 45, 70].map((w, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-2 w-12 rounded-full bg-canvas-tint2" />
            <div className="h-2 flex-1 rounded-full bg-canvas-tint2" style={{ maxWidth: `${w}%` }} />
            <div className="h-2 w-10 rounded-full bg-canvas-tint2" />
          </div>
        ))}
      </div>
      <p className="pt-2 text-xs italic text-ink-400">
        Will populate once your report is generated.
      </p>
    </div>
  );
}

function PercentileTile({ data }: { data: ReportData | null }) {
  const rows = data?.codes.slice(0, 5) ?? [];
  return (
    <TileShell title="Percentile rank in your ZIP" empty={!data}>
      <ul className="space-y-2.5">
        {rows.map((row) => {
          const pct = estimatePercentile(row);
          return (
            <li key={row.code} className="flex items-center gap-3">
              <span className="w-12 font-mono text-xs text-ink-700">
                {row.code}
              </span>
              <div className="relative h-2 flex-1 rounded-full bg-canvas-tint2">
                <div
                  className="absolute left-0 top-0 h-full rounded-full bg-accent"
                  style={{ width: `${pct}%` }}
                />
                <div
                  aria-hidden="true"
                  className="absolute -top-0.5 h-3 w-px bg-ink-400"
                  style={{ left: "75%" }}
                />
              </div>
              <span className="w-10 text-right font-serif text-sm font-medium text-ink-900 tabular-nums">
                {pct}
                <span className="text-xs text-ink-400">th</span>
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex items-center gap-3 text-[11px] text-ink-400">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-3 rounded-full bg-accent" /> your fee
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-px bg-ink-400" /> 75th percentile
        </span>
      </div>
    </TileShell>
  );
}

function TopCodesTile({ data }: { data: ReportData | null }) {
  const rows = data?.codes.slice(0, 5) ?? [];
  return (
    <TileShell title="Top codes by annual impact" empty={!data}>
      <table className="w-full text-sm">
        <thead className="text-left text-[11px] uppercase tracking-wide text-ink-400">
          <tr>
            <th className="py-1.5 pr-2 font-medium">Code</th>
            <th className="py-1.5 pr-2 font-medium">Procedure</th>
            <th className="py-1.5 pr-2 text-right font-medium">Gap</th>
            <th className="py-1.5 text-right font-medium">Annual</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.code} className="border-t border-canvas-border">
              <td className="py-2 pr-2 font-mono text-xs text-ink-700">
                {row.code}
              </td>
              <td className="py-2 pr-2 text-xs text-ink-700">
                {truncate(row.label, 22)}
              </td>
              <td className="py-2 pr-2 text-right text-xs font-medium text-red-700 tabular-nums">
                {formatUsd(row.gapPerProc)}
              </td>
              <td className="py-2 text-right font-serif text-sm font-medium text-red-700 tabular-nums">
                {formatUsd(row.annualGap)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TileShell>
  );
}

function CarrierRevenueTile({ data }: { data: ReportData | null }) {
  const rows: CarrierRow[] = data?.carriers.slice(0, 5) ?? [];
  const max = Math.max(...rows.map((r) => r.annualGapUsd), 1);
  return (
    <TileShell title="Recoverable revenue by carrier" empty={!data}>
      <ul className="space-y-2.5">
        {rows.map((c) => {
          const w = (c.annualGapUsd / max) * 100;
          return (
            <li key={c.name}>
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-700">{c.name}</span>
                <span className="font-serif text-sm font-medium text-accent-ink tabular-nums">
                  {formatUsd(c.annualGapUsd)}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-canvas-tint2">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${w}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </TileShell>
  );
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}
