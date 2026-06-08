"use client";

// Carrier multi-select for onboarding/intake. Lifted from the intake step so
// the wizard and intake page share one implementation. Styling unchanged.

import { CARRIERS } from "@/lib/types/pipeline";

export function CarriersStep({
  carriers,
  setCarriers,
}: {
  carriers: string[];
  setCarriers: (v: string[]) => void;
}) {
  function toggle(c: string) {
    if (carriers.includes(c)) {
      setCarriers(carriers.filter((x) => x !== c));
    } else {
      setCarriers([...carriers, c]);
    }
  }
  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tighter2 text-ink-900">
        Which carriers do you currently contract with?
      </h2>
      <p className="mt-2 text-sm text-ink-500">
        Pick every PPO contract that pays you. We&rsquo;ll rank them lowest to
        highest in your report.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {CARRIERS.map((c) => {
          const on = carriers.includes(c);
          return (
            <label
              key={c}
              className={`flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-sm transition ${
                on
                  ? "border-ink-900 bg-canvas text-ink-900"
                  : "border-canvas-border bg-canvas text-ink-700 hover:border-ink-200"
              }`}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => toggle(c)}
                className="h-4 w-4 rounded border-canvas-border text-ink-900 focus:ring-ink-900"
              />
              <span className={on ? "font-medium" : ""}>{c}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
