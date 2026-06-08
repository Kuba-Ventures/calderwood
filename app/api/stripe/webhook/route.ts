// POST /api/stripe/webhook — Stripe -> Calderwood. The ONLY thing that unlocks a
// report. Verifies the signature, and on checkout.session.completed stamps
// practices.paid_at + stripe_payment_id and flips status to delivered. After
// this, /api/report returns the full (un-redacted) numbers. Unlock persists
// because it lives in the DB — survives refresh, new device, re-login.
//
// Configure the endpoint in the Stripe dashboard (or `stripe listen
// --forward-to localhost:3000/api/stripe/webhook` locally) and put the signing
// secret in STRIPE_WEBHOOK_SECRET.

import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { serviceSupabase } from "@/lib/db/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET not configured" },
      { status: 500 }
    );
  }

  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  // Raw body is required for signature verification — do not JSON.parse first.
  const raw = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    return NextResponse.json(
      { error: `signature verification failed: ${err instanceof Error ? err.message : err}` },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const practiceId =
      session.metadata?.practice_id ?? session.client_reference_id ?? null;
    if (practiceId && session.payment_status === "paid") {
      const paymentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? session.id;
      const nowIso = new Date(event.created * 1000).toISOString();
      const service = serviceSupabase();
      const { error } = await service
        .from("practices")
        .update({
          paid_at: nowIso,
          stripe_payment_id: paymentId,
          status: "delivered",
        })
        .eq("id", practiceId);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      // Best-effort: stamp the report's delivered_at too.
      await service
        .from("reports")
        .update({ delivered_at: nowIso })
        .eq("practice_id", practiceId);
    }
  }

  return NextResponse.json({ received: true });
}
