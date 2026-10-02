// Forwards mail received by Resend for sales@newfeeschedule.com to the team.
//
// Flow (per Resend receiving docs): the email.received webhook carries only
// metadata, so we GET /emails/receiving/{id} for the body, GET
// /emails/receiving/{id}/attachments for short-lived download URLs, download
// each attachment, and re-send everything with POST /emails. The send uses an
// Idempotency-Key derived from the received email id, so webhook retries do
// not produce duplicate forwards (Resend keeps keys for 24h).
//
// Logging rule: ids and domains only. Never log bodies or full addresses.

const RESEND_API = "https://api.resend.com";

export const SALES_ADDRESS = "sales@newfeeschedule.com";
export const DEFAULT_FORWARD_TO = [
  "finley@qsbsrollover.com",
  "calderwoodra1113@gmail.com",
];
export const DEFAULT_FORWARD_FROM =
  "New Fee Schedule <forwarding@newfeeschedule.com>";
export const SUBJECT_PREFIX = "[sales@] ";

// Resend caps a send at 40MB after base64 encoding. Leave headroom for the
// body and JSON envelope.
export const MAX_ATTACHMENT_BASE64_BYTES = 38 * 1024 * 1024;

export type FetchLike = typeof fetch;

export type ReceivedEvent = {
  type: string;
  created_at?: string;
  data?: {
    email_id?: string;
    from?: string;
    to?: string[];
    cc?: string[];
    bcc?: string[];
    received_for?: string[];
    subject?: string;
  };
};

export type ReceivedEmail = {
  id: string;
  from: string;
  to: string[];
  cc?: string[];
  subject: string | null;
  html: string | null;
  text: string | null;
  created_at: string;
  reply_to?: string[];
  headers?: Record<string, string>;
};

export type ReceivedAttachment = {
  id: string;
  filename: string | null;
  size: number;
  content_type: string | null;
  content_disposition: string | null;
  content_id: string | null;
  download_url: string;
};

export type OutboundAttachment = {
  filename: string;
  content: string; // base64
  content_type?: string;
  content_id?: string;
};

export type ForwardConfig = {
  apiKey: string;
  to: string[];
  from: string;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ForwardConfig | null {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) return null;
  const to = (env.INBOUND_FORWARD_TO ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    apiKey,
    to: to.length ? to : DEFAULT_FORWARD_TO,
    from: env.INBOUND_FORWARD_FROM?.trim() || DEFAULT_FORWARD_FROM,
  };
}

/** "Jane Doe <Jane@Example.com>" -> "jane@example.com" */
export function bareAddress(value: string): string {
  const m = value.match(/<([^>]+)>/);
  return (m ? m[1] : value).trim().toLowerCase();
}

export function domainOf(value: string): string {
  const addr = bareAddress(value);
  const at = addr.lastIndexOf("@");
  return at >= 0 ? addr.slice(at + 1) : "unknown";
}

/** True when the event is an email.received addressed to sales@. */
export function isSalesEmail(event: ReceivedEvent): boolean {
  if (event.type !== "email.received" || !event.data?.email_id) return false;
  const d = event.data;
  const recipients = [
    ...(d.to ?? []),
    ...(d.cc ?? []),
    ...(d.bcc ?? []),
    ...(d.received_for ?? []),
  ].map(bareAddress);
  return recipients.includes(SALES_ADDRESS);
}

/** Avoid forwarding loops if a forward ever bounces back into the inbox. */
export function isFromForwarder(event: ReceivedEvent, cfg: ForwardConfig): boolean {
  const from = event.data?.from;
  return !!from && bareAddress(from) === bareAddress(cfg.from);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildForwardPayload(
  email: ReceivedEmail,
  attachments: OutboundAttachment[],
  skipped: string[],
  cfg: ForwardConfig
) {
  const originalFrom = email.headers?.from || email.from;
  const originalTo = email.to.join(", ");
  const subject = SUBJECT_PREFIX + (email.subject?.trim() || "(no subject)");

  const headerLine = `Forwarded from ${SALES_ADDRESS}. From: ${originalFrom}. To: ${originalTo}. Date: ${email.created_at}.`;
  const skippedLine = skipped.length
    ? `Attachments not included (too large to forward, open in Resend): ${skipped.join(", ")}.`
    : "";

  const textHeader = [headerLine, skippedLine].filter(Boolean).join("\n");
  const htmlHeader =
    `<div style="font:14px/1.5 sans-serif;color:#333;border-bottom:1px solid #ccc;padding-bottom:8px;margin-bottom:12px">` +
    [headerLine, skippedLine].filter(Boolean).map(escapeHtml).join("<br>") +
    `</div>`;

  const payload: Record<string, unknown> = {
    from: cfg.from,
    to: cfg.to,
    subject,
    reply_to: email.reply_to?.length ? email.reply_to : [bareAddress(email.from)],
  };

  if (email.html) payload.html = htmlHeader + email.html;
  // With html and no text, let Resend derive the text part from the html.
  if (email.text || !email.html) {
    payload.text = `${textHeader}\n\n${email.text ?? ""}`;
  }
  if (attachments.length) payload.attachments = attachments;
  return payload;
}

async function resendJson<T>(
  f: FetchLike,
  apiKey: string,
  path: string
): Promise<T> {
  const res = await f(`${RESEND_API}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`GET ${path.split("/").slice(0, 3).join("/")} failed: ${res.status}`);
  return (await res.json()) as T;
}

async function collectAttachments(
  f: FetchLike,
  cfg: ForwardConfig,
  emailId: string
): Promise<{ attachments: OutboundAttachment[]; skipped: string[] }> {
  const list = await resendJson<{ data: ReceivedAttachment[] }>(
    f,
    cfg.apiKey,
    `/emails/receiving/${emailId}/attachments?limit=100`
  );
  const attachments: OutboundAttachment[] = [];
  const skipped: string[] = [];
  let budget = MAX_ATTACHMENT_BASE64_BYTES;

  for (const a of list.data ?? []) {
    const name = a.filename || `attachment-${a.id}`;
    const encodedSize = Math.ceil((a.size || 0) / 3) * 4;
    if (encodedSize > budget) {
      skipped.push(name);
      continue;
    }
    const res = await f(a.download_url);
    if (!res.ok) throw new Error(`attachment download failed: ${res.status}`);
    const content = Buffer.from(await res.arrayBuffer()).toString("base64");
    if (content.length > budget) {
      skipped.push(name);
      continue;
    }
    budget -= content.length;
    attachments.push({
      filename: name,
      content,
      ...(a.content_type ? { content_type: a.content_type } : {}),
      ...(a.content_id ? { content_id: a.content_id.replace(/^<|>$/g, "") } : {}),
    });
  }
  return { attachments, skipped };
}

/** Fetches the received email and sends the forward. Throws on failure. */
export async function forwardReceivedEmail(
  emailId: string,
  cfg: ForwardConfig,
  f: FetchLike = fetch
): Promise<{ sentId: string | null; attachments: number; skipped: number }> {
  const email = await resendJson<ReceivedEmail>(
    f,
    cfg.apiKey,
    `/emails/receiving/${emailId}`
  );
  const { attachments, skipped } = await collectAttachments(f, cfg, emailId);
  const payload = buildForwardPayload(email, attachments, skipped, cfg);

  const res = await f(`${RESEND_API}/emails`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `inbound-forward/${emailId}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`POST /emails failed: ${res.status}`);
  const body = (await res.json().catch(() => ({}))) as { id?: string };
  return {
    sentId: body.id ?? null,
    attachments: attachments.length,
    skipped: skipped.length,
  };
}
