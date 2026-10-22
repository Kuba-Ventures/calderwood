// Vercel Cron sends `Authorization: Bearer $CRON_SECRET` on every scheduled
// call. Without CRON_SECRET set, every request is refused.

import { timingSafeEqual } from "node:crypto";

export function isAuthorizedByCronSecret(
  authorizationHeader: string | null,
  cronSecret = process.env.CRON_SECRET
): boolean {
  if (!cronSecret) return false;
  const provided = Buffer.from(authorizationHeader ?? "");
  const expected = Buffer.from(`Bearer ${cronSecret}`);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}
