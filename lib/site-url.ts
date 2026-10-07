// Canonical site origin for browser-built redirect URLs (e.g. the Supabase
// password-recovery redirectTo).
//
// Why this exists: if we hand Supabase `window.location.origin`, the recovery
// link points at whatever host the user happened to be on when they asked for
// the reset. The apex `newfeeschedule.com` is the primary host (`www` and http
// 308 to it), so links built from an alias take an extra redirect, and older
// deploys hit an apex that did not resolve. Pinning to one canonical origin
// means there is exactly one URL to add to the Supabase Redirect URLs
// allow-list, and every recovery link targets the live host directly.
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
