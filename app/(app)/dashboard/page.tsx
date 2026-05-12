"use client";

// Dashboard has three states:
//   1. No intake submitted          ->  "Let's build your benchmark report"
//   2. Intake submitted, pending    ->  "Your report is being built" + 4-step
//   3. Delivered                    ->  Summary cards + interactive charts +
//                                       code table. PDF stays in email.
//
// Without a backend, State 3 is unlocked by visiting /dashboard?ready=1.
// Append &demo=1 to load sample chart data so the dashboard demo isn't empty.
// When real fulfillment runs, push real ReportData via Supabase and drop
// this URL mechanism.

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  CarrierRow,
  Intake,
  Report,
  ReportData,
  account,
  expectedDelivery,
  formatDateTime,
  intake,
  report,
} from "@/lib/storage";
import { getSampleReportData } from "@/lib/sample-report-data";
import {
  CarrierRankingChart,
  CodeGapTable,
  SummaryCards,
} from "@/components/dashboard/report-charts";

export default function DashboardPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [hydrated, setHydrated] = useState(false);
  const [currentIntake, setCurrentIntake] = useState<Intake | null>(null);
  const [currentReport, setCurrentReport] = useState<Report | null>(null);
  const [primaryEmail, setPrimaryEmail] = useState("");

  useEffect(() => {
    if (params.get("ready") === "1") {
      const data =
        params.get("demo") === "1"
          ? getSampleReportData(intake.get()?.zip || "94110")
          : undefined;
      report.markDelivered(data);
      router.replace("/dashboard");
      return;
    }
    if (params.get("demo") === "1") {
      const data = getSampleReportData(intake.get()?.zip || "94110");
      report.set({
        state: "delivered",
        deliveredAt: new Date().toISOString(),
        data,
      });
      router.replace("/dashboard");
      return;
    }
    setCurrentIntake(intake.get());
    setCurrentReport(report.get());
    setPrimaryEmail(account.get()?.primaryEmail || "");
    setHydrated(true);
  }, [params, router]);

  if (!hydrated) {
    return <div className="text-sm text-ink-400">Loading...</div>;
  }

  if (!currentIntake) return <StateNoIntake />;
  if (currentReport?.state === "delivered") {
    return (
      <StateDelivered
        deliveredAt={currentReport.deliveredAt}
        primaryEmail={primaryEmail}
        data={currentReport.data}
      />
    );
  }
  return (
    <StatePending submittedAt={currentIntake.submittedAt} email={primaryEmail} />
  );
}

function StateNoIntake() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-xl border border-canvas-border bg-canvas px-8 py-12 text-center shadow-sm sm:px-12 sm:py-16">
        <h2 className="text-3xl font-semibold tracking-tighter2 text-ink-900 sm:text-4xl">
          Let&rsquo;s build your benchmark report.
        </h2>
        <p className="mt-3 text-base text-ink-500 sm:text-lg">
          Five minutes of intake. Report in 24 hours.
        </p>
        <div className="mt-8">
          <Link
            href="/intake"
            className="inline-flex items-center justify-center rounded-md bg-ink-900 px-6 py-3.5 text-base font-medium text-white shadow-sm transition hover:bg-ink-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
          >
            Start intake →
          </Link>
        </div>
      </div>
      <p className="mt-6 text-center text-sm text-ink-400">
        Need help?{" "}
        <a
          href="mailto:hello@calderwoodtech.com"
          className="text-ink-700 hover:text-ink-900"
        >
          hello@calderwoodtech.com
        </a>
      </p>
    </div>
  );
}

const PIPELINE_STAGES = [
  { label: "Intake received", short: "Received" },
  { label: "Benchmarking", short: "Benchmark" },
  { label: "Code analysis", short: "Analysis" },
  { label: "PDF generation", short: "PDF" },
] as const;

