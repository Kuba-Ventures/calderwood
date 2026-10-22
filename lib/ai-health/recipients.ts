// Who the AI health alert goes to and who it comes from. Pure, so it is unit
// tested without touching the server-only job module.

export const DEFAULT_AI_HEALTH_ALERT_TO = "finley@qsbsrollover.com";
export const DEFAULT_AI_HEALTH_ALERT_FROM = "New Fee Schedule <alerts@newfeeschedule.com>";

export function aiHealthAlertRecipients(raw = process.env.AI_HEALTH_ALERT_TO): string[] {
  const list = (raw ?? "")
    .split(",")
    .map((address) => address.trim())
    .filter((address) => address.includes("@"));
  return list.length > 0 ? list : [DEFAULT_AI_HEALTH_ALERT_TO];
}

export function aiHealthAlertFrom(env: Record<string, string | undefined> = process.env): string {
  return env.AI_HEALTH_ALERT_FROM || env.RESEND_FROM_EMAIL || DEFAULT_AI_HEALTH_ALERT_FROM;
}
