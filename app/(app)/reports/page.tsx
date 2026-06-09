"use client";

// Reports owns report status + the gated deep-dive. Status comes from the real
// generation job (useReport polls practices.status); the pipeline tracker
// reflects it. The full breakdown (summary cards, carrier ranking, code table)
// renders behind the paywall — numbers blurred until paid, revealed in place
// after checkout.

import Link from "next/link";
import { useState } from "react";
import { CarrierRow, formatDateTime } from "@/lib/storage";
import type { PracticeStatus } from "@/lib/types/pipeline";
import { useReport } from "@/lib/client/use-report";
import { PipelineTracker } from "@/components/dashboard/pipeline-tracker";
import {
  CarrierRankingChart,
  CodeGapTable,
  SummaryCards,
} from "@/components/dashboard/report-charts";
import { CarrierAnalysis } from "@/components/dashboard/carrier-analysis";
import { CategoryOpportunity } from "@/components/dashboard/category-opportunity";
import { ProviderVariance } from "@/components/dashboard/provider-variance";
import { ReportMethodology } from "@/components/dashboard/report-methodology";
import { UnlockBanner } from "@/components/report/lock-overlay";
import { ShareReport } from "@/components/report/share-report";

export default function ReportsPage() {
  const { state, loading, checkingOut, genError, startCheckout } = useReport();

  if (loading || !state) {
    return <div className="text-sm text-ink-400">Loading…</div>;
  }

  if (state.status === "none") return <EmptyReports />;

  const ready = state.status === "report_ready" || state.status === "delivered";
  if (ready && state.report) {
    return (
      <DeliveredView
        report={state.report}
        unlocked={state.unlocked}
        pdfUrl={state.pdfUrl}
        createdAt={state.practice?.createdAt}
        onUnlock={startCheckout}
        checkingOut={checkingOut}
      />
    );
  }

  return (
    <PendingView
      status={state.status}
      isEob={state.practice?.feeInputMethod === "eob"}
      genError={genError}
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
          Start your assessment and your benchmarked report appears here within
          minutes.
        </p>
        <div className="mt-6">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-md bg-ink-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-ink-700"
          >
            Start your assessment →
          </Link>
        </div>
      </div>
    </div>
  );
}

function PendingView({
  status,
  isEob,
  genError,
}: {
  status: PracticeStatus;
  isEob: boolean;
  genError: string | null;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-xl border border-canvas-border bg-canvas px-8 py-10 shadow-sm sm:px-12 sm:py-12">
        <h2 className="text-3xl font-semibold tracking-tighter2 text-ink-900 sm:text-4xl">
          {isEob ? "We're reading your EOB." : "Building your report."}
        </h2>

        {isEob ? (
          <div className="mt-4 rounded-md border border-accent/20 bg-accent/5 px-4 py-3 text-sm text-accent-ink">
            Your EOB is queued for our team to extract fees by hand. We&rsquo;ll
            email you the moment your report is ready. No payment until then.
          </div>
        ) : (
          <div className="mt-6">
            <PipelineTracker status={status} />
          </div>
        )}

        {genError && (
          <p className="mt-6 text-sm text-red-600">
            {genError} Please refresh, or email hello@calderwoodtech.com.
          </p>
        )}
      </div>
    </div>
  );
}

function DeliveredView({
  report,
  unlocked,
  pdfUrl,
  createdAt,
  onUnlock,
  checkingOut,
}: {
  report: import("@/lib/report/gate").GatedReport;
  unlocked: boolean;
  pdfUrl: string | null;
  createdAt?: string;
  onUnlock: () => void;
  checkingOut: boolean;
}) {
  const [selectedCarrier, setSelectedCarrier] = useState<CarrierRow | null>(null);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tighter2 text-ink-900 sm:text-4xl">
            Your report.
          </h2>
          <p className="mt-2 text-sm text-ink-500">
            {createdAt ? `Submitted ${formatDateTime(createdAt)}. ` : ""}
            Benchmarked against UCR in ZIP {report.zip}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ShareReport />
          {unlocked && pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-md bg-ink-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-ink-700"
            >
              Download PDF
            </a>
          )}
        </div>
      </div>

      {!unlocked && (
        <UnlockBanner
          teaserUsd={report.teaserUsd}
          onUnlock={onUnlock}
          busy={checkingOut}
        />
      )}

      <SummaryCards data={report} unlocked={unlocked} />
      {unlocked && report.carrierGrid?.hasData ? (
        <CarrierAnalysis grid={report.carrierGrid} />
      ) : (
        <CarrierRankingChart
          carriers={report.carriers}
          selected={selectedCarrier?.name ?? null}
          onSelect={setSelectedCarrier}
          unlocked={unlocked}
          onUnlock={onUnlock}
          busy={checkingOut}
        />
      )}
      <CodeGapTable
        codes={report.codes}
        filterCarrier={unlocked ? selectedCarrier : null}
        unlocked={unlocked}
      />
      <CategoryOpportunity categories={report.categories} unlocked={unlocked} />
      {unlocked && report.providerVariance?.length > 0 && (
        <ProviderVariance rows={report.providerVariance} unlocked={unlocked} />
      )}
      {unlocked && <ReportMethodology />}
    </div>
  );
}
