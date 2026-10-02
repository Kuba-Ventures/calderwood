import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_FORWARD_FROM,
  DEFAULT_FORWARD_TO,
  MAX_ATTACHMENT_BASE64_BYTES,
  forwardReceivedEmail,
  isFromForwarder,
  isSalesEmail,
  loadConfig,
  type ForwardConfig,
} from "./forward";

const cfg: ForwardConfig = {
  apiKey: "re_test",
  to: DEFAULT_FORWARD_TO,
  from: DEFAULT_FORWARD_FROM,
};

function event(overrides: Record<string, unknown> = {}, type = "email.received") {
  return {
    type,
    data: {
      email_id: "e1",
      from: "Jane <jane@practice.com>",
      to: ["Sales <Sales@NewFeeSchedule.com>"],
      ...overrides,
    },
  };
}

describe("event filtering", () => {
  it("accepts email.received to sales@ (case and display name insensitive)", () => {
    expect(isSalesEmail(event())).toBe(true);
  });
  it("accepts sales@ in cc or received_for", () => {
    expect(isSalesEmail(event({ to: ["x@other.com"], cc: ["sales@newfeeschedule.com"] }))).toBe(true);
    expect(isSalesEmail(event({ to: [], received_for: ["sales@newfeeschedule.com"] }))).toBe(true);
  });
  it("ignores other recipients", () => {
    expect(isSalesEmail(event({ to: ["support@newfeeschedule.com"] }))).toBe(false);
  });
  it("ignores other event types", () => {
    expect(isSalesEmail(event({}, "email.delivered"))).toBe(false);
  });
  it("ignores events without an email id", () => {
    expect(isSalesEmail(event({ email_id: undefined }))).toBe(false);
  });
  it("detects our own forwards to avoid loops", () => {
    expect(isFromForwarder(event({ from: "forwarding@newfeeschedule.com" }), cfg)).toBe(true);
    expect(isFromForwarder(event(), cfg)).toBe(false);
  });
});

describe("loadConfig", () => {
  it("returns null without an API key", () => {
    expect(loadConfig({} as NodeJS.ProcessEnv)).toBeNull();
  });
  it("uses defaults", () => {
    expect(loadConfig({ RESEND_API_KEY: "k" } as unknown as NodeJS.ProcessEnv)).toEqual({
      apiKey: "k",
      to: DEFAULT_FORWARD_TO,
      from: DEFAULT_FORWARD_FROM,
    });
  });
  it("parses INBOUND_FORWARD_TO and INBOUND_FORWARD_FROM", () => {
    const c = loadConfig({
      RESEND_API_KEY: "k",
      INBOUND_FORWARD_TO: " a@x.com, b@y.com ,",
      INBOUND_FORWARD_FROM: "Fwd <f@x.com>",
    } as unknown as NodeJS.ProcessEnv);
    expect(c?.to).toEqual(["a@x.com", "b@y.com"]);
    expect(c?.from).toBe("Fwd <f@x.com>");
  });
});

type Route = (url: string, init?: RequestInit) => Response;

function mockFetch(attachments: unknown[], sendStatus = 200) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const route: Route = (url, init) => {
    if (url === "https://api.resend.com/emails/receiving/e1") {
      return Response.json({
        id: "e1",
        from: "jane@practice.com",
        to: ["sales@newfeeschedule.com"],
        subject: "Pricing question",
        html: "<p>Hello</p>",
        text: "Hello",
        created_at: "2026-10-02T12:00:00.000Z",
        reply_to: [],
        headers: { from: "Jane <jane@practice.com>" },
      });
    }
    if (url.startsWith("https://api.resend.com/emails/receiving/e1/attachments")) {
      return Response.json({ object: "list", has_more: false, data: attachments });
    }
    if (url.startsWith("https://cdn.test/")) {
      return new Response(Buffer.from("file-bytes"));
    }
    if (url === "https://api.resend.com/emails" && init?.method === "POST") {
      return Response.json({ id: "sent_1" }, { status: sendStatus });
    }
    return new Response("not found", { status: 404 });
  };
  const f = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return route(String(url), init);
  });
  return { f: f as unknown as typeof fetch, calls };
}

