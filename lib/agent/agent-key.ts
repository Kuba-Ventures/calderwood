// The agents' key: a separate, narrow credential for Finley's AI agents
// (through the Content Hub), never ADMIN_PASSWORD or the Stripe/Supabase keys.
// It reaches only /api/agent/* routes, which read the report price, promo codes
// and paid orders, and make a short allow-list of changes (actions.ts).
// Unset AGENT_KEY = the routes are off (fail closed). Rotate or remove it
// without touching admin. Pure (no next/server import) so it can be unit tested.

import { createHash, timingSafeEqual } from "node:crypto";

type Env = Record<string, string | undefined>;

const digest = (value: string) => createHash("sha256").update(value).digest();

/** True only when AGENT_KEY is set and `key` matches it (timing-safe). */
export function isAgentKey(key: unknown, env: Env = process.env): boolean {
  const want = env.AGENT_KEY;
  if (!want || typeof key !== "string" || !key) return false;
  return timingSafeEqual(digest(key), digest(want));
}
