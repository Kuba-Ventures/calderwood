"use client";

import {
  CarrierRow,
  CodeRow,
  formatUsd,
} from "@/lib/storage";
import { LockCard, LockedInline } from "@/components/report/lock-overlay";

// Structural subset the tiles need — satisfied by both ReportData and the
// gated report shape (which differs only in worstCarrier, unused here).
type ReportLike = { codes: CodeRow[]; carriers: CarrierRow[] };

// Estimate where yourFee sits in the local UCR distribution. Median = 50th,
// p75 = 75th. Linear extrapolation, clamped 1..99. Approximation only,
// real ranks come from the backend when it lands.
function estimatePercentile(row: CodeRow): number {
  const span = row.ucrP75 - row.ucrMedian;
  if (span <= 0) return 50;
  const p = 50 + 25 * ((row.yourFee - row.ucrMedian) / span);
  return Math.max(1, Math.min(99, Math.round(p)));
}

export function GlanceTiles({
  data,
  unlocked = true,
  onUnlock,
  busy,
}: {
  data: ReportLike | null;
  unlocked?: boolean;
  onUnlock?: () => void;
  busy?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Percentile is a non-gated teaser — always visible. */}
      <PercentileTile data={data} />
      <TopCodesTile data={data} unlocked={unlocked} />
      <CarrierRevenueTile
        data={data}
        unlocked={unlocked}
        onUnlock={onUnlock}
        busy={busy}
      />
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

function PercentileTile({ data }: { data: ReportLike | null }) {
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
                <span className="text-xs text-ink-400">{ordinal(pct)}</span>
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

function TopCodesTile({
  data,
  unlocked,
}: {
  data: ReportLike | null;
  unlocked: boolean;
}) {
  // Benchmarked codes only, top 5 by recoverable. Recoverable is a positive
  // opportunity, so render it as gain (green), not a red loss.
  const rows = (data?.codes ?? []).filter((c) => c.ucrP75 > 0).slice(0, 5);
  return (
    <TileShell title="Top codes by annual impact" empty={!data}>
      <table className="w-full text-sm">
        <thead className="text-left text-[11px] uppercase tracking-wide text-ink-400">
          <tr>
            <th className="py-1.5 pr-2 font-medium">Code</th>
            <th className="py-1.5 pr-2 font-medium">Procedure</th>
            <th className="py-1.5 pr-2 text-right font-medium">Per proc</th>
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
                <LockedInline unlocked={unlocked} placeholder="$•••">
                  {formatUsd(Math.max(0, row.gapPerProc))}
                </LockedInline>
              </td>
              <td className="py-2 text-right font-serif text-sm font-medium text-red-700 tabular-nums">
                <LockedInline unlocked={unlocked}>
                  {formatUsd(Math.max(0, row.annualGap))}
                </LockedInline>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TileShell>
  );
}

function CarrierRevenueTile({
  data,
  unlocked,
  onUnlock,
  busy,
}: {
  data: ReportLike | null;
  unlocked: boolean;
  onUnlock?: () => void;
  busy?: boolean;
}) {
  const rows: CarrierRow[] = data?.carriers.slice(0, 5) ?? [];
  // Report generated but no per-carrier rates → can't rank carriers. Say so
  // instead of showing a blank/blurred tile.
  if (data && rows.length === 0) {
    return (
      <TileShell title="Recoverable revenue by carrier" empty={false}>
        <p className="text-xs leading-relaxed text-ink-500">
          Upload your per-carrier fee schedules to see which carrier underpays
          you most. Your code-level opportunity is shown in the other tiles.
        </p>
      </TileShell>
    );
  }
  // When locked the dollar values are zeroed; show even bars under the blur.
  const max = Math.max(...rows.map((r) => r.annualGapUsd), 1);
  return (
    <TileShell title="Recoverable revenue by carrier" empty={!data}>
      <LockCard unlocked={unlocked} onUnlock={onUnlock} busy={busy}>
        <ul className="space-y-2.5">
          {rows.map((c, i) => {
            const w = unlocked ? (c.annualGapUsd / max) * 100 : 90 - i * 14;
            return (
              <li key={c.name}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-700">{c.name}</span>
                  <span className="font-serif text-sm font-medium text-accent-ink tabular-nums">
                    {unlocked ? formatUsd(c.annualGapUsd) : "$••,•••"}
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
      </LockCard>
    </TileShell>
  );
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

// Ordinal suffix: 1st, 2nd, 3rd, 4th… 11th/12th/13th, 21st, 22nd…
function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return "th";
  switch (n % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}
