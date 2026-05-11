"use client";

// Placeholder client-side gate. Password "calderwood" lets anyone in.
// Real auth via Supabase replaces this; the rest of the app shell stays.

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { auth } from "@/lib/storage";

const PLACEHOLDER_PASSWORD = "calderwood";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Enter the email you used at checkout.");
      return;
    }
    if (password !== PLACEHOLDER_PASSWORD) {
      setError("That password isn't right.");
      return;
    }
    setSubmitting(true);
    auth.signIn();
    router.push("/dashboard");
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
          Get your fee assessment
        </p>

        <div className="mt-10 w-full">
          <Link
            href="/start"
            className="inline-flex w-full items-center justify-center rounded-md bg-ink-900 px-6 py-4 text-base font-medium text-white shadow-sm transition hover:bg-ink-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
          >
            Get started
          </Link>
          <p className="mt-3 text-center text-sm text-ink-500">
            No account needed. Email captured at checkout.
          </p>
        </div>

        <div className="my-10 flex w-full items-center gap-4">
          <div className="h-px flex-1 bg-canvas-border" />
          <p className="text-xs uppercase tracking-[0.14em] text-ink-400">
            Returning customer
          </p>
          <div className="h-px flex-1 bg-canvas-border" />
        </div>

        <form className="w-full space-y-4" onSubmit={onSubmit}>
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
              placeholder="••••••••"
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
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

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
