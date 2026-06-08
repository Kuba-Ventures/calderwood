"use client";

// Re-submission flow for an already-signed-in practice ("update my fees").
// New users onboard at /signup; this lets an existing practice replace its fee
// schedule (and carriers) and rebuild the report. Reuses the same shared step
// components as onboarding, and writes through /api/intake -> Supabase (the old
// localStorage flow is retired).

import Link from "next/link";
import { useEffect, useState } from "react";
import { browserSupabase, hasSupabaseEnv } from "@/lib/db/client";
import {
  FeeDraft,
  FeeStep,
  buildFeePayload,
  emptyFeeDraft,
  isFeeValid,
} from "@/components/onboarding/fee-step";
import { CarriersStep } from "@/components/onboarding/carriers-step";
import { CarrierSchedules } from "@/components/onboarding/carrier-schedules";

export default function IntakePage() {
  const [hydrated, setHydrated] = useState(false);
  const [practiceName, setPracticeName] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [fee, setFee] = useState<FeeDraft>(emptyFeeDraft());
  const [carriers, setCarriers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!hasSupabaseEnv()) {
        setHydrated(true);
        return;
      }
      const sb = browserSupabase();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user?.email) {
        if (!cancelled) setHydrated(true);
        return;
      }
      const { data: practice } = await sb
        .from("practices")
        .select("practice_name, contracted_carriers")
        .eq("email", user.email)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (practice) {
        setPracticeName(practice.practice_name);
        setCarriers((practice.contracted_carriers as string[]) ?? []);
      }
      setHydrated(true);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  function next() {
    if (step === 0 && !isFeeValid(fee)) {
      if (
        fee.tab === "upload" &&
        fee.uploadedKind === "pdf" &&
        (fee.pdfStatus === "uploading" || fee.pdfStatus === "parsing")
      ) {
        setError("Still reading your file. Give it a moment, then continue.");
      } else {
        setError("Add your fee schedule, or switch to Paste / Top 20.");
      }
      return;
    }
    setError(null);
    setStep(1);
  }

  async function submit() {
    if (carriers.length === 0) {
      setError("Select at least one carrier.");
      return;
    }
    const payload = buildFeePayload(fee);
    if (!payload) {
      setStep(0);
      setError("Add your fee schedule before submitting.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fee: payload, carriers }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          json.error === "fee_parse_failed"
            ? "We couldn't read that fee schedule. Try another file or method."
            : json.error || "Something went wrong. Please try again."
        );
        setStep(0);
        return;
      }
      // Reports page picks up the reset status and regenerates.
      window.location.href = "/reports";
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!hydrated) {
    return <div className="text-sm text-ink-400">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/reports" className="text-sm text-ink-500 hover:text-ink-900">
        ← Back to reports
      </Link>
      <div className="mt-4">
        <h1 className="text-2xl font-semibold tracking-tighter2 text-ink-900">
          Update your fee schedule
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          {practiceName ? `${practiceName}: ` : ""}
          submitting new fees rebuilds your report. You won&rsquo;t be re-charged
          if you&rsquo;ve already unlocked.
        </p>
      </div>

      <div className="mt-6 rounded-xl border border-canvas-border bg-canvas px-8 py-10 shadow-sm sm:px-12">
        {step === 0 && <FeeStep draft={fee} setDraft={setFee} />}
        {step === 1 && (
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
            onClick={() => {
              setError(null);
              setStep(0);
            }}
            disabled={step === 0}
            className="inline-flex items-center justify-center rounded-md border border-canvas-border bg-canvas px-5 py-2.5 text-sm font-medium text-ink-700 transition hover:bg-canvas-tint disabled:cursor-not-allowed disabled:opacity-40"
          >
            Back
          </button>
          {step === 0 ? (
            <button
              type="button"
              onClick={next}
              className="inline-flex items-center justify-center rounded-md bg-ink-900 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-ink-700"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-md bg-ink-900 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-ink-700 disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Rebuild my report"}
            </button>
          )}
        </div>
      </div>

      {carriers.length > 0 && (
        <div className="mt-6">
          <CarrierSchedules carriers={carriers} />
        </div>
      )}
    </div>
  );
}
