"use client";

// Dashboard is the at-a-glance home, driven by the real report job (useReport):
//   1. No practice yet  -> hero CTA into onboarding + empty placeholder tiles
//   2. Processing        -> status banner (live tracker on /reports) + skeletons
//   3. Report ready      -> glance tiles, gated until paid, with an unlock banner
//
// The deep-dive (carrier ranking, code table) lives on /reports. All gated
// numbers come from /api/report already redacted; this page never sees the raw
// figures pre-payment.

import Link from "next/link";
import { useEffect, useState } from "react";
import { useReport } from "@/lib/client/use-report";
import { GlanceTiles } from "@/components/dashboard/glance-tiles";
import {
  PaymentConfirmation,
  UnlockBanner,
} from "@/components/report/lock-overlay";

export default function DashboardPage() {
  const { state, loading, checkingOut, startCheckout } = useReport();
  // Read once on mount (not during render) so SSR/CSR markup matches.
  const [justPaid, setJustPaid] = useState(false);
  useEffect(() => {
    setJustPaid(new URLSearchParams(window.location.search).get("paid") === "1");
  }, []);

  if (loading || !state) {
    return <div className="text-sm text-ink-400">Loading…</div>;
  }

  const firstName = state.practice?.practiceName?.trim().split(" ")[0] ?? "";
  const greeting = firstName ? `Welcome, ${firstName}.` : "Welcome.";

  if (state.status === "none") return <StateNoIntake greeting={greeting} />;

  const ready = state.status === "report_ready" || state.status === "delivered";
  if (ready && state.report) {
    return (
      <StateDelivered
        greeting={greeting}
        report={state.report}
        unlocked={state.unlocked}
        onUnlock={startCheckout}
        checkingOut={checkingOut}
        justPaid={justPaid}
      />
    );
  }

  return <StatePending greeting={greeting} />;
}

function PageHeader({
  greeting,
  status,
}: {
  greeting: string;
  status: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <h2 className="text-3xl font-semibold tracking-tighter2 text-ink-900 sm:text-4xl">
        {greeting}
      </h2>
      <div className="text-sm text-ink-500">{status}</div>
    </div>
  );
}

function StateNoIntake({ greeting }: { greeting: string }) {
  return (
    <div className="space-y-8">
      <PageHeader
        greeting={greeting}
        status={
          <Link href="/signup" className="text-accent hover:underline">
            Start your assessment →
          </Link>
        }
      />
      <div className="rounded-xl border border-canvas-border bg-canvas px-8 py-10 shadow-sm">
        <h3 className="text-xl font-semibold tracking-tightish text-ink-900">
          Let&rsquo;s build your benchmark report.
        </h3>
        <p className="mt-2 text-sm text-ink-500">
          Five minutes of intake. Your benchmarked report in minutes.
        </p>
        <div className="mt-5">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-md bg-ink-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-ink-700"
          >
            Start intake →
          </Link>
        </div>
      </div>
      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-ink-400">
          What you&rsquo;ll see here once your report lands
        </p>
        <GlanceTiles data={null} />
      </div>
    </div>
  );
}

function StatePending({ greeting }: { greeting: string }) {
  return (
    <div className="space-y-8">
      <PageHeader
        greeting={greeting}
        status={
          <Link href="/reports" className="text-accent hover:underline">
            Track report status →
          </Link>
        }
      />
      <div className="rounded-xl border border-accent/20 bg-accent/5 px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-base font-semibold text-accent-ink">
              Your report is being built.
            </p>
            <p className="mt-1 text-sm text-ink-500">
              This usually takes under a minute. No payment until it&rsquo;s
              ready.
            </p>
          </div>
          <Link
            href="/reports"
            className="inline-flex items-center justify-center rounded-md border border-accent/30 bg-canvas px-4 py-2 text-sm font-medium text-accent-ink transition hover:bg-canvas-tint"
          >
            See live tracker
          </Link>
        </div>
      </div>
      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-ink-400">
          At a glance
        </p>
        <GlanceTiles data={null} />
      </div>
    </div>
  );
}

function StateDelivered({
  greeting,
  report,
  unlocked,
  onUnlock,
  checkingOut,
  justPaid,
}: {
  greeting: string;
  report: import("@/lib/report/gate").GatedReport;
  unlocked: boolean;
  onUnlock: () => void;
  checkingOut: boolean;
  justPaid: boolean;
}) {
  return (
    <div className="space-y-8">
      <PageHeader
        greeting={greeting}
        status={
          <Link href="/reports" className="text-accent hover:underline">
            View full report →
          </Link>
        }
      />
      {/* Returning from checkout: show the payment confirmation (success once
          the webhook lands, "finalizing" while it's pending). Otherwise, the
          standard unlock prompt while still gated. */}
      {justPaid ? (
        <PaymentConfirmation unlocked={unlocked} />
      ) : (
        !unlocked && (
          <UnlockBanner
            teaserUsd={report.teaserUsd}
            onUnlock={onUnlock}
            busy={checkingOut}
          />
        )
      )}
      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-ink-400">
          At a glance
        </p>
        <GlanceTiles
          data={report}
          unlocked={unlocked}
          onUnlock={onUnlock}
          busy={checkingOut}
        />
      </div>
      <div className="rounded-xl border border-canvas-border bg-canvas px-6 py-6 shadow-sm">
        <h3 className="text-base font-semibold text-ink-900">
          What&rsquo;s next?
        </h3>
        <ul className="mt-4 space-y-3 text-sm text-ink-700">
          <li className="flex gap-3">
            <Bullet />
            <span>
              {!unlocked
                ? "Unlock your report to see which carrier to renegotiate first."
                : report.worstCarrier.name
                  ? `Open ${report.worstCarrier.name} first. Your single biggest gap.`
                  : "Start with your highest-recoverable codes in the report."}{" "}
              Call your provider rep and ask for the published UCR rates.
            </span>
          </li>
          <li className="flex gap-3">
            <Bullet />
            <span>
              Want help running the call? A 30-minute strategy session is $299.{" "}
              <a
                href="mailto:support@newfeeschedule.com?subject=Strategy%20call"
                className="text-accent hover:underline"
              >
                Book one →
              </a>
            </span>
          </li>
          <li className="flex gap-3">
            <Bullet />
            <span>
              Re-benchmark in 90 days to confirm new contracts hit the numbers
              you negotiated.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}

function Bullet() {
  return (
    <span
      aria-hidden="true"
      className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
    />
  );
}
