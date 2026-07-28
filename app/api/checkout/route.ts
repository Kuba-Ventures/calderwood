// POST /api/checkout — create a one-time $199 Stripe Checkout Session to unlock
// the signed-in user's report. Returns { url } for the client to redirect to.
//
// Guard rails: must be signed in, must have a report that's actually ready, and
// not already paid. The practice id rides in metadata + client_reference_id so
// the webhook can mark the right report paid.

import { NextResponse } from "next/server";
import { serverSupabase, serviceSupabase } from "@/lib/db/server";
import { getPracticeByEmail } from "@/lib/db/practices";
import { REPORT_PRICE_USD_CENTS, stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

function originFrom(request: Request): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, "");
  const host = request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

export async function POST(request: Request) {
  const sb = serverSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const service = serviceSupabase();
  const practice = await getPracticeByEmail(service, user.email);
  if (!practice) {
    return NextResponse.json({ error: "no practice found" }, { status: 404 });
  }
  if (practice.paid_at) {
    // Already unlocked — nothing to buy.
    return NextResponse.json({ url: `${originFrom(request)}/dashboard?paid=1` });
  }
  if (practice.status !== "report_ready" && practice.status !== "delivered") {
    return NextResponse.json(
      { error: "report_not_ready" },
      { status: 400 }
    );
  }

  const origin = originFrom(request);
  try {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      client_reference_id: practice.id,
      metadata: { practice_id: practice.id },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: REPORT_PRICE_USD_CENTS,
            product_data: {
              name: "New Fee Schedule Fee IQ — full report",
              description:
                "Code-by-code underpayment, carrier ranking, and PDF.",
            },
          },
        },
      ],
      success_url: `${origin}/dashboard?paid=1`,
      cancel_url: `${origin}/reports`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "checkout failed" },
      { status: 500 }
    );
  }
}
