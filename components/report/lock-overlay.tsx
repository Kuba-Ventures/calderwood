"use client";

// Paywall treatments shared across the dashboard + reports surfaces.
//   LockedInline — blurred placeholder for a single gated value (table cells).
//   LockCard     — blurs a whole card/tile and overlays an "Unlock to view" CTA.
//   UnlockBanner — the headline "report is ready, unlock for $199" prompt.
//
// The real gated numbers are zeroed server-side (see lib/report/gate.ts), so
// these only ever render dummy/blurred content when locked.

import { formatUsd } from "@/lib/storage";

function LockIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <rect
        x="3.5"
        y="7"
        width="9"
        height="6.5"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="M5.5 7V5.5a2.5 2.5 0 0 1 5 0V7"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LockedInline({
  unlocked,
  children,
  placeholder = "$••,•••",
}: {
  unlocked: boolean;
  children: React.ReactNode;
  placeholder?: string;
}) {
  if (unlocked) return <>{children}</>;
  return (
    <span
      className="select-none text-ink-300 blur-[3px]"
      aria-label="Locked — unlock to view"
    >
      {placeholder}
    </span>
  );
}

export function LockCard({
  unlocked,
  onUnlock,
  busy,
  children,
}: {
  unlocked: boolean;
  onUnlock?: () => void;
  busy?: boolean;
  children: React.ReactNode;
}) {
  if (unlocked) return <>{children}</>;
  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-[5px]" aria-hidden="true">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <button
          type="button"
          onClick={onUnlock}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-md border border-canvas-border bg-canvas/95 px-3 py-1.5 text-xs font-medium text-ink-700 shadow-sm transition hover:bg-canvas disabled:opacity-60"
        >
          <LockIcon /> Unlock to view
        </button>
      </div>
    </div>
  );
}

export function UnlockBanner({
  teaserUsd,
  onUnlock,
  busy,
}: {
  teaserUsd: number;
  onUnlock?: () => void;
  busy?: boolean;
}) {
  return (
    <div className="rounded-xl border border-accent/20 bg-accent/5 px-6 py-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-base font-semibold text-accent-ink">
            Your report is ready
            {teaserUsd > 0
              ? ` — we found ${formatUsd(teaserUsd)}+ in annual opportunity.`
              : "."}
          </p>
          <p className="mt-1 text-sm text-ink-500">
            Unlock the full code-by-code breakdown and carrier ranking.
          </p>
        </div>
        <button
          type="button"
          onClick={onUnlock}
          disabled={busy}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md bg-ink-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-ink-700 disabled:opacity-60"
        >
          <LockIcon className="h-4 w-4" />
          {busy ? "Starting checkout…" : "Unlock the full report — $199"}
        </button>
      </div>
    </div>
  );
}
