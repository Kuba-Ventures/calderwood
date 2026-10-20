import { describe, expect, it } from "vitest";
import { stripeSecretKey, stripeWebhookSecret } from "./stripe-env";

const both = {
  STRIPE_SECRET_KEY: "sk_live_x",
  STRIPE_WEBHOOK_SECRET: "whsec_live",
  STRIPE_SANDBOX_SECRET_KEY: "sk_test_x",
  STRIPE_SANDBOX_WEBHOOK_SECRET: "whsec_test",
};

describe("stripe credentials by environment", () => {
  it("production uses the live keys and never the sandbox ones", () => {
    const env = { ...both, VERCEL_ENV: "production" };
    expect(stripeSecretKey(env)).toBe("sk_live_x");
    expect(stripeWebhookSecret(env)).toBe("whsec_live");
  });

  it("production with only sandbox keys set reports them missing", () => {
    const env = {
      VERCEL_ENV: "production",
      STRIPE_SANDBOX_SECRET_KEY: "sk_test_x",
      STRIPE_SANDBOX_WEBHOOK_SECRET: "whsec_test",
    };
    expect(stripeSecretKey(env)).toBeUndefined();
    expect(stripeWebhookSecret(env)).toBeUndefined();
  });

  it("preview prefers the sandbox keys over the live ones", () => {
    const env = { ...both, VERCEL_ENV: "preview" };
    expect(stripeSecretKey(env)).toBe("sk_test_x");
    expect(stripeWebhookSecret(env)).toBe("whsec_test");
  });

  it("local dev (no VERCEL_ENV) falls back to the standard names", () => {
    const env = { STRIPE_SECRET_KEY: "sk_test_local", STRIPE_WEBHOOK_SECRET: "whsec_local" };
    expect(stripeSecretKey(env)).toBe("sk_test_local");
    expect(stripeWebhookSecret(env)).toBe("whsec_local");
  });

  it("treats empty strings as unset", () => {
    const env = { VERCEL_ENV: "preview", STRIPE_SANDBOX_SECRET_KEY: "", STRIPE_SECRET_KEY: "" };
    expect(stripeSecretKey(env)).toBeUndefined();
  });
});
