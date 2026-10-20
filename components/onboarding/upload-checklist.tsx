"use client";

// "What we found in your file" checklist shown under a fee upload that is
// missing something the report needs (procedure counts, a per-provider
// breakdown, or most of the codes). Shows what the file has next to what it
// lacks, says what that means for the report, and offers a one-click replace.
// Non-blocking: Continue still works with the file as-is.

import {
  checkUploadCompleteness,
  type CompletenessInput,
} from "@/lib/parser/completeness";

export function UploadChecklist({
  onReplace,
  ...input
}: CompletenessInput & { onReplace: () => void }) {
  const report = checkUploadCompleteness(input);
  if (!report.hasGaps) return null;

  return (
    <div
      role="status"
      className="mt-4 rounded-lg border border-canvas-border bg-canvas-tint px-5 py-4"
    >
      <p className="text-lg font-semibold text-ink-900">What we found in your file</p>
      <ul className="mt-2 divide-y divide-canvas-border">
        {report.items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 py-3">
            <span className="flex items-center gap-3 text-base text-ink-900">
              <span
                aria-hidden="true"
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
                  item.ok ? "bg-gain-ink" : "bg-amber-700"
                }`}
              >
                {item.ok ? "✓" : "!"}
              </span>
              <span>
                {item.label}
                <span className="sr-only">{item.ok ? ": found." : ": missing."}</span>
              </span>
            </span>
            <span
              className={`text-right text-base font-semibold ${
                item.ok ? "text-gain-ink" : "text-amber-900"
              }`}
            >
              {item.value}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-3 space-y-2 text-base leading-relaxed text-ink-900">
        {report.consequences.map((c, i) => (
          <p key={c} className={i === 0 ? "font-semibold" : undefined}>
            {c}
          </p>
        ))}
        {report.fix && <p>{report.fix}</p>}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="button"
          onClick={onReplace}
          className="min-h-[44px] rounded-md border-2 border-amber-800 bg-canvas px-5 py-2.5 text-base font-medium text-amber-900 transition hover:bg-amber-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-2"
        >
          Upload a different file
        </button>
        <span className="text-base text-ink-700">Or press Continue to use this file anyway.</span>
      </div>
    </div>
  );
}