function StatePending({
  submittedAt,
  email,
}: {
  submittedAt: string;
  email: string;
}) {
  const eta = useMemo(() => expectedDelivery(submittedAt), [submittedAt]);
  const totalMs = useMemo(
    () => eta.getTime() - new Date(submittedAt).getTime(),
    [eta, submittedAt]
  );

  // Tick every 30s so the bar visibly creeps without burning cycles.
  // Real backend status replaces this when Supabase lands.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const elapsed = Math.max(0, now - new Date(submittedAt).getTime());
  // Intake is "received" the instant the user submits, so the bar starts
  // 25% in and grows the remaining 75% across the 24h window. Makes
  // submission feel like real progress instead of a fresh empty bar.
  const BASE = 1 / PIPELINE_STAGES.length;
  const progress = Math.min(0.99, BASE + (1 - BASE) * (elapsed / totalMs));
  const activeIndex = Math.min(
    PIPELINE_STAGES.length - 1,
    Math.floor(progress * PIPELINE_STAGES.length)
  );
  const remainingMs = Math.max(0, totalMs - elapsed);
  const etaLabel = formatRemaining(remainingMs);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-xl border border-canvas-border bg-canvas px-8 py-10 shadow-sm sm:px-12 sm:py-12">
        <h2 className="text-3xl font-semibold tracking-tighter2 text-ink-900 sm:text-4xl">
          Your report is being built.
        </h2>
        <p className="mt-3 text-base text-ink-500">
          Submitted {formatDateTime(submittedAt)}. Expected delivery{" "}
          {formatDateTime(eta.toISOString())}
          {remainingMs > 0 ? ` (${etaLabel})` : ""}.
        </p>

        <div className="mt-6 rounded-md border border-accent/20 bg-accent/5 px-4 py-3 text-sm text-accent-ink">
          The PDF will be sent to{" "}
          <span className="font-semibold">
            {email || "your account email"}
          </span>
          .{" "}
          {!email && (
            <Link href="/account" className="underline hover:no-underline">
              Add your email
            </Link>
          )}
        </div>

        <PipelineTracker progress={progress} activeIndex={activeIndex} />

        <p className="mt-8 text-sm text-ink-500">
          When your report lands, you&rsquo;ll see interactive carrier and
          code-level breakdowns right here on the dashboard. The PDF is for
          your records.
        </p>
        <div className="mt-6">
          <Link
            href="/intake?view=1"
            className="text-sm font-medium text-accent hover:underline"
          >
            View submitted intake →
          </Link>
        </div>
      </div>
    </div>
  );
}

