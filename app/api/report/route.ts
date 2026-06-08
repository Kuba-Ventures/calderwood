// GET /api/report — the gated report read. Single source of truth for what the
// dashboard/reports pages render.
//
// Auth: session-scoped (serverSupabase identifies the user). The report's
// computation_output is read with the SERVICE client and redacted by
// toGatedReport before returning, so the locked dollar figures are never
// serialized to the browser unless practices.paid_at is set. The client reads
// status for the tracker but NEVER the raw computation_output.

import { NextResponse } from "next/server";
import { serverSupabase, serviceSupabase } from "@/lib/db/server";
import { getPracticeByEmail, getReportByPracticeId } from "@/lib/db/practices";
import { toGatedReport } from "@/lib/report/gate";

export const dynamic = "force-dynamic";

export async function GET() {
  const sb = serverSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const service = serviceSupabase();
  const practice = await getPracticeByEmail(service, user.email);
  if (!practice) {
    return NextResponse.json({ status: "none", report: null });
  }

  const unlocked = practice.paid_at != null;
  const base = {
    status: practice.status,
    unlocked,
    practice: {
      practiceName: practice.practice_name,
      zip: practice.zip5,
      providerBucket: practice.provider_count_bucket,
      feeInputMethod: practice.fee_input_method,
      createdAt: practice.created_at,
    },
  };

  if (practice.status !== "report_ready" && practice.status !== "delivered") {
    return NextResponse.json({ ...base, report: null, pdfUrl: null });
  }

  const report = await getReportByPracticeId(service, practice.id);
  if (!report) {
    return NextResponse.json({ ...base, report: null, pdfUrl: null });
  }

  const gated = toGatedReport(report.computation_output, practice.zip5, unlocked);
  return NextResponse.json({
    ...base,
    report: gated,
    // The PDF contains everything — only hand it over once paid.
    pdfUrl: unlocked ? report.pdf_url : null,
  });
}
