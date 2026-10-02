import { describe, expect, it } from "vitest";
import { signPayload, verifyWebhook } from "./verify";

const secret = "whsec_" + Buffer.from("test-secret-key-for-unit-tests").toString("base64");
const body = JSON.stringify({ type: "email.received", data: { email_id: "e1" } });
const now = 1_760_000_000;

function headers(ts: number, sig?: string) {
  const timestamp = String(ts);
  return {
    id: "msg_123",
    timestamp,
    signature: sig ?? `v1,${signPayload(secret, "msg_123", timestamp, body)}`,
  };
}

describe("verifyWebhook", () => {
  it("accepts a valid signature", () => {
    expect(verifyWebhook(body, headers(now), secret, now)).toEqual({ ok: true });
  });

  it("accepts when one of several signatures matches", () => {
    const good = signPayload(secret, "msg_123", String(now), body);
    const h = headers(now, `v1,AAAA v1,${good}`);
    expect(verifyWebhook(body, h, secret, now).ok).toBe(true);
  });

  it("rejects a bad signature", () => {
    const h = headers(now, "v1,bm90LXRoZS1yaWdodC1zaWduYXR1cmU=");
    expect(verifyWebhook(body, h, secret, now)).toEqual({
      ok: false,
      reason: "signature mismatch",
    });
  });

  it("rejects a tampered body", () => {
    expect(verifyWebhook(body + " ", headers(now), secret, now).ok).toBe(false);
  });

  it("rejects a stale timestamp", () => {
    const h = headers(now - 10 * 60);
    expect(verifyWebhook(body, h, secret, now)).toEqual({
      ok: false,
      reason: "timestamp outside tolerance",
    });
  });

  it("rejects missing headers and missing secret", () => {
    expect(verifyWebhook(body, { id: null, timestamp: null, signature: null }, secret, now).ok).toBe(false);
    expect(verifyWebhook(body, headers(now), "", now).ok).toBe(false);
  });
});
