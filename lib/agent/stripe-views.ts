// Plain views of Stripe coupons and promotion codes for the agent routes
// (amounts in cents, dates as ISO strings).

import type Stripe from "stripe";

const unix = (t: number | null | undefined) => (t ? new Date(t * 1000).toISOString() : null);

export const couponView = (c: Stripe.Coupon) => ({
  id: c.id,
  name: c.name,
  percentOff: c.percent_off,
  amountOffCents: c.amount_off,
  valid: c.valid,
  timesRedeemed: c.times_redeemed,
  maxRedemptions: c.max_redemptions,
  redeemBy: unix(c.redeem_by),
});

export const promoView = (p: Stripe.PromotionCode) => {
  const coupon = p.promotion?.coupon;
  return {
    id: p.id,
    code: p.code,
    active: p.active,
    couponId: typeof coupon === "string" ? coupon : coupon?.id ?? null,
    timesRedeemed: p.times_redeemed,
    maxRedemptions: p.max_redemptions,
    expiresAt: unix(p.expires_at),
    createdAt: unix(p.created),
  };
};
