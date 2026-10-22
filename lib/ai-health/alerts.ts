// Pure alerting logic for the AI service health check: what is worth
// reporting, when an incident started, and what the daily email says. No I/O
// here, so it is unit tested in alerts.test.ts.
//
// Rules:
// - At most one email per Pacific day, combining every service that is down
//   now and every recovery since the last email.
// - Failures that never fix themselves (out of credits, revoked key) are worth
//   reporting on the first failed check. Transient ones (outage, rate limit,
//   network) need two failed checks in a row, so a single blip is ignored.
// - An outage still going the next day is reported again in that day's email.
//   A recovery after the day's email went out is reported in the next one.
// - "unknown" (key not configured) is never reported.

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

export function isOutageWorthReporting(
  newCheck: Pick<AiServiceCheckResult, "status" | "failureKind">,
  earlierNewestFirst: StoredAiServiceCheck[]
): boolean {
  if (newCheck.status !== "down") return false;
  const neverFixesItself =
    newCheck.failureKind !== null && FAILURES_THAT_NEVER_FIX_THEMSELVES.includes(newCheck.failureKind);
  const previousWasAlsoDown = earlierNewestFirst[0]?.status === "down";
  return neverFixesItself || previousWasAlsoDown;
}

function indexOfMostRecentlyReportedCheck(earlierNewestFirst: StoredAiServiceCheck[]): number {
  return earlierNewestFirst.findIndex((check) => check.alertSent !== null);
}

// Working now, and the last email that mentioned this service reported it down.
export function isRecoveryAwaitingReport(
  newCheck: Pick<AiServiceCheckResult, "status">,
  earlierNewestFirst: StoredAiServiceCheck[]
): boolean {
  if (newCheck.status !== "working") return false;
  const reportedIndex = indexOfMostRecentlyReportedCheck(earlierNewestFirst);
  return reportedIndex !== -1 && earlierNewestFirst[reportedIndex].alertSent === "down";
}

export function downSinceForIncident(earlierNewestFirst: StoredAiServiceCheck[], fallbackIso: string): string {
  const downChecks = checksInCurrentIncident(earlierNewestFirst).filter((check) => check.status === "down");
  return downChecks.at(-1)?.checkedAt ?? fallbackIso;
}

// For a recovery being reported late: when the reported outage began and the
// first working check after it.
export function reportedIncidentTimes(
  earlierNewestFirst: StoredAiServiceCheck[],
  fallbackIso: string
): { downSinceIso: string; recoveredAtIso: string } {
  const reportedIndex = indexOfMostRecentlyReportedCheck(earlierNewestFirst);
  if (reportedIndex === -1) return { downSinceIso: fallbackIso, recoveredAtIso: fallbackIso };

  let oldestDownIndex = reportedIndex;
  while (earlierNewestFirst[oldestDownIndex + 1]?.status === "down") oldestDownIndex += 1;

  let firstWorkingAfterIndex = -1;
  for (let index = reportedIndex - 1; index >= 0; index -= 1) {
    if (earlierNewestFirst[index].status === "working") {
      firstWorkingAfterIndex = index;
      break;
    }
  }

  return {
    downSinceIso: earlierNewestFirst[oldestDownIndex].checkedAt,
    recoveredAtIso: firstWorkingAfterIndex === -1 ? fallbackIso : earlierNewestFirst[firstWorkingAfterIndex].checkedAt,
  };
}

export function anAlertEmailWentOutSince(
  recentChecks: Pick<StoredAiServiceCheck, "checkedAt" | "alertSent">[],
  sinceIso: string
): boolean {
  const sinceMs = Date.parse(sinceIso);
  return recentChecks.some((check) => check.alertSent !== null && Date.parse(check.checkedAt) >= sinceMs);
}

function pacificDateParts(instant: Date): { year: number; month: number; day: number; hour: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ALERT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: part("year"), month: part("month"), day: part("day"), hour: part("hour") };
}

// "2026-10-21" for the Pacific calendar day containing `instant`.
export function pacificDayKey(instant: Date): string {
  const { year, month, day } = pacificDateParts(instant);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Midnight Pacific at the start of the day containing `instant`. Pacific
// midnight is 07:00 UTC in daylight time and 08:00 UTC in standard time.
export function startOfPacificDay(instant: Date): Date {
  const { year, month, day } = pacificDateParts(instant);
  for (const utcHour of [7, 8]) {
    const candidate = new Date(Date.UTC(year, month - 1, day, utcHour));
    const candidateParts = pacificDateParts(candidate);
    if (candidateParts.hour === 0 && candidateParts.day === day) return candidate;
  }
  return new Date(Date.UTC(year, month - 1, day, 8));
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

export type ServiceOutageForEmail = {
  service: AiServiceName;
  failureKind: AiServiceFailureKind | null;
  failureDetail: string | null;
  downSinceIso: string;
};

export type ServiceRecoveryForEmail = {
  service: AiServiceName;
  downSinceIso: string;
  recoveredAtIso: string;
};

export type AiHealthDailyEmailInput = {
  outages: ServiceOutageForEmail[];
  recoveries: ServiceRecoveryForEmail[];
};

export type AiServiceAlertEmail = { subject: string; text: string; html: string };

export function dailyEmailSubject(input: AiHealthDailyEmailInput): string {
  if (input.outages.length === 1) {
    const outage = input.outages[0];
    return `New Fee Schedule PDF parsing is down: ${AI_SERVICE_DISPLAY_NAMES[outage.service]} says ${FAILURE_SUMMARIES[outage.failureKind ?? "unexpected_response"]}`;
  }
  if (input.outages.length > 1) {
    return `New Fee Schedule is down: ${input.outages.length} AI services are failing`;
  }
  if (input.recoveries.length === 1) {
    return `New Fee Schedule PDF parsing is back: ${AI_SERVICE_DISPLAY_NAMES[input.recoveries[0].service]} is working again`;
  }
  return `New Fee Schedule is back: ${input.recoveries.length} AI services are working again`;
}

function outageParagraphs(outage: ServiceOutageForEmail): string[] {
  const serviceName = AI_SERVICE_DISPLAY_NAMES[outage.service];
  const paragraphs = [
    `${serviceName}: since ${formatPacificTime(outage.downSinceIso)} PT, ${WHAT_BREAKS_FOR_USERS[outage.service]}.`,
    WHAT_TO_DO[outage.failureKind ?? "unexpected_response"],
  ];
  if (outage.failureDetail) paragraphs.push(`What ${serviceName} said: ${outage.failureDetail}`);
  return paragraphs;
}

function recoveryParagraph(recovery: ServiceRecoveryForEmail): string {
  return `${AI_SERVICE_DISPLAY_NAMES[recovery.service]} is working again since ${formatPacificTime(recovery.recoveredAtIso)} PT, after being down for ${describeDowntime(recovery.downSinceIso, recovery.recoveredAtIso)}. PDF uploads on New Fee Schedule work again.`;
}

export const DAILY_EMAIL_LIMIT_NOTICE =
  "You get at most one of these emails a day. The check runs every 10 minutes; if it is still broken tomorrow you will hear again, and a recovery after today's email is reported in the next one.";

export function buildAiHealthDailyEmail(input: AiHealthDailyEmailInput): AiServiceAlertEmail {
  const subject = dailyEmailSubject(input);
  const paragraphs = [
    ...input.outages.flatMap(outageParagraphs),
    ...input.recoveries.map(recoveryParagraph),
    DAILY_EMAIL_LIMIT_NOTICE,
  ];
  const text = paragraphs.join("\n\n");
  const accent = input.outages.length > 0 ? "#dc2626" : "#16a34a";
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
