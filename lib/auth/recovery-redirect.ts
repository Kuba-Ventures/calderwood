// Password-recovery safety net for issue #45.
//
// A Supabase recovery link is supposed to land on /reset-password (the
// forgot-password flow requests that redirect). But Supabase only honors a
// requested redirect when it's in the dashboard Redirect URLs allow-list;
// otherwise it falls back to the project Site URL, which is the site root.
// When that happens the recovery code arrives as "/?code=..." and the user
// lands on the marketing homepage, never seeing the new-password form.
//
// This predicate lets middleware catch that fallback and forward the code to
// /reset-password. The redirect is same-origin (only the path changes), so
// the PKCE code_verifier held in the browser is preserved and the existing
// reset-password page exchanges the code exactly as it does today.
//
// This app uses "?code=" only for password recovery (no email-confirmation
// redirect, magic links, or OAuth), so a code on the root is unambiguous.

export const RESET_PASSWORD_PATH = "/reset-password";

// True when a request is the site root carrying a Supabase auth code, i.e. a
// recovery link that landed on "/" instead of the reset-password page.
export function isRootRecoveryHit(
  pathname: string,
  searchParams: URLSearchParams
): boolean {
  return pathname === "/" && searchParams.has("code");
}
