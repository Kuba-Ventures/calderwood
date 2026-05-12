"use client";

// Reports owns report status. Pending intakes show the pizza-style
// pipeline tracker. Delivered reports show the full deep-dive (summary
// cards, carrier ranking, code-level table). The compact history table
// lists past + current reports.

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CarrierRow,
  Intake,
  Report,
  account,
  formatDateTime,
  intake,
  report,
} from "@/lib/storage";
import { PipelineTracker } from "@/components/dashboard/pipeline-tracker";
import {
  CarrierRankingChart,
  CodeGapTable,
  SummaryCards,
} from "@/components/dashboard/report-charts";

export default function ReportsPage() {
  const [hydrated, setHydrated] = useState(false);
  const [currentIntake, setCurrentIntake] = useState<Intake | null>(null);
  const [currentReport, setCurrentReport] = useState<Report | null>(null);
  const [primaryEmail, setPrimaryEmail] = useState("");

  useEffect(() => {
    setCurrentIntake(intake.get());
    setCurrentReport(report.get());
    setPrimaryEmail(account.get()?.primaryEmail || "");
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return <div className="text-sm text-ink-400">Loading...</div>;
  }

  if (!currentIntake) return <EmptyReports />;

  if (currentReport?.state === "delivered") {
    return (
      <DeliveredView
        deliveredAt={currentReport.deliveredAt}
        primaryEmail={primaryEmail}
        intake={currentIntake}
        data={currentReport.data}
      />
    );
  }

  return (
    <PendingView
      submittedAt={currentIntake.submittedAt}
      primaryEmail={primaryEmail}
    />
  );
}

function EmptyReports() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-xl border border-canvas-border bg-canvas px-8 py-16 text-center shadow-sm">
        <h2 className="text-2xl font-semibold tracking-tighter2 text-ink-900">
          No reports yet.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-ink-500">
          Your reports will appear here after your first intake. Most practices
          re-run quarterly to track contract renegotiations.
        </p>
        <div className="mt-6">
          <Link
            href="/intake"
            className="inline-flex items-center justify-center rounded-md bg-ink-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-ink-700"
          >
            Start intake →
          </Link>
        </div>
      </div>
    </div>
  );
}

function PendingView({
  submittedAt,
  primaryEmail,
}: {
  submittedAt: string;
  primaryEmail: string;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-xl border border-canvas-border bg-canvas px-8 py-10 shadow-sm sm:px-12 sm:py-12">
        <h2 className="text-3xl font-semibold tracking-tighter2 text-ink-900 sm:text-4xl">
          Your report is being built.
        </h2>

        <div className="mt-4 rounded-md border border-accent/20 bg-accent/5 px-4 py-3 text-sm text-accent-ink">
          The PDF will be sent to{" "}
          <span className="font-semibold">
            {primaryEmail || "your account email"}
          </span>
          .{" "}
          {!primaryEmail && (
            <Link href="/account" className="underline hover:no-underline">
              Add your email
            </Link>
          )}
        </div>

        <div className="mt-6">
          <PipelineTracker submittedAt={submittedAt} />
        </div>

        <p className="mt-8 text-sm text-ink-500">
          When your report lands, you&rsquo;ll see the full carrier ranking and
          code-level table here, plus an at-a-glance summary on your{" "}
          <Link href="/dashboard" className="text-accent hover:underline">
            dashboard
          </Link>
          . The PDF is for your records.
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

      <HistoryTable
        rows={[
          {
            submittedAt,
            status: "Processing",
          },
        ]}
        primaryEmail={primaryEmail}
      />
    </div>
  );
}

function DeliveredView({
  deliveredAt,
  primaryEmail,
  intake,
  data,
}: {
  deliveredAt?: string;
  primaryEmail: string;
  intake: Intake;
  data?: import("@/lib/storage").ReportData;
}) {
  const [selectedCarrier, setSelectedCarrier] = useState<CarrierRow | null>(
    null
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tighter2 text-ink-900 sm:text-4xl">
            Your report.
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

      <HistoryTable
        rows={[
          {
            submittedAt: intake.submittedAt,
            status: "Delivered",
            deliveredAt,
          },
        ]}
        primaryEmail={primaryEmail}
      />
    </div>
  );
}

type HistoryRow = {
  submittedAt: string;
  status: "Processing" | "Delivered";
  deliveredAt?: string;
};

function HistoryTable({
  rows,
  primaryEmail,
}: {
  rows: HistoryRow[];
  primaryEmail: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-canvas-border bg-canvas shadow-sm">
      <div className="border-b border-canvas-border px-6 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">
          History
        </p>
      </div>
      <table className="w-full text-sm">
        <thead className="border-b border-canvas-border bg-canvas-tint text-left text-xs uppercase tracking-wide text-ink-400">
          <tr>
            <th className="px-6 py-3 font-medium">Date submitted</th>
            <th className="px-6 py-3 font-medium">Status</th>
            <th className="px-6 py-3 text-right font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="border-t border-canvas-border">
              <td className="px-6 py-4 text-ink-900">
                {formatDateTime(row.submittedAt)}
              </td>
              <td className="px-6 py-4">
                <StatusPill status={row.status} />
                {row.status === "Delivered" && row.deliveredAt && (
                  <span className="ml-2 text-xs text-ink-400">
                    {formatDateTime(row.deliveredAt)}
                  </span>
                )}
              </td>
              <td className="px-6 py-4 text-right">
                {row.status === "Delivered" ? (
                  <a
                    href={`mailto:hello@calderwoodtech.com?subject=Re-send%20my%20Calderwood%20report${
                      primaryEmail
                        ? `&body=Practice%20email%3A%20${encodeURIComponent(primaryEmail)}`
                        : ""
                    }`}
                    className="text-sm font-medium text-accent hover:underline"
                  >
                    Email me the PDF
                  </a>
                ) : (
                  <span className="text-sm text-ink-400">In progress</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusPill({ status }: { status: "Processing" | "Delivered" }) {
  const className =
    status === "Delivered"
      ? "bg-gain-soft text-gain-ink"
      : "bg-accent/10 text-accent-ink";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {status}
    </span>
  );
}
