import { describe, expect, it } from "vitest";
import {
  buildAiServiceAlertEmail,
  decideAiServiceAlert,
  describeDowntime,
  downSinceForIncident,
  type StoredAiServiceCheck,
} from "./alerts";
import { checkClaude, classifyAnthropicFailure } from "./checks";
import { isAuthorizedByCronSecret } from "./cron-auth";
import { aiHealthAlertFrom, aiHealthAlertRecipients } from "./recipients";

function stored(overrides: Partial<StoredAiServiceCheck> = {}): StoredAiServiceCheck {
  return {
    service: "claude",
    status: "working",
    failureKind: null,
    failureDetail: null,
    checkedAt: "2026-10-21T23:40:00.000Z",
    alertSent: null,
    ...overrides,
  };
}

describe("decideAiServiceAlert", () => {
  it("alerts on the first failed check when credits run out", () => {
    expect(decideAiServiceAlert({ status: "down", failureKind: "out_of_credits" }, [stored()])).toBe("down");
  });

  it("alerts on the first failed check when the key is rejected, even with no history", () => {
    expect(decideAiServiceAlert({ status: "down", failureKind: "key_rejected" }, [])).toBe("down");
  });

  it("waits for a second failed check before alerting on a transient outage", () => {
    expect(decideAiServiceAlert({ status: "down", failureKind: "provider_outage" }, [stored()])).toBeNull();
    expect(
      decideAiServiceAlert({ status: "down", failureKind: "provider_outage" }, [
        stored({ status: "down", failureKind: "provider_outage" }),
        stored(),
      ])
    ).toBe("down");
  });

  it("sends only one down alert per incident", () => {
    expect(
      decideAiServiceAlert({ status: "down", failureKind: "out_of_credits" }, [
        stored({ status: "down", failureKind: "out_of_credits" }),
        stored({ status: "down", failureKind: "out_of_credits", alertSent: "down" }),
        stored(),
      ])
    ).toBeNull();
  });

  it("sends recovered only when a down alert went out for the incident", () => {
    expect(
      decideAiServiceAlert({ status: "working", failureKind: null }, [
        stored({ status: "down", failureKind: "out_of_credits", alertSent: "down" }),
        stored(),
      ])
    ).toBe("recovered");
    expect(
      decideAiServiceAlert({ status: "working", failureKind: null }, [
        stored({ status: "down", failureKind: "provider_outage" }),
        stored(),
      ])
    ).toBeNull();
  });

  it("does not send recovered twice", () => {
    expect(
      decideAiServiceAlert({ status: "working", failureKind: null }, [
        stored({ alertSent: "recovered" }),
        stored({ status: "down", failureKind: "out_of_credits", alertSent: "down" }),
      ])
    ).toBeNull();
  });

  it("does not let an earlier incident's alert silence a new one", () => {
    expect(
      decideAiServiceAlert({ status: "down", failureKind: "key_rejected" }, [
        stored(),
        stored({ status: "down", failureKind: "out_of_credits", alertSent: "down" }),
      ])
    ).toBe("down");
  });

  it("never alerts on an unknown check", () => {
    expect(decideAiServiceAlert({ status: "unknown", failureKind: "not_configured" }, [])).toBeNull();
  });
});

describe("downSinceForIncident", () => {
  it("returns the first down check after the last working one", () => {
    const since = downSinceForIncident(
      [
        stored({ status: "down", checkedAt: "2026-10-21T10:20:00.000Z" }),
        stored({ status: "down", checkedAt: "2026-10-21T10:10:00.000Z" }),
        stored({ status: "working", checkedAt: "2026-10-21T10:00:00.000Z" }),
        stored({ status: "down", checkedAt: "2026-10-21T09:50:00.000Z" }),
      ],
      "2026-10-21T10:30:00.000Z"
    );
    expect(since).toBe("2026-10-21T10:10:00.000Z");
  });

  it("falls back to now when this is the first failed check", () => {
    expect(downSinceForIncident([stored()], "2026-10-21T10:30:00.000Z")).toBe("2026-10-21T10:30:00.000Z");
  });
});

describe("describeDowntime", () => {
  it("formats minutes, hours, and both", () => {
    expect(describeDowntime("2026-10-21T10:00:00.000Z", "2026-10-21T10:01:00.000Z")).toBe("1 minute");
    expect(describeDowntime("2026-10-21T10:00:00.000Z", "2026-10-21T12:00:00.000Z")).toBe("2 hours");
    expect(describeDowntime("2026-10-21T10:00:00.000Z", "2026-10-21T11:25:00.000Z")).toBe("1 hour 25 minutes");
  });
});

describe("classifyAnthropicFailure", () => {
  it("recognizes an empty credit balance", () => {
    expect(
      classifyAnthropicFailure(400, {
        error: {
          type: "invalid_request_error",
          message: "Your credit balance is too low to access the Anthropic API.",
        },
      })
    ).toBe("out_of_credits");
  });

  it("maps auth, permission, rate limit, and outage errors", () => {
    expect(classifyAnthropicFailure(401, { error: { type: "authentication_error" } })).toBe("key_rejected");
    expect(classifyAnthropicFailure(403, { error: { type: "permission_error" } })).toBe("key_not_allowed");
    expect(classifyAnthropicFailure(429, { error: { type: "rate_limit_error" } })).toBe("rate_limited");
    expect(classifyAnthropicFailure(529, { error: { type: "overloaded_error" } })).toBe("provider_outage");
    expect(classifyAnthropicFailure(500, null)).toBe("provider_outage");
    expect(classifyAnthropicFailure(400, { error: { type: "invalid_request_error", message: "bad" } })).toBe(
      "unexpected_response"
    );
  });
});

