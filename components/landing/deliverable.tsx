const items = [
  {
    label: "01",
    title: "Your fees, scored against your zip code",
    body: "Every code on your fee schedule benchmarked against the 50th, 75th, and 90th percentiles of UCR fees in your specific zip code. Sourced from the most recent ADA Survey of Dental Fees and supplemented with state reimbursement disclosures. No crowdsourced data, no estimates.",
  },
  {
    label: "02",
    title: "The 10 codes losing you the most money",
    body: "Your underpaid codes ranked by annual dollar impact — the gap to the 75th percentile multiplied by how often you bill the code. You’ll know which renegotiation moves the needle and which ones aren’t worth the call.",
  },
  {
    label: "03",
    title: "Which carrier to call first",
    body: "Each contracted carrier scored on total recoverable revenue and ranked from biggest opportunity to smallest. If you only have time to renegotiate one contract this quarter, you’ll know which one.",
  },
];

export function Deliverable() {
  return (
    <section className="bg-canvas">
      <div className="mx-auto max-w-container px-6 sm:px-8 py-20 sm:py-28">
        <div className="max-w-2xl">
          <p className="text-xs sm:text-sm font-medium uppercase tracking-[0.14em] text-accent">
            What&rsquo;s in the report
          </p>
          <h2 className="mt-5 text-3xl font-semibold tracking-tightish text-ink-900 sm:text-4xl">
            Three answers, one PDF.
          </h2>
        </div>
        <div className="mt-14 grid gap-12 sm:grid-cols-3 sm:gap-10">
          {items.map((item) => (
            <div key={item.label}>
              <span className="font-mono text-sm text-ink-400">{item.label}</span>
              <h3 className="mt-3 text-xl font-semibold tracking-tightish text-ink-900">
                {item.title}
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-700">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
