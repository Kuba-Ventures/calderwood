// GET /api/agent/orders — paid report unlocks, newest first, for the Content Hub
// (x-agent-key). Only what's needed to answer "did they pay" and to refund:
// practice name, email, status, dates, amount. No zip, phone, uploads, report
// numbers or card details. ?paid=all also lists practices that haven't paid
// (signups still in the pipeline). ?limit= up to 100 (default 30).

import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { agentKeyRejection } from "@/lib/agent/guard";
import { uncachedServiceSupabase } from "@/lib/db/server";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  practice_name: string | null;
  email: string;
  status: string;
  created_at: string;
  paid_at: string | null;
  stripe_payment_id: string | null;
};

async function payment(paymentId: string | null) {
  // Card payments are payment intents; a $0 founding-code checkout stores the
  // checkout session id instead and has nothing to refund.
  if (!paymentId) return null;
  if (!paymentId.startsWith("pi_")) return { kind: "free_promo" as const, amountCents: 0, refundedCents: 0 };
  try {
    const pi = await stripe().paymentIntents.retrieve(paymentId, { expand: ["latest_charge"] });
    const charge = pi.latest_charge as Stripe.Charge | null;
    return { kind: "card" as const, amountCents: pi.amount_received, refundedCents: charge?.amount_refunded ?? 0 };
  } catch {
    return { kind: "card" as const, amountCents: null, refundedCents: null };
  }
}

export async function GET(request: Request) {
  const denied = agentKeyRejection(request);
  if (denied) return denied;
  const params = new URL(request.url).searchParams;
  const limit = Math.min(Math.max(Number(params.get("limit")) || 30, 1), 100);
  const includeUnpaid = params.get("paid") === "all";

  let query = uncachedServiceSupabase()
    .from("practices")
    .select("id, practice_name, email, status, created_at, paid_at, stripe_payment_id");
  query = includeUnpaid
    ? query.order("created_at", { ascending: false })
    : query.not("paid_at", "is", null).order("paid_at", { ascending: false });
  const { data, error } = await query.limit(limit);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as Row[];
  const payments = await Promise.all(rows.map((r) => (r.paid_at ? payment(r.stripe_payment_id) : null)));
  return NextResponse.json({
    orders: rows.map((r, i) => ({
      practiceId: r.id,
      practiceName: r.practice_name,
      email: r.email,
      status: r.status,
      signedUpAt: r.created_at,
      paidAt: r.paid_at,
      paymentId: r.stripe_payment_id,
      payment: payments[i],
    })),
  });
}
