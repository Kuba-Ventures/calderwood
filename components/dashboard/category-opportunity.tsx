"use client";

// Section: opportunity by procedure category. Navy bars showing recoverable as
// a share of each category's annual production, with the dollar figure beside.

import { formatPct, formatUsd } from "@/lib/storage";
import type { CategoryRollup } from "@/lib/report/gate";
import { LockedInline } from "@/components/report/lock-overlay";

export function CategoryOpportunity({
  categories,
  unlocked = true,
}: {
  categories: CategoryRollup[];
  unlocked?: boolean;
}) {
  if (!categories || categories.length === 0) return null;
  const max = Math.max(...categories.map((c) => c.pct), 0.0001);
  return (
    <div className="rounded-xl border border-canvas-border bg-canvas px-6 py-6 shadow-sm">
      <h3 className="text-base font-semibold text-ink-900">
        Opportunity by category
      </h3>
      <p className="mt-1 text-xs text-ink-500">
        Recoverable revenue as a share of each category&rsquo;s annual production.
      </p>
      <div className="mt-5 space-y-3">
        {categories.map((c) => (
          <div
            key={c.name}
            className="grid grid-cols-[110px_1fr_88px] items-center gap-3 sm:grid-cols-[160px_1fr_112px]"
          >
            <div className="text-sm text-ink-700">{c.name}</div>
            <div className="h-3.5 overflow-hidden rounded-full bg-canvas-tint2">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${unlocked ? Math.max(3, (c.pct / max) * 100) : 42}%` }}
              />
            </div>
            <div className="text-right">
              <div className="font-serif text-sm text-accent-ink">
                <LockedInline unlocked={unlocked}>
                  {formatUsd(c.recoverable)}
                </LockedInline>
              </div>
              <div className="text-[10px] text-ink-400">
                {unlocked ? `${formatPct(c.pct, 1)} of production` : "of production"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
