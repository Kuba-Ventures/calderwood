// Pure alerting logic for the AI service health check: when to email, when an
// incident started, and what the email says. No I/O here, so it is unit tested
// in alerts.test.ts.
//
// Rules:
// - Failures that never fix themselves (out of credits, revoked key) alert on
//   the first failed check. Transient ones (outage, rate limit, network) need
//   two failed checks in a row, so a single blip does not page anyone.
// - One "down" email and one "recovered" email per incident. An incident is
//   every check since the most recent working one.
// - "unknown" (key not configured) never alerts.

import type {
  AiServiceCheckResult,
  AiServiceFailureKind,
  AiServiceName,
  AiServiceStatus,
} from "./checks";

export type AiServiceAlertKind = "down" | "recovered";

export type StoredAiServiceCheck = {
  service: AiServiceName;
  status: AiServiceStatus;
  failureKind: AiServiceFailureKind | null;
  failureDetail: string | null;
  checkedAt: string;
  alertSent: AiServiceAlertKind | null;
};

export const ALERT_TIME_ZONE = "America/Los_Angeles";

const FAILURES_THAT_NEVER_FIX_THEMSELVES: AiServiceFailureKind[] = [
  "out_of_credits",
  "out_of_quota",
  "key_rejected",
  "key_not_allowed",
];

export const AI_SERVICE_DISPLAY_NAMES: Record<AiServiceName, string> = {
  claude: "Claude (Anthropic)",
};

const WHAT_BREAKS_FOR_USERS: Record<AiServiceName, string> = {
  claude:
    "New Fee Schedule cannot read uploaded PDFs. Practices that upload a PDF production report (Procedure Summary) or office fee schedule during onboarding or intake get an error instead of their fees and procedure counts, so they cannot get a report from a PDF. CSV and Excel uploads and typed fees still work",
};

const ANTHROPIC_FIX =
  "Whoever administers the Anthropic org that owns Calderwood's ANTHROPIC_API_KEY";

const WHAT_TO_DO: Record<AiServiceFailureKind, string> = {
  out_of_credits: `${ANTHROPIC_FIX} needs to add credits in the Anthropic Console (Settings > Billing) and turn on auto-reload.`,
  out_of_quota: `The Anthropic org has hit its spend limit for this period. ${ANTHROPIC_FIX} can raise it in the Anthropic Console (Settings > Limits).`,
  key_rejected:
    "The Anthropic API key was rejected. It was probably revoked or rotated. Create a new key in the Anthropic Console and update ANTHROPIC_API_KEY in Vercel (project calderwood, Production), then redeploy.",
  key_not_allowed:
    "The Anthropic API key is valid but not allowed to make this request. Check the key's workspace and model permissions in the Anthropic Console.",
  rate_limited:
    "Anthropic is rate limiting the key. Check the rate limits for the workspace the key belongs to in the Anthropic Console.",
  provider_outage:
    "Anthropic is having problems on their side. Check status.anthropic.com. Nothing to change unless it lasts.",
  unreachable:
    "Anthropic could not be reached from Vercel at all. Usually a network blip; check status.anthropic.com if it lasts.",
  unexpected_response: "Anthropic answered with something unexpected. The detail below says what.",
  not_configured: "ANTHROPIC_API_KEY is missing from Vercel's environment variables.",
  cannot_check: "The Anthropic key cannot be checked with the permissions it has.",
};

const FAILURE_SUMMARIES: Record<AiServiceFailureKind, string> = {
  out_of_credits: "the credit balance is too low",
  out_of_quota: "the spend limit is reached",
  key_rejected: "the API key was rejected",
  key_not_allowed: "the API key is not allowed",
  rate_limited: "requests are being rate limited",
  provider_outage: "the service is having an outage",
  unreachable: "the service cannot be reached",
  unexpected_response: "it returned an unexpected error",
  not_configured: "the key is not configured",
  cannot_check: "the key cannot be checked",
};

function checksInCurrentIncident(earlierNewestFirst: StoredAiServiceCheck[]): StoredAiServiceCheck[] {
  const lastWorkingIndex = earlierNewestFirst.findIndex((check) => check.status === "working");
  return lastWorkingIndex === -1 ? earlierNewestFirst : earlierNewestFirst.slice(0, lastWorkingIndex);
}