describe("forwardReceivedEmail", () => {
  it("builds the forward payload with header, reply_to, prefix, attachments, idempotency key", async () => {
    const { f, calls } = mockFetch([
      {
        id: "a1",
        filename: "fees.pdf",
        size: 10,
        content_type: "application/pdf",
        content_disposition: "attachment",
        content_id: null,
        download_url: "https://cdn.test/a1",
      },
      {
        id: "a2",
        filename: "logo.png",
        size: 10,
        content_type: "image/png",
        content_disposition: "inline",
        content_id: "<img001>",
        download_url: "https://cdn.test/a2",
      },
    ]);

    const result = await forwardReceivedEmail("e1", cfg, f);
    expect(result).toEqual({ sentId: "sent_1", attachments: 2, skipped: 0 });

    const send = calls.find((c) => c.url === "https://api.resend.com/emails")!;
    const headers = send.init!.headers as Record<string, string>;
    expect(headers["Idempotency-Key"]).toBe("inbound-forward/e1");
    expect(headers.Authorization).toBe("Bearer re_test");

    const payload = JSON.parse(String(send.init!.body));
    expect(payload.from).toBe(DEFAULT_FORWARD_FROM);
    expect(payload.to).toEqual(["finley@qsbsrollover.com", "calderwoodra1113@gmail.com"]);
    expect(payload.subject).toBe("[sales@] Pricing question");
    expect(payload.reply_to).toEqual(["jane@practice.com"]);
    expect(payload.html).toContain("From: Jane &lt;jane@practice.com&gt;");
    expect(payload.html).toContain("To: sales@newfeeschedule.com");
    expect(payload.html).toContain("Date: 2026-10-02T12:00:00.000Z");
    expect(payload.html).toContain("<p>Hello</p>");
    expect(payload.text).toMatch(/^Forwarded from sales@newfeeschedule.com\. From: Jane <jane@practice.com>/);
    expect(payload.text).toContain("Hello");
    expect(payload.attachments).toEqual([
      {
        filename: "fees.pdf",
        content: Buffer.from("file-bytes").toString("base64"),
        content_type: "application/pdf",
      },
      {
        filename: "logo.png",
        content: Buffer.from("file-bytes").toString("base64"),
        content_type: "image/png",
        content_id: "img001",
      },
    ]);
  });

  it("skips oversized attachments with a note and does not download them", async () => {
    const { f, calls } = mockFetch([
      {
        id: "big",
        filename: "huge.zip",
        size: MAX_ATTACHMENT_BASE64_BYTES,
        content_type: "application/zip",
        content_disposition: "attachment",
        content_id: null,
        download_url: "https://cdn.test/big",
      },
    ]);
    const result = await forwardReceivedEmail("e1", cfg, f);
    expect(result.skipped).toBe(1);
    expect(calls.some((c) => c.url === "https://cdn.test/big")).toBe(false);
    const payload = JSON.parse(String(calls.find((c) => c.url === "https://api.resend.com/emails")!.init!.body));
    expect(payload.attachments).toBeUndefined();
    expect(payload.text).toContain("Attachments not included (too large to forward, open in Resend): huge.zip.");
  });

  it("throws when the send fails so the route returns 500", async () => {
    const { f } = mockFetch([], 422);
    await expect(forwardReceivedEmail("e1", cfg, f)).rejects.toThrow("POST /emails failed: 422");
  });

  it("uses (no subject) when the subject is empty", async () => {
    const { f, calls } = mockFetch([]);
    const orig = f;
    const wrapped = (async (url: string | URL | Request, init?: RequestInit) => {
      const res = await orig(url, init);
      if (String(url) === "https://api.resend.com/emails/receiving/e1") {
        const j = await res.json();
        return Response.json({ ...j, subject: "" });
      }
      return res;
    }) as typeof fetch;
    await forwardReceivedEmail("e1", cfg, wrapped);
    const payload = JSON.parse(String(calls.find((c) => c.url === "https://api.resend.com/emails")!.init!.body));
    expect(payload.subject).toBe("[sales@] (no subject)");
  });
});
