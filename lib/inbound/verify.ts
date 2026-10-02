// Resend webhook signature verification (Resend signs webhooks with Svix).
// Algorithm per https://docs.svix.com/receiving/verifying-payloads/how-manual:
//   signed content = `${svix-id}.${svix-timestamp}.${rawBody}`
//   key            = base64-decode(secret without the "whsec_" prefix)
//   expected       = base64(HMAC-SHA256(key, signed content))
//   svix-signature = space-separated list of "v1,<base64>" entries; any match passes.
// Timestamps outside the tolerance window are rejected to block replays.

import { createHmac, timingSafeEqual } from "node:crypto";

export const DEFAULT_TOLERANCE_SECONDS = 5 * 60;

export type SvixHeaders = {
  id: string | null;
  timestamp: string | null;
  signature: string | null;
};

export type VerifyResult = { ok: true } | { ok: false; reason: string };

export function signPayload(
  secret: string,
  id: string,
  timestamp: string,
  body: string
): string {
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  return createHmac("sha256", key)
    .update(`${id}.${timestamp}.${body}`)
    .digest("base64");
}

export function verifyWebhook(
  rawBody: string,
  headers: SvixHeaders,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
  toleranceSeconds: number = DEFAULT_TOLERANCE_SECONDS
): VerifyResult {
  const { id, timestamp, signature } = headers;
  if (!secret) return { ok: false, reason: "no secret" };
  if (!id || !timestamp || !signature) {
    return { ok: false, reason: "missing headers" };
  }

  const ts = Number(timestamp);
  if (!Number.isInteger(ts)) return { ok: false, reason: "bad timestamp" };
  if (Math.abs(nowSeconds - ts) > toleranceSeconds) {
    return { ok: false, reason: "timestamp outside tolerance" };
  }

  const expected = Buffer.from(signPayload(secret, id, timestamp, rawBody));
  for (const entry of signature.split(" ")) {
    const [version, sig] = entry.split(",");
    if (version !== "v1" || !sig) continue;
    const given = Buffer.from(sig);
    if (given.length === expected.length && timingSafeEqual(given, expected)) {
      return { ok: true };
    }
  }
  return { ok: false, reason: "signature mismatch" };
}
