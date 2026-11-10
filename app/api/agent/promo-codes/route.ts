// /api/agent/promo-codes — Stripe promotion codes (founding-practice discounts)
// for the Content Hub (x-agent-key).
//   GET  lists codes and the coupons they can be attached to.
//   POST creates a new code on an EXISTING coupon, after Finley approved it.
// Coupons (the discount amounts) are never created or changed here.

import { NextResponse } from "next/server";
import { agentKeyRejection, logAgentAction } from "@/lib/agent/guard";
import { PROMO_CODE_FIELDS, parsePromoCodeCreate } from "@/lib/agent/actions";
import { stripe } from "@/lib/stripe";
import { couponView, promoView } from "@/lib/agent/stripe-views";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = agentKeyRejection(request);
  if (denied) return denied;
  try {
    const [codes, coupons] = await Promise.all([
      stripe().promotionCodes.list({ limit: 100 }),
      stripe().coupons.list({ limit: 100 }),
    ]);
    return NextResponse.json({
      promoCodes: codes.data.map(promoView),
      coupons: coupons.data.map(couponView),
      editable: PROMO_CODE_FIELDS,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Stripe read failed" }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const denied = agentKeyRejection(request);
  if (denied) return denied;
  const parsed = parsePromoCodeCreate(await request.json().catch(() => null));
  if ("error" in parsed) return NextResponse.json(parsed, { status: 400 });
  try {
    const coupon = await stripe().coupons.retrieve(parsed.couponId).catch(() => null);
    if (!coupon) return NextResponse.json({ error: "No such coupon" }, { status: 404 });
    if (!coupon.valid) return NextResponse.json({ error: "That coupon is no longer valid" }, { status: 409 });
    const created = await stripe().promotionCodes.create(
      {
        promotion: { type: "coupon", coupon: coupon.id },
        code: parsed.code,
        ...(parsed.maxRedemptions !== null ? { max_redemptions: parsed.maxRedemptions } : {}),
        ...(parsed.expiresAt ? { expires_at: Math.floor(parsed.expiresAt.getTime() / 1000) } : {}),
        metadata: { approval: parsed.approval, reason: parsed.reason.slice(0, 200), source: "agent-key" },
      },
      { idempotencyKey: `agent-promo-${parsed.approval}` }
    );
    const after = promoView(created);
    logAgentAction({ action: "promo-code.create", promoCodeId: created.id, changed: { promoCode: { from: null, to: after } }, approval: parsed.approval, reason: parsed.reason });
    return NextResponse.json({ promoCode: after, coupon: couponView(coupon) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Stripe refused the code" }, { status: 400 });
  }
}
