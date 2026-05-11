import { Fragment } from "react";

const steps = [
  {
    label: "Your fee",
    value: "$185",
    note: "What you charge today",
  },
  {
    label: "75th percentile UCR",
    value: "$215",
    note: "Median in your ZIP",
  },
  {
    label: "Annual frequency",
    value: "× 142",
    note: "Procedures last year",
  },
  {
    label: "Recoverable",
    value: "$4,260",
    note: "Per year, on D2740 alone",
    highlight: true,
  },
];

export function Methodology() {
  return (
    <section className="border-y border-canvas-border bg-canvas-tint">
      <div className="mx-auto max-w-container px-6 py-24 sm:px-8 sm:py-28">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-accent sm:text-sm">
            Methodology
          </p>
          <h2 className="mt-5 text-3xl font-semibold tracking-tightish text-ink-900 sm:text-4xl">
            The math behind your report.
          </h2>
          <p className="mt-5 max-w-readable text-base leading-relaxed text-ink-700">
            One worked example using D2740 (porcelain crown). Every code in your fee schedule runs through the same arithmetic.
          </p>
        </div>

        <div className="mt-14 flex flex-col items-stretch gap-3 lg:flex-row lg:items-stretch lg:gap-2">
          {steps.map((step, i) => (
            <Fragment key={step.label}>
              <div
                className={`flex-1 rounded-lg border p-5 sm:p-6 ${
                  step.highlight
                    ? "border-gain bg-gain-soft"
                    : "border-canvas-border bg-canvas"
                }`}
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-500">
                  {step.label}
                </p>
                <p
                  className={`mt-2.5 font-serif text-[32px] font-medium leading-none tabular-nums ${
                    step.highlight ? "text-gain-ink" : "text-ink-900"
                  }`}
                >
                  {step.value}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-ink-500">
                  {step.note}
                </p>
              </div>
              {i < steps.length - 1 && (
                <div className="flex justify-center self-center text-ink-400 lg:flex-none">
                  <Arrow className="rotate-90 lg:rotate-0" />
                </div>
              )}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}

function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg
      width="22"
      height="12"
      viewBox="0 0 22 12"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M1 6 H19 M15 2 L19 6 L15 10"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
