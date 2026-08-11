"use client";

// Step 2 of password reset: the user arrives here from the recovery link in
// their email. Supabase's browser client detects the recovery token in the
// URL and establishes a short-lived session (it fires a PASSWORD_RECOVERY
// auth event, or getSession() already reflects it). Only once that session
// exists do we let the user set a new password via updateUser().
//
// If the link is missing, expired, or already used, no session is created and
// we show a plain-English "link expired" message with a way to request a new
// one.
//
// force-dynamic (see page.tsx) keeps the freshly deployed bundle live so the
// inlined Supabase env values are never served from a stale HTML cache.

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { browserSupabase, hasSupabaseEnv } from "@/lib/db/client";

type Phase = "verifying" | "ready" | "invalid" | "done";

const MIN_PASSWORD_LENGTH = 8;

export default function ResetPasswordClient() {
  const [phase, setPhase] = useState<Phase>(
    hasSupabaseEnv() ? "verifying" : "invalid"
  );
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const readied = useRef(false);

  // Detect the recovery session established from the URL. We both subscribe to
  // auth changes (the SDK fires PASSWORD_RECOVERY once it parses the link) and
  // check for an existing session, then fall back to "invalid" if neither
  // arrives shortly after load.
  useEffect(() => {
    if (!hasSupabaseEnv()) return;

    const sb = browserSupabase();
    let cancelled = false;

    function markReady() {
      if (cancelled || readied.current) return;
      readied.current = true;
      setPhase("ready");
    }

    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        markReady();
      }
    });

    sb.auth.getSession().then(({ data }) => {
      if (data.session) markReady();
    });

    // If no recovery session materializes, the link was bad or expired.
    const timer = setTimeout(() => {
      if (!cancelled && !readied.current) setPhase("invalid");
    }, 4000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      const sb = browserSupabase();
      const { error: updateError } = await sb.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setPhase("done");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "We couldn't update your password."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="bg-canvas-tint">
      <div className="mx-auto flex min-h-[calc(100vh-65px)] w-full max-w-md flex-col items-center justify-center px-6 py-16 sm:px-8 sm:py-20">
        <Image
          src="/logo.png"
          alt=""
          width={161}
          height={187}
          priority
          className="h-20 w-auto sm:h-24"
        />

        {phase === "verifying" && (
          <>
            <h1 className="mt-6 text-center text-4xl font-semibold tracking-tighter2 text-ink-900 sm:text-5xl">
              Checking your link
            </h1>
            <p className="mt-4 text-center text-lg leading-relaxed text-ink-700">
              One moment while we open your password reset.
            </p>
          </>
        )}

        {phase === "invalid" && (
          <>
            <h1 className="mt-6 text-center text-4xl font-semibold tracking-tighter2 text-ink-900 sm:text-5xl">
              This link has expired
            </h1>
            <p className="mt-4 text-center text-lg leading-relaxed text-ink-700">
              Password reset links work for one hour and can only be used once.
              Request a fresh link and we&apos;ll email you a new one.
            </p>
            <Link
              href="/forgot-password"
              className="mt-10 inline-flex w-full items-center justify-center rounded-md bg-ink-900 px-6 py-3 text-base font-medium text-white shadow-sm transition hover:bg-ink-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
            >
              Send a new reset link
            </Link>
          </>
        )}

        {phase === "done" && (
          <>
            <h1 className="mt-6 text-center text-4xl font-semibold tracking-tighter2 text-ink-900 sm:text-5xl">
              Password updated
            </h1>
            <p className="mt-4 text-center text-lg leading-relaxed text-ink-700">
              Your new password is saved. You can sign in with it now.
            </p>
            <Link
              href="/login"
              className="mt-10 inline-flex w-full items-center justify-center rounded-md bg-ink-900 px-6 py-3 text-base font-medium text-white shadow-sm transition hover:bg-ink-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
            >
              Go to sign in
            </Link>
          </>
        )}

        {phase === "ready" && (
          <>
            <h1 className="mt-6 text-center text-4xl font-semibold tracking-tighter2 text-ink-900 sm:text-5xl">
              Choose a new password
            </h1>
            <p className="mt-3 text-center text-lg leading-relaxed text-ink-700">
              Pick a password you&apos;ll remember. Use at least{" "}
              {MIN_PASSWORD_LENGTH} characters.
            </p>

            <form className="mt-10 w-full space-y-4" onSubmit={onSubmit}>
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-ink-700"
                >
                  New password
                </label>
                <div className="relative mt-1.5">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    autoFocus
                    className="w-full rounded-md border border-canvas-border bg-canvas px-3 py-2.5 pr-11 text-base text-ink-700 placeholder:text-ink-400 focus:border-ink-900 focus:outline-none focus:ring-1 focus:ring-ink-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-ink-400 transition hover:text-ink-700 focus:outline-none"
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>
              <div>
                <label
                  htmlFor="confirm"
                  className="block text-sm font-medium text-ink-700"
                >
                  Confirm new password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  id="confirm"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Type it again"
                  autoComplete="new-password"
                  className="mt-1.5 w-full rounded-md border border-canvas-border bg-canvas px-3 py-2.5 text-base text-ink-700 placeholder:text-ink-400 focus:border-ink-900 focus:outline-none focus:ring-1 focus:ring-ink-900"
                />
              </div>
              {error && (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md bg-ink-900 px-6 py-3 text-base font-medium text-white shadow-sm transition hover:bg-ink-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900 disabled:opacity-60"
              >
                {submitting ? "Saving..." : "Save new password"}
              </button>
            </form>
          </>
        )}

        <p className="mt-8 text-center text-sm leading-relaxed text-ink-500">
          Need help? Email{" "}
          <a
            href="mailto:support@newfeeschedule.com"
            className="text-accent hover:underline"
          >
            support@newfeeschedule.com
          </a>
          .
        </p>
      </div>
    </main>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M1.5 10s3-6 8.5-6 8.5 6 8.5 6-3 6-8.5 6S1.5 10 1.5 10Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M3 3l14 14M7.5 5.5C8.3 5.18 9.13 5 10 5c5.5 0 8.5 6 8.5 6a13.4 13.4 0 0 1-2.7 3.3M5.5 7.5C3.5 9 1.5 10 1.5 10s3 6 8.5 6c1.6 0 3-.5 4.2-1.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.4 11.4a2 2 0 0 1-2.8-2.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
