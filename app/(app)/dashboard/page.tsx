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

function StatePending({
  submittedAt,
  email,
}: {
  submittedAt: string;
  email: string;
}) {
  const eta = useMemo(() => expectedDelivery(submittedAt), [submittedAt]);
  // Active step: rough mapping by elapsed time so the UI shows progress
  // through the 24h window. With Supabase-backed state, this becomes real.
  const stepIndex = useMemo(() => {
    const elapsed = Date.now() - new Date(submittedAt).getTime();
    const hours = elapsed / 1000 / 60 / 60;
    if (hours < 6) return 1;
    if (hours < 14) return 2;
    if (hours < 22) return 3;
    return 3;
  }, [submittedAt]);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-xl border border-canvas-border bg-canvas px-8 py-10 shadow-sm sm:px-12 sm:py-12">
        <h2 className="text-3xl font-semibold tracking-tighter2 text-ink-900 sm:text-4xl">
          Your report is being built.
        </h2>
        <p className="mt-3 text-base text-ink-500">
          Submitted {formatDateTime(submittedAt)}. Expected delivery{" "}
          {formatDateTime(eta.toISOString())}.
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

        <ol className="mt-8 space-y-3">
          <ProgressStep label="Intake received" state={stepIndex > 0 ? "done" : "active"} />
          <ProgressStep
            label="Benchmarking against UCR data"
            state={stepIndex > 1 ? "done" : stepIndex === 1 ? "active" : "pending"}
          />
          <ProgressStep
            label="Code-level analysis"
            state={stepIndex > 2 ? "done" : stepIndex === 2 ? "active" : "pending"}
          />
          <ProgressStep
            label="Carrier ranking & PDF generation"
            state={stepIndex > 3 ? "done" : stepIndex === 3 ? "active" : "pending"}
          />
        </ol>

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

function ProgressStep({
  label,
  state,
}: {
  label: string;
  state: "done" | "active" | "pending";
}) {
  return (
    <li className="flex items-center gap-3">
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
          state === "done"
            ? "bg-gain text-white"
            : state === "active"
            ? "bg-accent/10 text-accent"
            : "bg-canvas-tint2 text-ink-300"
        }`}
        aria-hidden="true"
      >
        {state === "done" ? "✓" : state === "active" ? "·" : "○"}
      </span>
      <span
        className={`text-sm ${
          state === "done"
            ? "text-ink-700"
            : state === "active"
            ? "font-medium text-ink-900"
            : "text-ink-400"
        }`}
      >
        {label}
        {state === "active" && (
          <span className="ml-2 inline-block animate-pulse text-xs text-accent">
            in progress
          </span>
        )}
      </span>
    </li>
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
