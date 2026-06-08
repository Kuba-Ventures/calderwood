"use client";

// Client hook backing the dashboard + reports pages. Single source of truth for
// report state: reads the gated /api/report, kicks off generation when the
// practice is freshly submitted, polls real practices.status until the report
// is ready, and exposes startCheckout() for the unlock flow.
//
// All gating is enforced server-side — this hook only ever sees the redacted
// payload until paid.

import { useCallback, useEffect, useRef, useState } from "react";
import type { PracticeStatus } from "@/lib/types/pipeline";
import type { GatedReport } from "@/lib/report/gate";

export type ReportState = {
  status: PracticeStatus | "none";
  unlocked: boolean;
  practice: {
    practiceName: string | null;
    zip: string;
    providerBucket: string;
    feeInputMethod: string | null;
    createdAt: string;
  } | null;
  report: GatedReport | null;
  pdfUrl: string | null;
};

const PROCESSING: PracticeStatus[] = ["awaiting_uploads", "parsing", "review_queue"];

export function useReport() {
  const [state, setState] = useState<ReportState | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const triggered = useRef(false);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function tick() {
      let data: ReportState;
      try {
        const res = await fetch("/api/report", { cache: "no-store" });
        data = await res.json();
      } catch {
        if (active) timer = setTimeout(tick, 2000);
        return;
      }
      if (!active) return;
      setState(data);
      setLoading(false);

      const isEob = data.practice?.feeInputMethod === "eob";
      const processing = PROCESSING.includes(data.status as PracticeStatus);

      // Kick generation once for a freshly-submitted, non-EOB practice. The
      // route advances status; subsequent polls reflect real progression.
      if (processing && !isEob && !triggered.current) {
        triggered.current = true;
        fetch("/api/generate", { method: "POST" })
          .then(async (r) => {
            if (!r.ok) {
              const j = await r.json().catch(() => ({}));
              if (active) setGenError(j.error || "Report generation failed.");
            }
          })
          .catch(() => {
            if (active) setGenError("Report generation failed.");
          });
      }

      // Poll while the job is running (EOB sits in review for a human).
      if (processing && !isEob) {
        timer = setTimeout(tick, 1500);
        return;
      }

      // Just returned from Stripe checkout: keep polling until the webhook
      // stamps paid_at, so the reveal isn't missed by a redirect/webhook race.
      const justPaid =
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("paid") === "1";
      if (justPaid && !data.unlocked && data.status !== "none") {
        timer = setTimeout(tick, 1500);
      }
    }

    void tick();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const startCheckout = useCallback(async () => {
    setCheckingOut(true);
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const json = await res.json();
      if (json.url) {
        window.location.href = json.url;
        return;
      }
      setCheckingOut(false);
    } catch {
      setCheckingOut(false);
    }
  }, []);

  return { state, loading, checkingOut, genError, startCheckout };
}
