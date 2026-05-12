"use client";

// Dashboard is the at-a-glance home. Three states:
//   1. No intake yet         -> hero CTA + empty placeholder tiles
//   2. Pending report        -> brief status banner (link to /reports for
//                               the live tracker) + empty placeholder tiles
//   3. Delivered             -> populated tiles + "View full report" link
//
// The pipeline tracker and full deep-dive (carrier ranking, code-level
// table) live on /reports. Submit on /intake redirects there.
//
// State 3 is unlocked by visiting /dashboard?ready=1. Append &demo=1 to
// load sample chart data. Real backend ownership replaces this.

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
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
import { GlanceTiles } from "@/components/dashboard/glance-tiles";

export default function DashboardPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [hydrated, setHydrated] = useState(false);
  const [currentIntake, setCurrentIntake] = useState<Intake | null>(null);
  const [currentReport, setCurrentReport] = useState<Report | null>(null);
  const [firstName, setFirstName] = useState("");

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
    setFirstName(account.get()?.firstName?.trim() ?? "");
    setHydrated(true);
  }, [params, router]);

  if (!hydrated) {
    return <div className="text-sm text-ink-400">Loading...</div>;
  }

  const greeting = firstName ? `Welcome back, ${firstName}.` : "Welcome.";

  if (!currentIntake) return <StateNoIntake greeting={greeting} />;
  if (currentReport?.state === "delivered") {
    return (
      <StateDelivered
        greeting={greeting}
        deliveredAt={currentReport.deliveredAt}
        data={currentReport.data ?? null}
      />
    );
  }
  return (
    <StatePending
      greeting={greeting}
      submittedAt={currentIntake.submittedAt}
    />
  );
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
          <Link href="/intake" className="text-accent hover:underline">
            Start your intake →
          </Link>
        }
      />
      <div className="rounded-xl border border-canvas-border bg-canvas px-8 py-10 shadow-sm">
        <h3 className="text-xl font-semibold tracking-tightish text-ink-900">
          Let&rsquo;s build your benchmark report.
        </h3>
        <p className="mt-2 text-sm text-ink-500">
          Five minutes of intake. Report in 24 hours.
        </p>
        <div className="mt-5">
          <Link
            href="/intake"
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

function StatePending({
  greeting,
  submittedAt,
}: {
  greeting: string;
  submittedAt: string;
}) {
  const eta = expectedDelivery(submittedAt);
  return (
    <div className="space-y-8">
      <PageHeader
        greeting={greeting}
        status={
          <Link
            href="/reports"
            className="text-accent hover:underline"
          >
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
              Submitted {formatDateTime(submittedAt)} &middot; Expected{" "}
              {formatDateTime(eta.toISOString())}
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
  deliveredAt,
  data,
}: {
  greeting: string;
  deliveredAt?: string;
  data: ReportData | null;
}) {
  return (
    <div className="space-y-8">
      <PageHeader
        greeting={greeting}
        status={
          <span>
            Report delivered{" "}
            {deliveredAt ? formatDateTime(deliveredAt) : ""}.{" "}
            <Link href="/reports" className="text-accent hover:underline">
              View full report →
            </Link>
          </span>
        }
      />
      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-ink-400">
          At a glance
        </p>
        <GlanceTiles data={data} />
      </div>
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
