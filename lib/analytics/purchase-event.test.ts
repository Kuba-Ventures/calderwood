import { describe, expect, it } from "vitest";
import {
  buildPurchaseEvent,
  isCheckoutSessionId,
  type CheckoutSessionLike,
} from "./purchase-event";

const PRACTICE = "11111111-2222-3333-4444-555555555555";

function session(over: Partial<CheckoutSessionLike> = {}): CheckoutSessionLike {
  return {
    id: "cs_test_abc123",
    payment_status: "paid",
    amount_total: 19900,
    client_reference_id: PRACTICE,
    metadata: { practice_id: PRACTICE },
    ...over,
  };
}

describe("buildPurchaseEvent", () => {
  it("builds a GA4 purchase event for a paid $199 session", () => {
    expect(buildPurchaseEvent(session(), PRACTICE)).toEqual({
      event: "purchase",
      ecommerce: {
        transaction_id: "cs_test_abc123",
        value: 199,
        currency: "USD",
        items: [
          {
            item_id: "fee-iq-report",
            item_name: "Fee IQ full report",
            price: 199,
            quantity: 1,
          },
        ],
      },
    });
  });

  it("uses the discounted total when a partial promo code applied", () => {
    const ev = buildPurchaseEvent(session({ amount_total: 9950 }), PRACTICE);
    expect(ev?.ecommerce.value).toBe(99.5);
    expect(ev?.ecommerce.items[0].price).toBe(99.5);
  });

  it("skips free founding unlocks ($0 total)", () => {
    expect(buildPurchaseEvent(session({ amount_total: 0 }), PRACTICE)).toBeNull();
    expect(buildPurchaseEvent(session({ amount_total: null }), PRACTICE)).toBeNull();
  });

  it("skips sessions that are not paid", () => {
    expect(
      buildPurchaseEvent(session({ payment_status: "unpaid" }), PRACTICE)
    ).toBeNull();
    expect(
      buildPurchaseEvent(session({ payment_status: "no_payment_required" }), PRACTICE)
    ).toBeNull();
  });

  it("skips sessions that belong to another practice", () => {
    expect(
      buildPurchaseEvent(
        session({ client_reference_id: "other", metadata: { practice_id: "other" } }),
        PRACTICE
      )
    ).toBeNull();
  });

  it("accepts ownership from either client_reference_id or metadata", () => {
    expect(
      buildPurchaseEvent(session({ client_reference_id: null }), PRACTICE)
    ).not.toBeNull();
    expect(buildPurchaseEvent(session({ metadata: null }), PRACTICE)).not.toBeNull();
  });

  it("carries no personal data", () => {
    const json = JSON.stringify(buildPurchaseEvent(session(), PRACTICE));
    expect(json).not.toContain(PRACTICE);
    expect(json).not.toContain("@");
  });
});

describe("isCheckoutSessionId", () => {
  it("accepts Stripe Checkout Session ids", () => {
    expect(isCheckoutSessionId("cs_test_a1B2c3")).toBe(true);
    expect(isCheckoutSessionId("cs_live_a1B2c3")).toBe(true);
  });

  it("rejects anything else, including the unfilled template", () => {
    expect(isCheckoutSessionId("{CHECKOUT_SESSION_ID}")).toBe(false);
    expect(isCheckoutSessionId("pi_123")).toBe(false);
    expect(isCheckoutSessionId("")).toBe(false);
    expect(isCheckoutSessionId(["cs_test_a"])).toBe(false);
    expect(isCheckoutSessionId(undefined)).toBe(false);
  });
});
