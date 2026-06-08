"use client";

// Fused onboarding: account creation + fee intake in one guided flow. Three
// steps with a progress meter — (1) account & practice, (2) fee schedule,
// (3) carriers — then a single submit that creates the account, stores the
// intake, and kicks off report generation. Replaces the old separate
// /signup -> /intake hop so the dentist reaches the fee step in one click.

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { browserSupabase, hasSupabaseEnv } from "@/lib/db/client";
import {
  FeeDraft,
  FeeStep,
  buildFeePayload,
  emptyFeeDraft,
  isFeeValid,
} from "@/components/onboarding/fee-step";
import { CarriersStep } from "@/components/onboarding/carriers-step";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STEP_LABELS = ["Account", "Fee schedule", "Carriers"];

export default function OnboardingWizard() {
  const [step, setStep] = useState(0);

  // Account + practice
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [practiceName, setPracticeName] = useState("");
  const [zip, setZip] = useState("");
  const [providerCount, setProviderCount] = useState(1);

  // Fees + carriers
  const [fee, setFee] = useState<FeeDraft>(emptyFeeDraft());
  const [carriers, setCarriers] = useState<string[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validateStep(s: number): string | null {
    if (s === 0) {
      if (!EMAIL_RE.test(email.trim())) return "Enter a valid email address.";
      if (password.length < 8) return "Password must be at least 8 characters.";
      if (!practiceName.trim()) return "Enter your practice name.";
      if (!/^\d{5}$/.test(zip.trim())) return "Enter a 5-digit ZIP code.";
      if (!Number.isFinite(providerCount) || providerCount < 1)
        return "Provider count must be at least 1.";
    }
    if (s === 1 && !isFeeValid(fee))
      return fee.tab === "eob"
        ? "Upload your EOB image, or switch to another method."
        : "Add your fee schedule, or switch input method.";
    if (s === 2 && carriers.length === 0) return "Select at least one carrier.";
    return null;
  }

  function next() {
    const err = validateStep(step);
    if (err) return setError(err);
    setError(null);
    setStep((s) => Math.min(2, s + 1));
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    for (const s of [0, 1, 2]) {
      const err = validateStep(s);
      if (err) {
        setStep(s);
        return setError(err);
      }
    }
    if (!hasSupabaseEnv()) {
      return setError(
        "Sign-up is not yet configured. Email hello@calderwoodtech.com."
      );
    }
    const feePayload = buildFeePayload(fee);
    if (!feePayload) return setError("Add your fee schedule before submitting.");

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          practiceName: practiceName.trim(),
          zip: zip.trim(),
          providerCount,
          carriers,
          fee: feePayload,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 409 || json.error === "account_exists") {
          setError("An account with that email already exists. Sign in instead.");
        } else if (json.error === "fee_parse_failed") {
          setStep(1);
          setError(
            "We couldn't read that fee schedule. Try a different file or the Paste / Top 20 methods."
          );
        } else {
          setError(json.error || "Something went wrong. Please try again.");
        }
        return;
      }

      // Account exists now — sign in to set the session, then hand off to the
      // reports page which triggers generation and tracks real job status.
      const sb = browserSupabase();
      const { error: signInErr } = await sb.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInErr) {
        // Account was created; just send them to sign in manually.
        window.location.href = "/login?next=/reports";
        return;
      }
      window.location.href = "/reports";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="bg-canvas-tint">
      <div className="mx-auto w-full max-w-2xl px-6 py-12 sm:px-8 sm:py-16">
        <div className="flex flex-col items-center">
          <Image
            src="/logo.png"
            alt=""
            width={161}
            height={187}
            priority
            className="h-16 w-auto sm:h-20"
          />
          <h1 className="mt-4 text-center text-3xl font-semibold tracking-tighter2 text-ink-900 sm:text-4xl">
            Start your fee assessment
          </h1>
          <p className="mt-2 text-center text-sm text-ink-500">
            Five minutes of intake. Your benchmarked report in minutes.
          </p>
        </div>

        <div className="mt-8">
          <Stepper current={step} />
        </div>

        <form
          onSubmit={onSubmit}
          className="mt-6 rounded-xl border border-canvas-border bg-canvas px-6 py-8 shadow-sm sm:px-10 sm:py-10"
        >
          {step === 0 && (
            <AccountStep
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              practiceName={practiceName}
              setPracticeName={setPracticeName}
              zip={zip}
              setZip={setZip}
              providerCount={providerCount}
              setProviderCount={setProviderCount}
            />
          )}
          {step === 1 && <FeeStep draft={fee} setDraft={setFee} />}
          {step === 2 && (
            <CarriersStep carriers={carriers} setCarriers={setCarriers} />
          )}

          {error && (
            <p className="mt-6 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={back}
              disabled={step === 0}
              className="inline-flex items-center justify-center rounded-md border border-canvas-border bg-canvas px-5 py-2.5 text-sm font-medium text-ink-700 transition hover:bg-canvas-tint disabled:cursor-not-allowed disabled:opacity-40"
            >
              Back
            </button>
            {step < 2 ? (
              <button
                type="button"
                onClick={next}
                className="inline-flex items-center justify-center rounded-md bg-ink-900 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-ink-700"
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-md bg-ink-900 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-ink-700 disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Create account & submit"}
              </button>
            )}
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-ink-500">
          Already have an account?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center justify-center gap-2 text-xs">
      {STEP_LABELS.map((label, i) => {
        const state = i < current ? "done" : i === current ? "active" : "pending";
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                state === "done"
                  ? "bg-gain text-white"
                  : state === "active"
                  ? "bg-ink-900 text-white"
                  : "bg-canvas-tint2 text-ink-400"
              }`}
            >
              {state === "done" ? "✓" : i + 1}
            </span>
            <span
              className={`hidden sm:inline ${
                state === "active" ? "font-medium text-ink-900" : "text-ink-400"
              }`}
            >
              {label}
            </span>
            {i < STEP_LABELS.length - 1 && (
              <span className="mx-1 h-px w-6 bg-canvas-border sm:w-8" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function AccountStep({
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  practiceName,
  setPracticeName,
  zip,
  setZip,
  providerCount,
  setProviderCount,
}: {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  practiceName: string;
  setPracticeName: (v: string) => void;
  zip: string;
  setZip: (v: string) => void;
  providerCount: number;
  setProviderCount: (n: number) => void;
}) {
  const inputCls =
    "mt-1.5 w-full rounded-md border border-canvas-border bg-canvas px-3 py-2.5 text-base text-ink-900 placeholder:text-ink-400 focus:border-ink-900 focus:outline-none focus:ring-1 focus:ring-ink-900";
  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tighter2 text-ink-900">
        Create your account.
      </h2>
      <p className="mt-2 text-sm text-ink-500">
        This is where your report lands. ZIP sets your regional benchmark.
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-ink-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@practice.com"
            autoComplete="email"
            className={inputCls}
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-ink-700"
          >
            Password
          </label>
          <div className="relative mt-1.5">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              className="w-full rounded-md border border-canvas-border bg-canvas px-3 py-2.5 pr-11 text-base text-ink-900 focus:border-ink-900 focus:outline-none focus:ring-1 focus:ring-ink-900"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-ink-400 transition hover:text-ink-700"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          <p className="mt-1 text-xs text-ink-400">At least 8 characters.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="practiceName"
              className="block text-sm font-medium text-ink-700"
            >
              Practice name
            </label>
            <input
              id="practiceName"
              type="text"
              value={practiceName}
              onChange={(e) => setPracticeName(e.target.value)}
              placeholder="Calderwood Dental"
              autoComplete="organization"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="zip" className="block text-sm font-medium text-ink-700">
              Practice ZIP
            </label>
            <input
              id="zip"
              type="text"
              inputMode="numeric"
              maxLength={5}
              value={zip}
              onChange={(e) => setZip(e.target.value.replace(/\D/g, ""))}
              placeholder="94110"
              autoComplete="postal-code"
              className={inputCls}
            />
          </div>
        </div>
        <div className="sm:max-w-[50%] sm:pr-2">
          <label
            htmlFor="providerCount"
            className="block text-sm font-medium text-ink-700"
          >
            Providers billing under your TIN
          </label>
          <input
            id="providerCount"
            type="number"
            min={1}
            value={providerCount}
            onChange={(e) =>
              setProviderCount(parseInt(e.target.value || "1", 10))
            }
            className={inputCls}
          />
        </div>
      </div>
    </div>
  );
}
