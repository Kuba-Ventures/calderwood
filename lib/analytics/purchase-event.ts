// GA4 ecommerce "purchase" event for the one-time report unlock. Pure so it can
// be unit tested without Stripe or Supabase. The dashboard verifies the
// Checkout Session server-side, builds the event here, and a tiny client
// component pushes it to the GTM dataLayer once.
//
// Only real paid conversions count: the session must be paid, belong to the
// signed-in practice, and have a total above $0 (free founding unlocks with a
// 100% off code are not ad conversions). No personal data goes in the event.

export const REPORT_ITEM_ID = "fee-iq-report";
export const REPORT_ITEM_NAME = "Fee IQ full report";

/** The subset of a Stripe Checkout Session this module reads. */
export type CheckoutSessionLike = {
  id: string;
  payment_status: string;
  amount_total: number | null;
  client_reference_id: string | null;
  metadata: Record<string, string> | null;
};

export type PurchaseEvent = {
  event: "purchase";
  ecommerce: {
    transaction_id: string;
    value: number;
    currency: "USD";
    items: Array<{
      item_id: string;
      item_name: string;
      price: number;
      quantity: number;
    }>;
  };
};

/** Stripe Checkout Session ids look like cs_test_... or cs_live_... */
export function isCheckoutSessionId(value: unknown): value is string {
  return typeof value === "string" && /^cs_[A-Za-z0-9_]{1,250}$/.test(value);
}

export function buildPurchaseEvent(
  session: CheckoutSessionLike,
  practiceId: string
): PurchaseEvent | null {
  if (session.payment_status !== "paid") return null;
  const owned =
    session.client_reference_id === practiceId ||
    session.metadata?.practice_id === practiceId;
  if (!owned) return null;
  const cents = session.amount_total;
  if (typeof cents !== "number" || !Number.isFinite(cents) || cents <= 0) {
    return null;
  }
  const value = cents / 100;
  return {
    event: "purchase",
    ecommerce: {
      transaction_id: session.id,
      value,
      currency: "USD",
      items: [
        {
          item_id: REPORT_ITEM_ID,
          item_name: REPORT_ITEM_NAME,
          price: value,
          quantity: 1,
        },
      ],
    },
  };
}
