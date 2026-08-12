// Canonical site origin for browser-built redirect URLs (e.g. the Supabase
// password-recovery redirectTo).
//
// Why this exists: if we hand Supabase `window.location.origin`, the recovery
// link points at whatever host the user happened to be on when they asked for
// the reset. That host can be an alias that does not resolve (the bare apex
// `newfeeschedule.com` returns NXDOMAIN; only `www` is live), which strands the
// link. Pinning to one canonical origin means there is exactly one URL to add
// to the Supabase Redirect URLs allow-list, and every recovery link targets a
// host that actually loads.
//
// NEXT_PUBLIC_SITE_URL must be read with static `process.env.FOO` syntax so
// Webpack inlines it into the client bundle (see lib/db/client.ts).

const CONFIGURED_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

// Canonical origin without a trailing slash. Prefers the configured site URL;
// falls back to the current browser origin when it is unset (local dev, or
// before the env var lands).
export function browserSiteOrigin(): string {
  if (CONFIGURED_SITE_URL) return CONFIGURED_SITE_URL.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}
