// Server-only Stripe client. Constructed lazily so missing keys fail at the
// call site (with a clear message) rather than at import time.

import "server-only";
import Stripe from "stripe";
import { stripeSecretKey } from "@/lib/stripe-env";

export const REPORT_PRICE_USD_CENTS = 19900; // $199 one-time unlock.

let cached: Stripe | null = null;

export function stripe(): Stripe {
  if (cached) return cached;
  // Live key in production, sandbox key on previews (see lib/stripe-env.ts).
  const key = stripeSecretKey();
  if (!key) throw new Error("Stripe secret key is not configured for this environment.");
  cached = new Stripe(key);
  return cached;
}
