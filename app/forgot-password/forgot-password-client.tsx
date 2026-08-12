"use client";

// Step 1 of password reset: the user enters their email and we ask Supabase
// to send a recovery link. The link lands on /reset-password, where the new
// password is set.
//
// We always show the same "check your email" confirmation whether or not the
// address has an account, so this page can't be used to probe which emails
// are registered.
//
// force-dynamic (see page.tsx) keeps the freshly deployed bundle live so the
// inlined Supabase env values are never served from a stale HTML cache.

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { browserSupabase, hasSupabaseEnv } from "@/lib/db/client";
import { browserSiteOrigin } from "@/lib/site-url";

export default function ForgotPasswordClient() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter the email you use to sign in.");
      return;
    }
    if (!hasSupabaseEnv()) {
      setError(
        "Password reset is not yet configured. Email support@newfeeschedule.com."
      );
      return;
    }
    setSubmitting(true);
    try {
      const sb = browserSupabase();
      // Pin the recovery link to the canonical site origin, not whatever host
      // the user is on. The bare apex does not resolve, so a link built from it
      // is dead on arrival; the canonical origin is also the single URL to add
      // to the Supabase Redirect URLs allow-list. See lib/site-url.ts and
      // docs/auth-password-reset.md.
      const { error: resetError } = await sb.auth.resetPasswordForEmail(
        trimmed,
        { redirectTo: `${browserSiteOrigin()}/reset-password` }
      );
      // Don't reveal whether the email exists: only surface genuine transport
      // failures, and show the same confirmation for both "sent" and "no such
      // account".
      if (resetError) {
        setError(
          "We couldn't send the reset email just now. Please try again in a moment."
        );
        return;
      }
      setSent(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't send the reset email. Please try again."
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

        {sent ? (
          <>
            <h1 className="mt-6 text-center text-4xl font-semibold tracking-tighter2 text-ink-900 sm:text-5xl">
              Check your email
            </h1>
            <p className="mt-4 text-center text-lg leading-relaxed text-ink-700">
              If an account exists for{" "}
              <span className="font-semibold text-ink-900">{email.trim()}</span>
              , we just sent a link to reset your password. Open the email and
              click the button to choose a new password.
            </p>
            <p className="mt-4 text-center text-base leading-relaxed text-ink-500">
              The link works for one hour. Can&apos;t find the email? Check your
              spam folder, or wait a minute and try again.
            </p>
            <Link
              href="/login"
              className="mt-10 inline-flex w-full items-center justify-center rounded-md bg-ink-900 px-6 py-3 text-base font-medium text-white shadow-sm transition hover:bg-ink-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
            >
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            <h1 className="mt-6 text-center text-4xl font-semibold tracking-tighter2 text-ink-900 sm:text-5xl">
              Reset your password
            </h1>
            <p className="mt-3 text-center text-lg leading-relaxed text-ink-700">
              Enter your email and we&apos;ll send you a link to set a new
              password.
            </p>

            <form className="mt-10 w-full space-y-4" onSubmit={onSubmit}>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-ink-700"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@practice.com"
                  autoComplete="email"
                  autoFocus
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
                {submitting ? "Sending..." : "Send reset link"}
              </button>
            </form>
          </>
        )}

        <p className="mt-8 text-center text-base leading-relaxed text-ink-500">
          Remembered it?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Back to sign in
          </Link>
        </p>

        <p className="mt-4 text-center text-sm leading-relaxed text-ink-500">
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