function PipelineTracker({
  progress,
  activeIndex,
}: {
  progress: number;
  activeIndex: number;
}) {
  return (
    <div className="mt-10">
      <div className="relative px-3 sm:px-5">
        {/* Track */}
        <div className="absolute left-3 right-3 top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full bg-canvas-tint2 sm:left-5 sm:right-5" />
        {/* Fill */}
        <div
          className="absolute left-3 top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full bg-accent transition-[width] duration-1000 ease-out sm:left-5"
          style={{ width: `calc((100% - 1.5rem) * ${progress})` }}
        />
        {/* Stage dots */}
        <ol className="relative flex items-center justify-between">
          {PIPELINE_STAGES.map((stage, i) => {
            const state =
              i < activeIndex ? "done" : i === activeIndex ? "active" : "pending";
            return (
              <li key={stage.label} className="flex flex-col items-center">
                <span
                  className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold shadow-sm transition ${
                    state === "done"
                      ? "border-accent bg-accent text-white"
                      : state === "active"
                      ? "border-accent bg-canvas text-accent"
                      : "border-canvas-border bg-canvas text-ink-300"
                  }`}
                >
                  {state === "done" ? (
                    <CheckIcon />
                  ) : (
                    <StageIcon index={i} muted={state === "pending"} />
                  )}
                  {state === "active" && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 animate-ping rounded-full border-2 border-accent opacity-50"
                    />
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
      {/* Labels */}
      <ol className="mt-3 grid grid-cols-4 text-center">
        {PIPELINE_STAGES.map((stage, i) => {
          const state =
            i < activeIndex ? "done" : i === activeIndex ? "active" : "pending";
          return (
            <li key={stage.label}>
              <p
                className={`text-xs sm:text-sm ${
                  state === "active"
                    ? "font-semibold text-accent-ink"
                    : state === "done"
                    ? "font-medium text-ink-700"
                    : "text-ink-400"
                }`}
              >
                <span className="hidden sm:inline">{stage.label}</span>
                <span className="sm:hidden">{stage.short}</span>
              </p>
              {state === "active" && (
                <p className="mt-0.5 text-[11px] uppercase tracking-wide text-accent">
                  In progress
                </p>
              )}
              {state === "done" && (
                <p className="mt-0.5 text-[11px] uppercase tracking-wide text-ink-400">
                  Done
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function StageIcon({ index, muted }: { index: number; muted: boolean }) {
  const cls = muted ? "stroke-ink-300" : "stroke-accent";
  switch (index) {
    case 0: // Intake received: clipboard
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="3.5" y="2.5" width="9" height="11" rx="1" className={cls} strokeWidth="1.5" />
          <path d="M5.5 2.5h5v2h-5z" className={cls} strokeWidth="1.5" />
          <path d="M5.5 8h5M5.5 10.5h3" className={cls} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 1: // Benchmarking: bar chart
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3 13.5v-4M7 13.5v-7M11 13.5v-9" className={cls} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M2 13.5h12" className={cls} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 2: // Code analysis: magnifier
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="7" cy="7" r="3.5" className={cls} strokeWidth="1.5" />
          <path d="M9.8 9.8l3.2 3.2" className={cls} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 3: // PDF generation: document with check
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3.5 2.5h6l3 3v8h-9z" className={cls} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M9.5 2.5v3h3" className={cls} strokeWidth="1.5" />
        </svg>
      );
    default:
      return null;
  }
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M3 7.5l2.5 2.5L11 4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return "any minute";
  const totalMin = Math.round(ms / 1000 / 60);
  if (totalMin < 60) return `~${totalMin} min left`;
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours >= 24) return "less than 24 hr left";
  if (mins === 0) return `~${hours} hr left`;
  return `~${hours} hr ${mins} min left`;
}

function StateDelivered({
  deliveredAt,
  primaryEmail,
  data,
}: {
  deliveredAt?: string;
  primaryEmail: string;
  data?: ReportData;
}) {
  const [selectedCarrier, setSelectedCarrier] = useState<CarrierRow | null>(
    null
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tighter2 text-ink-900 sm:text-4xl">
            Your report is ready.
          </h2>
          <p className="mt-2 text-sm text-ink-500">
            {deliveredAt ? `Delivered ${formatDateTime(deliveredAt)}.` : ""}{" "}
            PDF sent to {primaryEmail || "your account email"}.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <a
            href={`mailto:hello@calderwoodtech.com?subject=Re-send%20my%20Calderwood%20report${
              primaryEmail
                ? `&body=Practice%20email%3A%20${encodeURIComponent(primaryEmail)}`
                : ""
            }`}
            className="inline-flex items-center justify-center rounded-md bg-ink-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-ink-700"
          >
            Email me the PDF again
          </a>
          <span
            className="inline-flex items-center justify-center rounded-md border border-canvas-border bg-canvas-tint px-5 py-2.5 text-sm font-medium text-ink-400"
            title="Re-runs available quarterly. Contact us."
          >
            Request a re-run
          </span>
        </div>
      </div>

      {data ? (
        <>
          <SummaryCards data={data} />
          <CarrierRankingChart
            carriers={data.carriers}
            selected={selectedCarrier?.name ?? null}
            onSelect={setSelectedCarrier}
          />
          <CodeGapTable codes={data.codes} filterCarrier={selectedCarrier} />
        </>
      ) : (
        <div className="rounded-xl border border-canvas-border bg-canvas px-8 py-10 text-center shadow-sm">
          <p className="text-sm text-ink-500">
            Interactive breakdown is loading from the backend. The PDF in your
            inbox has all the details.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-canvas-border bg-canvas px-6 py-6 shadow-sm">
        <h3 className="text-base font-semibold text-ink-900">
          What&rsquo;s next?
        </h3>
        <ul className="mt-4 space-y-3 text-sm text-ink-700">
          <li className="flex gap-3">
            <Bullet />
            <span>
              {data
                ? `Open ${data.worstCarrier.name} first. They're your single biggest gap.`
                : "Use the carrier ranking to prioritize your renegotiation call."}{" "}
              Call your provider rep and ask for the published UCR rates.
            </span>
          </li>
          <li className="flex gap-3">
            <Bullet />
            <span>
              Want help running the call? A 30-minute strategy session is $299.{" "}
              <a
                href="mailto:hello@calderwoodtech.com?subject=Strategy%20call"
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
