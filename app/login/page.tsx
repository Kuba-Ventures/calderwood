"use client";

// Supabase email-password sign-in. The placeholder localStorage gate is
// retired. Auth + intake/dashboard data now live in Supabase.

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
    const sb = browserSupabase();
    const { error: authError } = await sb.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (authError) {
      setError(authError.message);
      setSubmitting(false);
      return;
    }
    router.push(nextPath);
    router.refresh();
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
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              autoComplete="current-password"
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
