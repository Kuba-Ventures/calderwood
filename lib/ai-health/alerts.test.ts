import { describe, expect, it } from "vitest";
import {
  ALERT_EMAIL_RULE_NOTICE,
  aDownEmailWentOutForThisServiceSince,
  buildAiHealthAlertEmail,
  describeDowntime,
  downSinceForIncident,
  isOutageWorthReporting,
  isRecoveryAwaitingReport,
  reportedIncidentTimes,
  startOfPacificDay,
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

describe("isOutageWorthReporting", () => {
  it("reports running out of credits on the first failed check", () => {
    expect(isOutageWorthReporting({ status: "down", failureKind: "out_of_credits" }, [stored()])).toBe(true);
    expect(isOutageWorthReporting({ status: "down", failureKind: "key_rejected" }, [])).toBe(true);
  });

  it("waits for a second failed check on a transient outage", () => {
    expect(isOutageWorthReporting({ status: "down", failureKind: "provider_outage" }, [stored()])).toBe(false);
    expect(
      isOutageWorthReporting({ status: "down", failureKind: "provider_outage" }, [
        stored({ status: "down", failureKind: "provider_outage" }),
        stored(),
      ])
    ).toBe(true);
  });

  it("does not report an outage again while it lasts, even on a later day", () => {
    expect(
      isOutageWorthReporting({ status: "down", failureKind: "out_of_credits" }, [
        stored({ status: "down", failureKind: "out_of_credits", checkedAt: "2026-10-23T10:00:00.000Z" }),
        stored({ status: "down", failureKind: "out_of_credits", checkedAt: "2026-10-21T10:00:00.000Z", alertSent: "down" }),
        stored({ checkedAt: "2026-10-21T09:50:00.000Z" }),
      ])
    ).toBe(false);
  });

  it("treats a new outage after a fix as new", () => {
    expect(
      isOutageWorthReporting({ status: "down", failureKind: "key_rejected" }, [
        stored({ alertSent: "recovered" }),
        stored({ status: "down", failureKind: "out_of_credits", alertSent: "down" }),
      ])
    ).toBe(true);
  });

  it("never reports working or unknown checks", () => {
    expect(isOutageWorthReporting({ status: "working", failureKind: null }, [])).toBe(false);
    expect(isOutageWorthReporting({ status: "unknown", failureKind: "not_configured" }, [])).toBe(false);
  });
});

describe("isRecoveryAwaitingReport", () => {
  it("is true when the last email reported the service down", () => {
    expect(
      isRecoveryAwaitingReport({ status: "working" }, [
        stored({ status: "working" }),
        stored({ status: "down", failureKind: "out_of_credits", alertSent: "down" }),
      ])
    ).toBe(true);
  });

  it("is false once the recovery was reported, or when the outage was never emailed", () => {
    expect(
      isRecoveryAwaitingReport({ status: "working" }, [
        stored({ alertSent: "recovered" }),
        stored({ status: "down", alertSent: "down" }),
      ])
    ).toBe(false);
    expect(isRecoveryAwaitingReport({ status: "working" }, [stored({ status: "down" }), stored()])).toBe(false);
  });

  it("is false while the service is still down", () => {
    expect(isRecoveryAwaitingReport({ status: "down" }, [stored({ status: "down", alertSent: "down" })])).toBe(false);
  });
});

describe("reportedIncidentTimes", () => {
  it("finds when the reported outage began and its first working check", () => {
    const times = reportedIncidentTimes(
      [
        stored({ status: "working", checkedAt: "2026-10-22T09:20:00.000Z" }),
        stored({ status: "working", checkedAt: "2026-10-22T09:10:00.000Z" }),
        stored({ status: "down", checkedAt: "2026-10-22T09:00:00.000Z", alertSent: "down" }),
        stored({ status: "down", checkedAt: "2026-10-22T08:50:00.000Z" }),
        stored({ status: "working", checkedAt: "2026-10-22T08:40:00.000Z" }),
      ],
      "2026-10-22T09:30:00.000Z"
    );
    expect(times).toEqual({ downSinceIso: "2026-10-22T08:50:00.000Z", recoveredAtIso: "2026-10-22T09:10:00.000Z" });
  });

  it("uses now when the service only just recovered", () => {
    const times = reportedIncidentTimes(
      [stored({ status: "down", checkedAt: "2026-10-22T09:00:00.000Z", alertSent: "down" })],
      "2026-10-22T09:10:00.000Z"
    );
    expect(times.recoveredAtIso).toBe("2026-10-22T09:10:00.000Z");
  });
});

describe("aDownEmailWentOutForThisServiceSince", () => {
  it("counts only down emails on or after the cutoff", () => {
    const checks = [
      stored({ checkedAt: "2026-10-22T09:00:00.000Z", alertSent: "recovered" }),
      stored({ checkedAt: "2026-10-22T06:50:00.000Z", alertSent: "down" }),
    ];
    expect(aDownEmailWentOutForThisServiceSince(checks, "2026-10-22T07:00:00.000Z")).toBe(false);
    expect(aDownEmailWentOutForThisServiceSince(checks, "2026-10-22T06:00:00.000Z")).toBe(true);
  });

  it("caps a flapping service at one down email per Pacific day", () => {
    const now = new Date("2026-10-22T20:00:00.000Z");
    const flapped = [
      stored({ status: "working", checkedAt: "2026-10-22T19:50:00.000Z", alertSent: "recovered" }),
      stored({ status: "down", checkedAt: "2026-10-22T18:00:00.000Z", alertSent: "down" }),
      stored({ status: "working", checkedAt: "2026-10-22T17:50:00.000Z" }),
    ];
    const newOutage = { status: "down" as const, failureKind: "out_of_credits" as const };
    expect(isOutageWorthReporting(newOutage, flapped)).toBe(true);
    expect(aDownEmailWentOutForThisServiceSince(flapped, startOfPacificDay(now).toISOString())).toBe(true);
    const nextDay = new Date("2026-10-23T16:00:00.000Z");
    expect(aDownEmailWentOutForThisServiceSince(flapped, startOfPacificDay(nextDay).toISOString())).toBe(false);
  });

  it("sends no fixed email for a flap whose down email was suppressed", () => {
    expect(
      isRecoveryAwaitingReport({ status: "working" }, [
        stored({ status: "down" }),
        stored({ status: "down" }),
        stored({ status: "working", alertSent: "recovered" }),
        stored({ status: "down", alertSent: "down" }),
      ])
    ).toBe(false);
  });
});

describe("Pacific day", () => {
  it("starts at 07:00 UTC in daylight time and 08:00 UTC in standard time", () => {
    expect(startOfPacificDay(new Date("2026-10-22T03:00:00.000Z")).toISOString()).toBe("2026-10-21T07:00:00.000Z");
    expect(startOfPacificDay(new Date("2026-12-01T20:00:00.000Z")).toISOString()).toBe("2026-12-01T08:00:00.000Z");
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

describe("buildAiHealthAlertEmail", () => {
  const outage = {
    service: "claude" as const,
    failureKind: "out_of_credits" as const,
    failureDetail: "400: Your credit balance is too low",
    downSinceIso: "2026-10-21T17:00:00.000Z",
  };

  it("says what breaks for practices, who fixes it, and when emails are sent", () => {
    const email = buildAiHealthAlertEmail({ outages: [outage], recoveries: [] });
    expect(email.subject).toContain("down");
    expect(email.subject).toContain("credit balance");
    expect(email.text).toContain("PDF");
    expect(email.text).toContain("Anthropic Console");
    expect(email.text).toContain("Your credit balance is too low");
    expect(email.text).toContain(ALERT_EMAIL_RULE_NOTICE);
    expect(email.text).not.toMatch(/\u2014/);
  });

  it("reports a recovery with how long the outage lasted", () => {
    const email = buildAiHealthAlertEmail({
      outages: [],
      recoveries: [
        { service: "claude", downSinceIso: "2026-10-21T17:00:00.000Z", recoveredAtIso: "2026-10-21T19:30:00.000Z" },
      ],
    });
    expect(email.subject).toContain("back");
    expect(email.text).toContain("2 hours 30 minutes");
  });

  it("leads with the outage when the email has both", () => {
    const email = buildAiHealthAlertEmail({
      outages: [outage],
      recoveries: [
        { service: "claude", downSinceIso: "2026-10-21T10:00:00.000Z", recoveredAtIso: "2026-10-21T11:00:00.000Z" },
      ],
    });
    expect(email.subject).toContain("down");
    expect(email.text).toContain("working again");
  });

  it("escapes HTML in the provider's message", () => {
    const email = buildAiHealthAlertEmail({
      outages: [{ ...outage, failureKind: "unexpected_response", failureDetail: "<script>x</script>" }],
      recoveries: [],
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
