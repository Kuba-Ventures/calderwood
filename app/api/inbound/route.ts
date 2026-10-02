// POST /api/inbound: Resend email.received webhook. Mail to
// sales@newfeeschedule.com is forwarded to the team (INBOUND_FORWARD_TO).
//
// 401 when RESEND_WEBHOOK_SECRET is unset or the Svix signature is invalid.
// 200 for events we ignore (other types, other recipients, our own forwards).
// 500 when the forward fails, so Resend retries. Retries are deduped by the
// Idempotency-Key on the send (see lib/inbound/forward.ts).

import { NextResponse } from "next/server";
import { verifyWebhook } from "@/lib/inbound/verify";
import {
  domainOf,
  forwardReceivedEmail,
  isFromForwarder,
  isSalesEmail,
  loadConfig,
  type ReceivedEvent,
} from "@/lib/inbound/forward";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  // Raw body is required for signature verification. Do not JSON.parse first.
  const raw = await request.text();

  const verified = verifyWebhook(
    raw,
    {
      id: request.headers.get("svix-id"),
      timestamp: request.headers.get("svix-timestamp"),
      signature: request.headers.get("svix-signature"),
    },
    secret ?? ""
  );
  if (!verified.ok) {
    console.warn(`[inbound] rejected webhook: ${verified.reason}`);
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let event: ReceivedEvent;
  try {
    event = JSON.parse(raw) as ReceivedEvent;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (!isSalesEmail(event)) {
    return NextResponse.json({ ignored: true });
  }

  const emailId = event.data!.email_id!;
  const cfg = loadConfig();
  if (!cfg) {
    console.error(`[inbound] RESEND_API_KEY not configured; email ${emailId} not forwarded`);
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }
  if (isFromForwarder(event, cfg)) {
    return NextResponse.json({ ignored: true, reason: "loop" });
  }

  const senderDomain = event.data?.from ? domainOf(event.data.from) : "unknown";
  try {
    const result = await forwardReceivedEmail(emailId, cfg);
    console.log(
      `[inbound] forwarded email ${emailId} from domain ${senderDomain} as ${result.sentId} (attachments ${result.attachments}, skipped ${result.skipped})`
    );
    return NextResponse.json({ forwarded: true, id: result.sentId });
  } catch (err) {
    console.error(
      `[inbound] forward failed for email ${emailId} from domain ${senderDomain}: ${err instanceof Error ? err.message : "unknown error"}`
    );
    return NextResponse.json({ error: "forward failed" }, { status: 500 });
  }
}
