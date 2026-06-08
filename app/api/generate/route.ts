// POST /api/generate — run report generation for the signed-in user's practice.
//
// Auth: the caller must be signed in (serverSupabase, session-scoped). We match
// the practice by the authed user's email, then do the heavy work with a
// service-role client. The browser holds this request open while the status
// tracker would otherwise poll; generation advances practices.status as it goes.
//
// Idempotent + safe to re-trigger. If the report is already paid (delivered),
// we leave it alone.

import { NextResponse } from "next/server";
import { serverSupabase, serviceSupabase } from "@/lib/db/server";
import { getPracticeByEmail } from "@/lib/db/practices";
import { generateReport } from "@/lib/report/generate";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
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
    return NextResponse.json({ error: "no practice found" }, { status: 404 });
  }

  if (practice.status === "delivered") {
    return NextResponse.json({ ok: true, status: "delivered" });
  }

  try {
    const { totalAnnualUnderpayment } = await generateReport(service, practice);
    return NextResponse.json({
      ok: true,
      status: "report_ready",
      totalAnnualUnderpayment,
    });
  } catch (err) {
    // Surface failures so the tracker can show an error rather than spinning.
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
