"use client";

// Report section: fee variance across providers. The same code billed at
// different fees by different providers; aligning everyone up to the highest
// in-house fee is recoverable. Highest fee bar is green.

import { formatUsd } from "@/lib/storage";
import type { ProviderVarianceRow } from "@/lib/report/gate";
import { LockedInline } from "@/components/report/lock-overlay";

const usd2 = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

export function ProviderVariance({
  rows,
  unlocked = true,
}: {
  rows: ProviderVarianceRow[];
  unlocked?: boolean;
}) {
  if (!rows || rows.length === 0) return null;
  const top = rows.slice(0, 6);
  return (
    <div className="rounded-xl border border-canvas-border bg-canvas px-6 py-6 shadow-sm">
      <h3 className="text-base font-semibold text-ink-900">Fee variance across providers</h3>
      <p className="mt-1 text-xs text-ink-500">
        The same code billed at different fees by different providers. Aligning
        everyone to your highest in-house fee is recoverable revenue.
      </p>
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {top.map((r) => {
          const hi = Math.max(...r.providers.map((p) => p.fee), 0);
          return (
            <div key={r.code} className="rounded-lg border border-canvas-border p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-sm font-bold text-accent">{r.code}</span>
                  <span className="ml-2 text-xs text-ink-500">{r.label}</span>
                </div>
                <span className="shrink-0 font-serif text-sm text-red-800">
                  <LockedInline unlocked={unlocked}>{formatUsd(r.recoverable)}</LockedInline>
                </span>
              </div>
              <div className="mt-3 space-y-1.5">
                {r.providers.map((p) => (
                  <div key={p.provider} className="grid grid-cols-[64px_1fr_56px] items-center gap-2">
                    <span className="text-[11px] text-ink-500">{p.provider}</span>
                    <div className="h-2.5 overflow-hidden rounded-full bg-canvas-tint2">
                      <div
                        className={`h-full rounded-full ${unlocked && p.fee === hi && hi > 0 ? "bg-gain" : "bg-accent"}`}
                        style={{ width: unlocked && hi > 0 ? `${(p.fee / hi) * 100}%` : "45%" }}
                      />
                    </div>
                    <span className="text-right font-serif text-[12px] text-ink-900">
                      <LockedInline unlocked={unlocked}>{usd2(p.fee)}</LockedInline>
                    </span>
                  </div>
                ))}
              </div>
              {unlocked && (
                <div className="mt-2 text-[11px] text-ink-400">
                  Spread {usd2(r.spread)} per procedure · highest in-house fee in{" "}
                  <span className="text-gain-ink">green</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
