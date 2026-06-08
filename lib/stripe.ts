// Server-only Stripe client. Constructed lazily so missing keys fail at the
// call site (with a clear message) rather than at import time.

import "server-only";
import Stripe from "stripe";

export const REPORT_PRICE_USD_CENTS = 19900; // $199 one-time unlock.

let cached: Stripe | null = null;

export function stripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured.");
  cached = new Stripe(key);
  return cached;
}
