// Refreshes the Supabase session on every request and gates the authed
// app routes. Without this, server components see stale session state.

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  isRootRecoveryHit,
  RESET_PASSWORD_PATH,
} from "@/lib/auth/recovery-redirect";

const APP_PREFIXES = ["/dashboard", "/intake", "/reports", "/account"];
const PUBLIC_PATHS = ["/", "/login", "/signup", "/start", "/privacy", "/terms"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  // Auth pages must never be edge-cached; if a stale HTML cache references
  // an old script bundle without the inlined env values, sign-in breaks.
  const path = request.nextUrl.pathname;

  // Password-recovery safety net (issue #45): when a Supabase recovery link
  // falls back to the site root, it arrives as "/?code=...". Forward that code
  // to /reset-password so the user reaches the new-password form regardless of
  // the dashboard Redirect URLs config. Same-origin redirect preserves the
  // PKCE code_verifier held in the browser.
  if (isRootRecoveryHit(path, request.nextUrl.searchParams)) {
    const url = request.nextUrl.clone();
    url.pathname = RESET_PASSWORD_PATH;
    return NextResponse.redirect(url);
  }

  if (path === "/login" || path === "/signup") {
    response.headers.set("Cache-Control", "no-store, must-revalidate");
  }

  // If Supabase isn't configured yet, let the request through. The pages
  // fall back to the localStorage gate until env vars land.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const { data } = await supabase.auth.getUser();
  const isAppPath = APP_PREFIXES.some(
    (p) => path === p || path.startsWith(p + "/")
  );

  if (isAppPath && !data.user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // Authed users hitting /login or /signup go to the right post-auth route.
  if (data.user && (path === "/login" || path === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.searchParams.delete("next");
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // All app routes that need auth + the auth pages themselves.
    "/((?!_next/static|_next/image|favicon.ico|icon.png|logo.png|api/).*)",
  ],
};
