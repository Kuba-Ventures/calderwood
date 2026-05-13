"use client";

// Supabase email-password sign-in. The placeholder localStorage gate is
// retired. Auth + intake/dashboard data now live in Supabase.
//
// force-dynamic prevents Vercel's edge from caching the HTML, so newly
// deployed bundles take effect immediately instead of waiting for cache
// expiry.

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { browserSupabase, hasSupabaseEnv } from "@/lib/db/client";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const nextPath = params.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    if (!hasSupabaseEnv()) {
      setError("Sign-in is not yet configured. Email hello@calderwoodtech.com.");
      return;
    }
    setSubmitting(true);
    try {
      const sb = browserSupabase();
      const { error: authError } = await sb.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) {
        setError(authError.message);
        return;
      }
      // Hard navigation so middleware re-reads the freshly-set cookies.
      window.location.href = nextPath;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
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
        <h1 className="mt-6 text-center text-4xl font-semibold tracking-tighter2 text-ink-900 sm:text-5xl">
          Calderwood
        </h1>
        <p className="mt-3 text-center text-base text-ink-500">
          Sign in to your fee assessment
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
              className="mt-1.5 w-full rounded-md border border-canvas-border bg-canvas px-3 py-2.5 text-base text-ink-700 placeholder:text-ink-400 focus:border-ink-900 focus:outline-none focus:ring-1 focus:ring-ink-900"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-ink-700"
              >
                Password
              </label>
              <a
                href="mailto:hello@calderwoodtech.com?subject=Password%20reset"
                className="text-sm text-ink-400 hover:text-ink-700"
              >
                Forgot password?
              </a>
            </div>
            <div className="relative mt-1.5">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                autoComplete="current-password"
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
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="my-10 flex w-full items-center gap-4">
          <div className="h-px flex-1 bg-canvas-border" />
          <p className="text-xs uppercase tracking-[0.14em] text-ink-400">
            Or
          </p>
          <div className="h-px flex-1 bg-canvas-border" />
        </div>

        <Link
          href="/signup"
          className="inline-flex w-full items-center justify-center rounded-md border border-canvas-border bg-canvas px-6 py-3 text-base font-medium text-ink-900 transition hover:bg-canvas-tint"
        >
          Create an account
        </Link>

        <p className="mt-6 text-center text-sm leading-relaxed text-ink-500">
          Need help? Email{" "}
          <a
            href="mailto:hello@calderwoodtech.com"
            className="text-accent hover:underline"
          >
            hello@calderwoodtech.com
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
