// Which Stripe credentials this deployment uses. Pure (no server-only import)
// so it can be unit tested.
//
// Production uses the live account: STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET.
// Preview and local deployments prefer the sandbox (test-mode) credentials,
// STRIPE_SANDBOX_SECRET_KEY / STRIPE_SANDBOX_WEBHOOK_SECRET, so a PR preview
// can never charge a real card. Production never reads the sandbox names, even
// if one is set there by mistake.

type Env = Record<string, string | undefined>;

const isProduction = (env: Env) => env.VERCEL_ENV === "production";

function pick(env: Env, live: string, sandbox: string): string | undefined {
  if (isProduction(env)) return env[live] || undefined;
  return env[sandbox] || env[live] || undefined;
}

/** Secret API key for this deployment, or undefined when unset. */
export function stripeSecretKey(env: Env = process.env): string | undefined {
  return pick(env, "STRIPE_SECRET_KEY", "STRIPE_SANDBOX_SECRET_KEY");
}

/** Webhook signing secret for this deployment, or undefined when unset. */
export function stripeWebhookSecret(env: Env = process.env): string | undefined {
  return pick(env, "STRIPE_WEBHOOK_SECRET", "STRIPE_SANDBOX_WEBHOOK_SECRET");
}
