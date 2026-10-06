// Shown in place of the unlock banner when the uploaded fees look like
// production-report averages (blended with PPO contracted fees) rather than
// the practice's own office fees. See lib/computation/fee-sanity.ts.

import Link from "next/link";
import type { FeeSanity } from "@/lib/computation/fee-sanity";

export function FeeInputWarning({ check }: { check: FeeSanity }) {
  const pct =
    check.feeToMedian !== null ? Math.round(check.feeToMedian * 100) : null;
  return (
    <div
      role="alert"
      className="rounded-xl border-2 border-amber-600 bg-amber-50 px-6 py-5 shadow-sm"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-readable">
          <p className="text-lg font-semibold text-ink-900">
            Check your upload before reading these numbers.
          </p>
          <p className="mt-1.5 text-base leading-relaxed text-ink-700">
            {pct !== null
              ? `Your fees came in at about ${pct}% of the local median on almost every code. `
              : ""}
            That usually means the file shows average charges after insurance
            discounts (a production or Procedure Summary report), not your
            office fee schedule. Upload the fees you charge a patient with no
            insurance, and we will rebuild your report.
          </p>
        </div>
        <Link
          href="/intake"
          className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-md bg-ink-900 px-5 py-2.5 text-base font-medium text-white shadow-sm transition hover:bg-ink-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
        >
          Upload your fee schedule
        </Link>
      </div>
    </div>
  );
}
