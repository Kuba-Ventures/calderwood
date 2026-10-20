"use client";

// Pop-up shown when the dentist presses Continue on the fee step with prices
// but no procedure counts. Without counts we can't calculate yearly dollars
// (we never estimate volume), so they choose: add a file with counts, or go
// ahead with a prices-only report that compares each fee per procedure.

import { useEffect, useRef } from "react";

export function NoCountsDialog({
  open,
  fromFile,
  onAddFile,
  onContinue,
}: {
  open: boolean;
  /** True when the prices came from an uploaded file (vs Paste / Top 20). */
  fromFile: boolean;
  onAddFile: () => void;
  onContinue: () => void;
}) {
  const primaryRef = useRef<HTMLButtonElement>(null);
  const secondaryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    primaryRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onAddFile();
      }
      // Keep keyboard focus inside the two choices.
      if (e.key === "Tab") {
        const first = primaryRef.current;
        const last = secondaryRef.current;
        if (!first || !last) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onAddFile]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="no-counts-title"
        aria-describedby="no-counts-body"
        className="w-full max-w-lg rounded-xl bg-canvas px-6 py-6 shadow-xl"
      >
        <h2 id="no-counts-title" className="text-xl font-semibold text-ink-900">
          {fromFile
            ? "Your file has prices, but no procedure counts."
            : "You've entered prices, but no procedure counts."}
        </h2>
        <div id="no-counts-body" className="mt-3 space-y-3 text-base leading-relaxed text-ink-900">
          <p>
            Without counts we can&apos;t calculate how much you&apos;re leaving
            on the table each year. Your report would only compare each fee to
            your area, one procedure at a time.
          </p>
          <p>
            For a full report, add a production report (like a Procedure
            Summary from Dentrix, Eaglesoft, or Open Dental), or a Quantity
            column in your fee file.
          </p>
        </div>
        <div className="mt-5 flex flex-col gap-3">
          <button
            ref={primaryRef}
            type="button"
            onClick={onAddFile}
            className="min-h-[44px] rounded-md bg-ink-900 px-5 py-2.5 text-base font-medium text-white transition hover:bg-ink-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-900 focus-visible:ring-offset-2"
          >
            Add a file with counts
          </button>
          <button
            ref={secondaryRef}
            type="button"
            onClick={onContinue}
            className="min-h-[44px] rounded-md border-2 border-ink-900 bg-canvas px-5 py-2.5 text-base font-medium text-ink-900 transition hover:bg-canvas-tint focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-900 focus-visible:ring-offset-2"
          >
            Continue with prices only
          </button>
        </div>
      </div>
    </div>
  );
}
