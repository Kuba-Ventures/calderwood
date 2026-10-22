// GET /api/cron/ai-health: Vercel Cron target, every 10 minutes (vercel.json).
// Sends one tiny real request to each AI service the app depends on, records
// the result in ai_service_checks, and emails AI_HEALTH_ALERT_TO only when a
// service goes down or is fixed, at most one down email per service per
// Pacific day (see lib/ai-health/alerts.ts for the rules).
//
// 401 unless `Authorization: Bearer $CRON_SECRET`.

import { NextResponse } from "next/server";
import { isAuthorizedByCronSecret } from "@/lib/ai-health/cron-auth";
import { runAiHealthCheck } from "@/lib/ai-health/job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isAuthorizedByCronSecret(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const outcome = await runAiHealthCheck();
    console.log(
      `[ai-health] ${outcome.checks
        .map((o) => `${o.service}=${o.status}${o.alertSent ? ` (reported ${o.alertSent})` : ""}`)
        .join(", ")}; email=${outcome.email}`
    );
    return NextResponse.json(outcome);
  } catch (error) {
    console.error("[ai-health] cron run failed:", error);
    return NextResponse.json({ error: "AI health check failed" }, { status: 500 });
  }
}
