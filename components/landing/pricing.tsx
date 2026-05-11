const features = [
  "Code-by-code UCR benchmark",
  "Top 10 underpaid codes by dollar impact",
  "Carrier-by-carrier opportunity ranking",
  "PDF delivered within 24 hours",
];

export function Pricing() {
  return (
    <section className="bg-canvas">
      <div className="mx-auto max-w-container px-6 sm:px-8 py-20 sm:py-28">
        <div className="max-w-2xl">
          <p className="text-xs sm:text-sm font-medium uppercase tracking-[0.14em] text-accent">
            Pricing
          </p>
          <h2 className="mt-5 text-3xl font-semibold tracking-tightish text-ink-900 sm:text-4xl">
            One price. One report. No subscription.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-ink-700">
            The independent consultancies offering this same analysis charge $6,000 to $7,800 per provider as part of a multi-week engagement. We sell only the benchmark, the part that tells you which carriers are underpaying you and by how much, as a one-time written report.
          </p>
        </div>

        <div className="mt-12 max-w-md rounded-xl border border-canvas-border bg-canvas-tint p-8">
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-semibold tracking-tighter2 text-ink-900">$199</span>
            <span className="text-ink-500">one-time</span>
          </div>
          <p className="mt-3 text-sm text-ink-500">
            Same price whether you have 1 chair or 6.
          </p>
          <ul className="mt-8 space-y-3 text-[15px] text-ink-700">
            {features.map((line) => (
              <li key={line} className="flex gap-3">
                <CheckIcon />
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <a
            href="/login"
            className="mt-8 inline-flex w-full items-center justify-center rounded-md bg-ink-900 px-6 py-3.5 text-base font-medium text-white shadow-sm transition hover:bg-ink-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
          >
            Start your assessment
          </a>
          <p className="mt-3 text-center text-xs text-ink-500">
            Stripe checkout · $199 charged once
          </p>
        </div>
      </div>
    </section>
  );
}

function CheckIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      className="mt-1 flex-none text-accent"
      aria-hidden="true"
    >
      <path
        d="M3.75 9.5L7 12.75L14.25 5.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
