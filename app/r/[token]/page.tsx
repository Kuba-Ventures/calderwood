// Public, read-only shared report at /r/<token>. Anyone with the secret link
// can view; no login, no account, no settings/billing. Looked up server-side by
// the practice's share_token with the service client. Mirrors the owner's paid
// state (hidden figures if not yet unlocked).

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { serviceSupabase } from "@/lib/db/server";
import { getReportByPracticeId } from "@/lib/db/practices";
import type { PracticeRow } from "@/lib/db/practices";
import { toGatedReport } from "@/lib/report/gate";
import {
  CarrierRankingChart,
  CodeGapTable,
  SummaryCards,
} from "@/components/dashboard/report-charts";
import { CarrierAnalysis } from "@/components/dashboard/carrier-analysis";
import { CategoryOpportunity } from "@/components/dashboard/category-opportunity";
import { ReportMethodology } from "@/components/dashboard/report-methodology";

export const dynamic = "force-dynamic";

// Secret-link pages shouldn't be indexed.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function SharedReportPage({
  params,
}: {
  params: { token: string };
}) {
  const service = serviceSupabase();
  const { data } = await service
    .from("practices")
    .select("*")
    .eq("share_token", params.token)
    .maybeSingle();
  if (!data) notFound();
  const practice = data as PracticeRow;

  const report = await getReportByPracticeId(service, practice.id);
  if (!report) notFound();

  const unlocked = practice.paid_at != null;
  const gated = toGatedReport(report.computation_output, practice.zip5, unlocked);

  return (
    <main className="min-h-screen bg-canvas-tint">
      <div className="mx-auto max-w-5xl space-y-6 px-6 py-10 sm:px-8 sm:py-12">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-400">
            Shared report · read-only
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tighter2 text-ink-900 sm:text-4xl">
            {practice.practice_name ?? "Fee assessment"}
          </h1>
          <p className="mt-2 text-sm text-ink-500">
            Benchmarked against UCR in ZIP {practice.zip5}.
          </p>
        </div>

        {!unlocked && (
          <div className="rounded-xl border border-accent/20 bg-accent/5 px-6 py-4 text-sm text-accent-ink">
            This report hasn&rsquo;t been unlocked yet, so the dollar figures are
            hidden.
          </div>
        )}

        <SummaryCards data={gated} unlocked={unlocked} />
        {unlocked && gated.carrierGrid?.hasData ? (
          <CarrierAnalysis grid={gated.carrierGrid} />
        ) : (
          <CarrierRankingChart carriers={gated.carriers} unlocked={unlocked} />
        )}
        <CodeGapTable codes={gated.codes} unlocked={unlocked} />
        <CategoryOpportunity categories={gated.categories} unlocked={unlocked} />
        {unlocked && <ReportMethodology />}

        <p className="pt-2 text-center text-xs text-ink-400">
          Shared via New Fee Schedule ·{" "}
          <a href="/" className="text-accent hover:underline">
            newfeeschedule.com
          </a>
        </p>
      </div>
    </main>
  );
}
