// Runs the AI service checks, stores each result in ai_service_checks, and
// emails a down or recovered alert through Resend when alerts.ts says so.
// Called every 10 minutes by Vercel Cron via /api/cron/ai-health.

import "server-only";
import { serviceSupabase } from "@/lib/db/server";
import {
  buildAiServiceAlertEmail,
  decideAiServiceAlert,
  downSinceForIncident,
  type AiServiceAlertKind,
  type StoredAiServiceCheck,
} from "./alerts";
import {
  checkAllAiServices,
  type AiServiceCheckResult,
  type AiServiceFailureKind,
  type AiServiceName,
  type AiServiceStatus,
} from "./checks";
import { aiHealthAlertFrom, aiHealthAlertRecipients } from "./recipients";

export const AI_SERVICE_CHECKS_TABLE = "ai_service_checks";
const EARLIER_CHECKS_TO_READ = 300;

type AiServiceCheckRow = {
  service: AiServiceName;
  status: AiServiceStatus;
  failure_kind: AiServiceFailureKind | null;
  failure_detail: string | null;
  checked_at: string;
  alert_sent: AiServiceAlertKind | null;
};

function storedCheckFromRow(row: AiServiceCheckRow): StoredAiServiceCheck {
  return {
    service: row.service,
    status: row.status,
    failureKind: row.failure_kind,
    failureDetail: row.failure_detail,
    checkedAt: row.checked_at,
    alertSent: row.alert_sent,
  };
}

async function readEarlierChecksNewestFirst(service: AiServiceName): Promise<StoredAiServiceCheck[]> {
  const { data, error } = await serviceSupabase()
    .from(AI_SERVICE_CHECKS_TABLE)
    .select("service,status,failure_kind,failure_detail,checked_at,alert_sent")
    .eq("service", service)
    .order("checked_at", { ascending: false })
    .limit(EARLIER_CHECKS_TO_READ);
  if (error) throw new Error(`reading earlier ${service} checks failed: ${error.message}`);
  return ((data ?? []) as AiServiceCheckRow[]).map(storedCheckFromRow);
}

async function sendAlert(
  alertKind: AiServiceAlertKind,
  check: AiServiceCheckResult,
  downSinceIso: string,
  nowIso: string,
  recipients: string[]
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[ai-health] RESEND_API_KEY not set, cannot send the alert");
    return false;
  }
  const email = buildAiServiceAlertEmail({
    alertKind,
    service: check.service,
    failureKind: check.failureKind,
    failureDetail: check.failureDetail,
    downSinceIso,
    nowIso,
  });
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        // One email per incident and kind, even if a run is retried.
        "Idempotency-Key": `ai-health-${check.service}-${alertKind}-${downSinceIso}`,
      },
      body: JSON.stringify({
        from: aiHealthAlertFrom(),
        to: recipients,
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      console.error(`[ai-health] Resend ${response.status}: ${(await response.text()).slice(0, 300)}`);
      return false;
    }
    console.log(`[ai-health] sent ${alertKind} alert for ${check.service} to ${recipients.length} recipient(s)`);
    return true;
  } catch (error) {
    console.error("[ai-health] alert send failed:", error);
    return false;
  }
}

export type AiServiceCheckOutcome = {
  service: AiServiceName;
  status: AiServiceStatus;
  failureKind: AiServiceFailureKind | null;
  alertSent: AiServiceAlertKind | null;
};

async function recordCheckAndAlertIfNeeded(
  check: AiServiceCheckResult,
  recipients: string[],
  now: Date
): Promise<AiServiceCheckOutcome> {
  const nowIso = now.toISOString();
  const earlier = await readEarlierChecksNewestFirst(check.service);
  const alertKind = decideAiServiceAlert(check, earlier);
  const downSinceIso = downSinceForIncident(earlier, nowIso);

  // A failed send is recorded as no alert, so the next run tries again.
  const sent =
    alertKind !== null &&
    recipients.length > 0 &&
    (await sendAlert(alertKind, check, downSinceIso, nowIso, recipients));
  const alertSent = sent ? alertKind : null;

  const { error } = await serviceSupabase().from(AI_SERVICE_CHECKS_TABLE).insert({
    service: check.service,
    checked_at: nowIso,
    status: check.status,
    failure_kind: check.failureKind,
    failure_detail: check.failureDetail,
    latency_ms: check.latencyMilliseconds,
    alert_sent: alertSent,
  });
  if (error) throw new Error(`recording the ${check.service} check failed: ${error.message}`);

  return { service: check.service, status: check.status, failureKind: check.failureKind, alertSent };
}

export async function runAiHealthCheck(now = new Date()): Promise<AiServiceCheckOutcome[]> {
  const recipients = aiHealthAlertRecipients();
  const results = await checkAllAiServices();
  return Promise.all(results.map((check) => recordCheckAndAlertIfNeeded(check, recipients, now)));
}
