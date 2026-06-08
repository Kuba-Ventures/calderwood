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

function CheckIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <circle cx="10" cy="10" r="9" fill="currentColor" opacity="0.15" />
      <path
        d="M6 10.5l2.5 2.5L14 7.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`animate-spin ${className}`}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.2" opacity="0.2" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

// Post-checkout confirmation, shown only when returning from Stripe (?paid=1).
// The unlock itself is webhook-driven, so there's a brief window where payment
// is captured but paid_at isn't stamped yet — we surface that state instead of
// leaving the buyer staring at a silent page. Flips to success automatically
// once useReport's poll sees unlocked.
export function PaymentConfirmation({ unlocked }: { unlocked: boolean }) {
  if (unlocked) {
    return (
      <div
        role="status"
        className="rounded-xl border border-gain/30 bg-gain-soft px-6 py-4 shadow-sm"
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-gain-ink">
            <CheckIcon />
          </span>
          <div>
            <p className="text-base font-semibold text-gain-ink">
              Payment successful — your full report is unlocked.
            </p>
            <p className="mt-0.5 text-sm text-ink-600">
              Every carrier and code-level number is now live below, and your PDF
              is ready to download.
            </p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div
      role="status"
      className="rounded-xl border border-accent/20 bg-accent/5 px-6 py-4 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-accent-ink">
          <Spinner />
        </span>
        <div>
          <p className="text-base font-semibold text-accent-ink">
            Payment received — finalizing your report…
          </p>
          <p className="mt-0.5 text-sm text-ink-500">
            This takes a few seconds. Your full numbers will appear
            automatically — no need to refresh.
          </p>
        </div>
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
