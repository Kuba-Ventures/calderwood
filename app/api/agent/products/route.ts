// GET /api/agent/products — what the site sells, for the Content Hub (x-agent-key).
// One product: the report unlock. Its price is a code constant
// (REPORT_PRICE_USD_CENTS), so nothing here is editable; a price change is a PR.

import { NextResponse } from "next/server";
import { agentKeyRejection } from "@/lib/agent/guard";
import { REPORT_PRICE_USD_CENTS } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = agentKeyRejection(request);
  if (denied) return denied;
  return NextResponse.json({
    products: [
      {
        id: "report",
        title: "New Fee Schedule Fee IQ: full report",
        priceCents: REPORT_PRICE_USD_CENTS,
        currency: "usd",
        active: true,
      },
    ],
    editable: [],
    note: "Price is set in code (lib/stripe.ts). Discounts are Stripe promotion codes: /api/agent/promo-codes.",
  });
}