export function decideAiServiceAlert(
  newCheck: Pick<AiServiceCheckResult, "status" | "failureKind">,
  earlierNewestFirst: StoredAiServiceCheck[]
): AiServiceAlertKind | null {
  const incident = checksInCurrentIncident(earlierNewestFirst);
  const downAlreadySent = incident.some((check) => check.alertSent === "down");

  if (newCheck.status === "working") {
    return downAlreadySent ? "recovered" : null;
  }
  if (newCheck.status !== "down" || downAlreadySent) {
    return null;
  }

  const neverFixesItself =
    newCheck.failureKind !== null && FAILURES_THAT_NEVER_FIX_THEMSELVES.includes(newCheck.failureKind);
  const previousWasAlsoDown = earlierNewestFirst[0]?.status === "down";
  return neverFixesItself || previousWasAlsoDown ? "down" : null;
}

export function downSinceForIncident(earlierNewestFirst: StoredAiServiceCheck[], fallbackIso: string): string {
  const downChecks = checksInCurrentIncident(earlierNewestFirst).filter((check) => check.status === "down");
  return downChecks.at(-1)?.checkedAt ?? fallbackIso;
}

export function formatPacificTime(instantIso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: ALERT_TIME_ZONE,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(instantIso));
}

function plural(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? "" : "s"}`;
}

export function describeDowntime(downSinceIso: string, recoveredAtIso: string): string {
  const totalMinutes = Math.max(1, Math.round((Date.parse(recoveredAtIso) - Date.parse(downSinceIso)) / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return plural(minutes, "minute");
  if (minutes === 0) return plural(hours, "hour");
  return `${plural(hours, "hour")} ${plural(minutes, "minute")}`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type AiServiceAlertEmailInput = {
  alertKind: AiServiceAlertKind;
  service: AiServiceName;
  failureKind: AiServiceFailureKind | null;
  failureDetail: string | null;
  downSinceIso: string;
  nowIso: string;
};

export type AiServiceAlertEmail = { subject: string; text: string; html: string };

function alertParagraphs(input: AiServiceAlertEmailInput): string[] {
  const serviceName = AI_SERVICE_DISPLAY_NAMES[input.service];
  if (input.alertKind === "recovered") {
    return [
      `${serviceName} started working again at ${formatPacificTime(input.nowIso)} PT. PDF uploads on New Fee Schedule work again.`,
      `It was down for ${describeDowntime(input.downSinceIso, input.nowIso)}, since ${formatPacificTime(input.downSinceIso)} PT.`,
    ];
  }
  const failureKind = input.failureKind ?? "unexpected_response";
  const paragraphs = [
    `Since ${formatPacificTime(input.downSinceIso)} PT: ${WHAT_BREAKS_FOR_USERS[input.service]}.`,
    WHAT_TO_DO[failureKind],
  ];
  if (input.failureDetail) {
    paragraphs.push(`What ${serviceName} said: ${input.failureDetail}`);
  }
  paragraphs.push("You will get one more email when it recovers. This check runs every 10 minutes.");
  return paragraphs;
}

export function buildAiServiceAlertEmail(input: AiServiceAlertEmailInput): AiServiceAlertEmail {
  const serviceName = AI_SERVICE_DISPLAY_NAMES[input.service];
  const subject =
    input.alertKind === "down"
      ? `New Fee Schedule PDF parsing is down: ${serviceName} says ${FAILURE_SUMMARIES[input.failureKind ?? "unexpected_response"]}`
      : `New Fee Schedule PDF parsing is back: ${serviceName} is working again`;
  const paragraphs = alertParagraphs(input);
  const text = paragraphs.join("\n\n");
  const accent = input.alertKind === "down" ? "#dc2626" : "#16a34a";
  const html =
    `<div style="font-family:-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827">` +
    `<div style="border-left:4px solid ${accent};padding-left:14px">` +
    `<h1 style="font-size:18px;margin:0 0 12px">${escapeHtml(subject)}</h1>` +
    paragraphs
      .map((paragraph) => `<p style="font-size:14px;line-height:1.5;margin:0 0 12px">${escapeHtml(paragraph)}</p>`)
      .join("") +
    `</div></div>`;
  return { subject, text, html };
}
