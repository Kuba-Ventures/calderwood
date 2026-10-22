// Runs the AI service checks, stores each result in ai_service_checks, and
// emails through Resend only when a service goes down or is fixed (one email
// per run combining both). A service gets at most one down email per Pacific
// day. The rules live in alerts.ts. Called every 10 minutes by Vercel Cron via
// /api/cron/ai-health.
//
// alert_sent on a row records what that check's service was reported as in
// the email this run sent, which is how later runs know an outage was already
// reported and whether a fix is still owed.

import "server-only";
import { uncachedServiceSupabase } from "@/lib/db/server";
import {
  aDownEmailWentOutForThisServiceSince,
  buildAiHealthAlertEmail,
  downSinceForIncident,
  isOutageWorthReporting,
  isRecoveryAwaitingReport,
  reportedIncidentTimes,
  startOfPacificDay,
  type AiHealthAlertEmailInput,
  type AiServiceAlertKind,
  type ServiceOutageForEmail,
  type ServiceRecoveryForEmail,
  type StoredAiServiceCheck,
} from "./alerts";
import {
  checkAllAiServices,
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
  const { data, error } = await uncachedServiceSupabase()
    .from(AI_SERVICE_CHECKS_TABLE)
    .select("service,status,failure_kind,failure_detail,checked_at,alert_sent")
    .eq("service", service)
    .order("checked_at", { ascending: false })
    .limit(EARLIER_CHECKS_TO_READ);
  if (error) throw new Error(`reading earlier ${service} checks failed: ${error.message}`);
  return ((data ?? []) as AiServiceCheckRow[]).map(storedCheckFromRow);
}

async function sendAlertEmail(
  input: AiHealthAlertEmailInput,
  recipients: string[],
  idempotencyKey: string
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[ai-health] RESEND_API_KEY not set, cannot send the alert");
    return false;
  }
  const email = buildAiHealthAlertEmail(input);
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        // One email per run, even if the request is retried.
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        from: aiHealthAlertFrom(),
        to: recipients,
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      console.error(`[ai-health] Resend ${response.status}: ${(await response.text()).slice(0, 300)}`);
      return false;
    }
    console.log(`[ai-health] sent "${email.subject}" to ${recipients.length} recipient(s)`);
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

export type AiHealthRunOutcome = {
  checks: AiServiceCheckOutcome[];
  email: "sent" | "not_needed" | "no_recipients" | "send_failed";
};

export async function runAiHealthCheck(now = new Date()): Promise<AiHealthRunOutcome> {
  const nowIso = now.toISOString();
  const recipients = aiHealthAlertRecipients();
  const results = await checkAllAiServices();
  const earlierByService = await Promise.all(results.map((check) => readEarlierChecksNewestFirst(check.service)));

  const startOfTodayIso = startOfPacificDay(now).toISOString();
  const outages: ServiceOutageForEmail[] = [];
  const recoveries: ServiceRecoveryForEmail[] = [];
  const alertKindByService = new Map<AiServiceName, AiServiceAlertKind>();
  results.forEach((check, index) => {
    const earlier = earlierByService[index];
    const newOutageNotEmailedToday =
      isOutageWorthReporting(check, earlier) && !aDownEmailWentOutForThisServiceSince(earlier, startOfTodayIso);
    if (newOutageNotEmailedToday) {
      outages.push({
        service: check.service,
        failureKind: check.failureKind,
        failureDetail: check.failureDetail,
        downSinceIso: downSinceForIncident(earlier, nowIso),
      });
      alertKindByService.set(check.service, "down");
    } else if (isRecoveryAwaitingReport(check, earlier)) {
      recoveries.push({ service: check.service, ...reportedIncidentTimes(earlier, nowIso) });
      alertKindByService.set(check.service, "recovered");
    }
  });

  let email: AiHealthRunOutcome["email"] = "not_needed";
  if (outages.length > 0 || recoveries.length > 0) {
    if (recipients.length === 0) {
      email = "no_recipients";
    } else {
      const sent = await sendAlertEmail({ outages, recoveries }, recipients, `ai-health-${nowIso}`);
      email = sent ? "sent" : "send_failed";
    }
  }

  // A failed send records no alert, so the next run tries again.
  const rows = results.map((check) => ({
    service: check.service,
    checked_at: nowIso,
    status: check.status,
    failure_kind: check.failureKind,
    failure_detail: check.failureDetail,
    latency_ms: check.latencyMilliseconds,
    alert_sent: email === "sent" ? alertKindByService.get(check.service) ?? null : null,
  }));
  const { error } = await uncachedServiceSupabase().from(AI_SERVICE_CHECKS_TABLE).insert(rows);
  if (error) throw new Error(`recording the checks failed: ${error.message}`);

  return {
    checks: rows.map((row) => ({
      service: row.service,
      status: row.status,
      failureKind: row.failure_kind,
      alertSent: row.alert_sent,
    })),
    email,
  };
}
