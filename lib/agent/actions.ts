// What can be changed through the agent key. The key lives only in the Content
// Hub, which calls these routes when Finley taps Approve on a change an agent
// drafted (the agents never call writes themselves). Every change carries
// `approval` (the board approval id) and `reason`, and is logged.
//
// This site sells one thing: the $199 report unlock (REPORT_PRICE_USD_CENTS in
// lib/stripe.ts, a code constant, so it is read-only here). What the team
// changes from chat is Stripe promotion codes (founding-practice codes) and
// refunds. Auth, users, practice data, payouts, coupons themselves and deletes
// stay out.

export const PROMO_CODE_FIELDS = ["active"] as const;

export type Approved = { approval: string; reason: string };

const text = (v: unknown, max: number) =>
  typeof v === "string" && v.trim() && v.trim().length <= max ? v.trim() : null;

function approvedOrError(body: Record<string, unknown>): Approved | { error: string } {
  const approval = text(body.approval, 200);
  if (!approval) return { error: "approval (the board approval id) is required" };
  const reason = text(body.reason, 300);
  if (!reason) return { error: "reason is required" };
  return { approval, reason };
}

const asObject = (body: unknown) =>
  body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;

export type PromoCodeUpdate = Approved & { updates: { active?: boolean } };

/** PATCH /api/agent/promo-codes/:id — turn a promotion code on or off. */
export function parsePromoCodeUpdate(body: unknown): PromoCodeUpdate | { error: string } {
  const b = asObject(body);
  if (!b) return { error: "Send a JSON body" };
  const { changes } = b;
  if (!changes || typeof changes !== "object" || Array.isArray(changes)) return { error: "changes must be an object" };
  const ok = approvedOrError(b);
  if ("error" in ok) return ok;
  const updates: PromoCodeUpdate["updates"] = {};
  for (const [key, value] of Object.entries(changes as Record<string, unknown>)) {
    if (!(PROMO_CODE_FIELDS as readonly string[]).includes(key)) return { error: `${key} can't be changed by agents` };
    if (typeof value !== "boolean") return { error: "active must be true or false" };
    updates.active = value;
  }
  if (!Object.keys(updates).length) return { error: "Nothing to change" };
  return { ...ok, updates };
}

export type PromoCodeCreate = Approved & {
  code: string;
  couponId: string;
  maxRedemptions: number | null;
  expiresAt: Date | null;
};

const PROMO_CREATE_KEYS = ["code", "couponId", "maxRedemptions", "expiresAt", "approval", "reason"];

/**
 * POST /api/agent/promo-codes — a new customer-facing code on an EXISTING
 * Stripe coupon (e.g. another founding-practice code). Agents can't create or
 * change coupons, so the discount itself stays whatever Finley set in Stripe.
 */
export function parsePromoCodeCreate(body: unknown, now: Date = new Date()): PromoCodeCreate | { error: string } {
  const b = asObject(body);
  if (!b) return { error: "Send a JSON body" };
  for (const key of Object.keys(b)) {
    if (!PROMO_CREATE_KEYS.includes(key)) return { error: `${key} can't be set by agents` };
  }
  const ok = approvedOrError(b);
  if ("error" in ok) return ok;
  const code = typeof b.code === "string" ? b.code.trim().toUpperCase() : "";
  if (!/^[A-Z0-9]{3,30}$/.test(code)) return { error: "code must be 3 to 30 letters or digits" };
  const couponId = typeof b.couponId === "string" ? b.couponId.trim() : "";
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(couponId)) return { error: "couponId must be an existing Stripe coupon id" };
  let maxRedemptions: number | null = null;
  if (b.maxRedemptions !== undefined && b.maxRedemptions !== null) {
    const n = b.maxRedemptions;
    if (!Number.isInteger(n) || (n as number) < 1 || (n as number) > 1000) {
      return { error: "maxRedemptions must be a whole number from 1 to 1000" };
    }
    maxRedemptions = n as number;
  }
  let expiresAt: Date | null = null;
  if (b.expiresAt !== undefined && b.expiresAt !== null) {
    const at = typeof b.expiresAt === "string" ? new Date(b.expiresAt) : null;
    if (!at || Number.isNaN(at.getTime())) return { error: "expiresAt must be an ISO date" };
    if (at.getTime() <= now.getTime()) return { error: "expiresAt must be in the future" };
    expiresAt = at;
  }
  return { ...ok, code, couponId, maxRedemptions, expiresAt };
}

export type RefundRequest = Approved & { amountCents: number | null };

/**
 * POST /api/agent/orders/:practiceId/refund — the whole payment (amountCents
 * left out) or part of it, in cents (19900 = $199.00), never more than the
 * price paid.
 */
export function parseRefund(body: unknown, maxCents: number): RefundRequest | { error: string } {
  const b = asObject(body);
  if (!b) return { error: "Send a JSON body" };
  const ok = approvedOrError(b);
  if ("error" in ok) return ok;
  const { amountCents } = b;
  if (amountCents === undefined || amountCents === null) return { ...ok, amountCents: null };
  if (!Number.isInteger(amountCents) || (amountCents as number) <= 0 || (amountCents as number) > maxCents) {
    return { error: `amountCents must be a whole number of cents from 1 to ${maxCents}, or left out for a full refund` };
  }
  return { ...ok, amountCents: amountCents as number };
}

/** Practice ids are uuids; refuse anything else before it reaches a query. */
export const isPracticeId = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

/** Stripe promotion code ids look like promo_... */
export const isPromoCodeId = (id: string) => /^promo_[A-Za-z0-9]{1,100}$/.test(id);