describe("checkClaude", () => {
  it("reports not_configured without a key and makes no request", async () => {
    let called = false;
    const result = await checkClaude("", (async () => {
      called = true;
      return new Response("{}");
    }) as typeof fetch);
    expect(result.status).toBe("unknown");
    expect(result.failureKind).toBe("not_configured");
    expect(called).toBe(false);
  });

  it("sends a one-token request and reports working on 200", async () => {
    let sentBody: { max_tokens?: number } = {};
    const result = await checkClaude("sk-test", (async (_url: unknown, init?: RequestInit) => {
      sentBody = JSON.parse(String(init?.body));
      return new Response("{}", { status: 200 });
    }) as typeof fetch);
    expect(sentBody.max_tokens).toBe(1);
    expect(result.status).toBe("working");
  });

  it("reports out_of_credits from the error body", async () => {
    const result = await checkClaude("sk-test", (async () =>
      new Response(
        JSON.stringify({ error: { type: "invalid_request_error", message: "Your credit balance is too low" } }),
        { status: 400 }
      )) as typeof fetch);
    expect(result.status).toBe("down");
    expect(result.failureKind).toBe("out_of_credits");
  });

  it("reports unreachable when the request throws", async () => {
    const result = await checkClaude("sk-test", (async () => {
      throw new Error("ECONNRESET");
    }) as typeof fetch);
    expect(result.failureKind).toBe("unreachable");
  });
});

describe("buildAiServiceAlertEmail", () => {
  it("says what breaks for practices and who fixes it", () => {
    const email = buildAiServiceAlertEmail({
      alertKind: "down",
      service: "claude",
      failureKind: "out_of_credits",
      failureDetail: "400: Your credit balance is too low",
      downSinceIso: "2026-10-21T17:00:00.000Z",
      nowIso: "2026-10-21T17:00:00.000Z",
    });
    expect(email.subject).toContain("down");
    expect(email.subject).toContain("credit balance");
    expect(email.text).toContain("PDF");
    expect(email.text).toContain("Anthropic Console");
    expect(email.text).toContain("Your credit balance is too low");
    expect(email.text).not.toMatch(/\u2014/);
  });

  it("reports how long the recovered outage lasted", () => {
    const email = buildAiServiceAlertEmail({
      alertKind: "recovered",
      service: "claude",
      failureKind: null,
      failureDetail: null,
      downSinceIso: "2026-10-21T17:00:00.000Z",
      nowIso: "2026-10-21T19:30:00.000Z",
    });
    expect(email.subject).toContain("back");
    expect(email.text).toContain("2 hours 30 minutes");
  });

  it("escapes HTML in the provider's message", () => {
    const email = buildAiServiceAlertEmail({
      alertKind: "down",
      service: "claude",
      failureKind: "unexpected_response",
      failureDetail: "<script>x</script>",
      downSinceIso: "2026-10-21T17:00:00.000Z",
      nowIso: "2026-10-21T17:00:00.000Z",
    });
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
  });
});

describe("recipients and sender", () => {
  it("defaults to Finley and parses a comma list", () => {
    expect(aiHealthAlertRecipients(undefined)).toEqual(["finley@qsbsrollover.com"]);
    expect(aiHealthAlertRecipients("")).toEqual(["finley@qsbsrollover.com"]);
    expect(aiHealthAlertRecipients(" a@x.com, b@y.com ,")).toEqual(["a@x.com", "b@y.com"]);
  });

  it("prefers AI_HEALTH_ALERT_FROM, then RESEND_FROM_EMAIL, then the default", () => {
    expect(aiHealthAlertFrom({ AI_HEALTH_ALERT_FROM: "A <a@x.com>", RESEND_FROM_EMAIL: "B <b@x.com>" })).toBe("A <a@x.com>");
    expect(aiHealthAlertFrom({ RESEND_FROM_EMAIL: "B <b@x.com>" })).toBe("B <b@x.com>");
    expect(aiHealthAlertFrom({})).toContain("@newfeeschedule.com");
  });
});

describe("isAuthorizedByCronSecret", () => {
  it("accepts only the exact bearer secret", () => {
    expect(isAuthorizedByCronSecret("Bearer s3cret", "s3cret")).toBe(true);
    expect(isAuthorizedByCronSecret("Bearer wrong!", "s3cret")).toBe(false);
    expect(isAuthorizedByCronSecret(null, "s3cret")).toBe(false);
  });

  it("refuses everything when CRON_SECRET is unset", () => {
    expect(isAuthorizedByCronSecret("Bearer ", "")).toBe(false);
    expect(isAuthorizedByCronSecret("Bearer undefined", "")).toBe(false);
  });
});
