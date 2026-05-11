const steps = [
  {
    n: "1",
    title: "Enter your practice zip code",
    body: "We use the zip to pull the right UCR percentiles. Nothing else.",
  },
  {
    n: "2",
    title: "Tell us how many providers you have",
    body: "1, 2–5, or 6+. Same price for everyone right now.",
  },
  {
    n: "3",
    title: "Give us your current fee schedule",
    body: "Upload a CSV, paste a table, or hand-enter your top 20 CDT codes, whichever is least friction for you.",
  },
  {
    n: "4",
    title: "Pick your contracted carriers",
    body: "Delta, Aetna, Cigna, MetLife, UnitedHealthcare, Guardian, BCBS, Humana, or other.",
  },
];

export function HowItWorks() {
  return (
    <section className="border-y border-canvas-border bg-canvas-tint">
      <div className="mx-auto max-w-container px-6 sm:px-8 py-20 sm:py-28">
        <div className="max-w-2xl">
          <p className="text-xs sm:text-sm font-medium uppercase tracking-[0.14em] text-accent">
            How it works
          </p>
          <h2 className="mt-5 text-3xl font-semibold tracking-tightish text-ink-900 sm:text-4xl">
            Five minutes of your time. A report in 24 hours.
          </h2>
        </div>
        <ol className="mt-14 grid gap-8 sm:grid-cols-2 sm:gap-10 lg:grid-cols-4">
          {steps.map((step) => (
            <li key={step.n} className="border-t border-canvas-border pt-6">
              <span className="font-mono text-sm text-ink-400">Step {step.n}</span>
              <h3 className="mt-3 text-lg font-semibold tracking-tightish text-ink-900">
                {step.title}
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-700">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
        <p className="mt-12 max-w-2xl text-base text-ink-700">
          Your report lands in your inbox within 24 hours of payment. Most arrive the same business day.
        </p>
      </div>
    </section>
  );
}
