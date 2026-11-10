// POST /api/agent/orders/:practiceId/refund — refund one paid report, full or
// partial (amountCents), after Finley approved it on the Content Hub. Stripe's
// idempotency key is the approval, so one approval refunds once. The report
// stays unlocked (paid_at is not touched); re-locking is a manual call.

import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { agentKeyRejection, logAgentAction } from "@/lib/agent/guard";
import { isPracticeId, parseRefund } from "@/lib/agent/actions";
import { uncachedServiceSupabase } from "@/lib/db/server";
import { REPORT_PRICE_USD_CENTS, stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { practiceId: string } }) {
  const denied = agentKeyRejection(request);
  if (denied) return denied;
  const practiceId = params.practiceId;
  if (!isPracticeId(practiceId)) return NextResponse.json({ error: "Bad practice id" }, { status: 400 });

  const parsed = parseRefund(await request.json().catch(() => null), REPORT_PRICE_USD_CENTS);
  if ("error" in parsed) return NextResponse.json(parsed, { status: 400 });

  const { data: practice, error } = await uncachedServiceSupabase()
    .from("practices")
    .select("id, practice_name, email, paid_at, stripe_payment_id")
    .eq("id", practiceId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!practice) return NextResponse.json({ error: "No such practice" }, { status: 404 });
  const paymentId = practice.stripe_payment_id as string | null;
  if (!practice.paid_at || !paymentId) return NextResponse.json({ error: "This practice hasn't paid" }, { status: 409 });
  if (!paymentId.startsWith("pi_")) {
    return NextResponse.json({ error: "This report was unlocked with a free promo code; there is no payment to refund" }, { status: 409 });
  }

  try {
    const pi = await stripe().paymentIntents.retrieve(paymentId, { expand: ["latest_charge"] });
    const charge = pi.latest_charge as Stripe.Charge | null;
    const refundedBefore = charge?.amount_refunded ?? 0;
    const remaining = pi.amount_received - refundedBefore;
    if (remaining <= 0) return NextResponse.json({ error: "Already fully refunded" }, { status: 409 });
    if (parsed.amountCents !== null && parsed.amountCents > remaining) {
      return NextResponse.json({ error: `Only ${remaining} cents is left to refund` }, { status: 400 });
    }
    const refund = await stripe().refunds.create(
      {
        payment_intent: paymentId,
        ...(parsed.amountCents !== null ? { amount: parsed.amountCents } : {}),
        metadata: { approval: parsed.approval, reason: parsed.reason.slice(0, 200), practice_id: practiceId, source: "agent-key" },
      },
      { idempotencyKey: `agent-refund-${parsed.approval}` }
    );
    logAgentAction({
      action: "refund",
      practiceId,
      refund: refund.id,
      paymentId,
      changed: { refundedCents: { from: refundedBefore, to: refundedBefore + refund.amount } },
      status: refund.status,
      approval: parsed.approval,
      reason: parsed.reason,
    });
    return NextResponse.json({
      refund: { id: refund.id, amountCents: refund.amount, status: refund.status },
      order: { practiceId, practiceName: practice.practice_name, paidCents: pi.amount_received, refundedCents: refundedBefore + refund.amount },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Stripe refused the refund" }, { status: 400 });
  }
}
