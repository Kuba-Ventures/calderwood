const faqs = [
  {
    q: "Are you a consultancy?",
    a: "No. We’re a software product. You upload your fees, we send back a report. There’s no kickoff call, no engagement letter, no monthly retainer, and no upsell sequence. If you want a consultant to actually run the renegotiation, hire one. We can tell you what to ask them, but we don’t do that work.",
  },
  {
    q: "Where does your data come from?",
    a: "The most recent ADA Survey of Dental Fees, supplemented with state-level reimbursement disclosures and FAIR Health UCR data. We don’t use crowdsourced fees or modeled estimates. Where confidence is low for a specific code or zip (low-volume codes, rural markets), we flag it on the report instead of reporting a false-precision number.",
  },
  {
    q: "Is this HIPAA-relevant?",
    a: "No. We never see patient data. Fee schedules and CDT codes are not protected health information. The intake form is built to refuse anything that looks like PHI.",
  },
  {
    q: "What if I’m already in an umbrella or shared network?",
    a: "Still useful. The report ranks each underlying carrier separately so you can see which umbrella participations are pulling your weighted reimbursement down. Sometimes the answer is to drop the umbrella entirely. The report will tell you when that math works.",
  },
  {
    q: "Can I do this myself?",
    a: "Yes. Buy the latest ADA fee survey (~$400), normalize your fee schedule against the 75th percentile for your zip, weight each code by your annual volume, then rank by carrier. Plan on roughly 20 hours. We do it in 24 hours for $199 because the data work is already done.",
  },
  {
    q: "How is the report delivered?",
    a: "A PDF, by email. Roughly 12–18 pages depending on how many carriers you list: cover page, executive summary, full code-by-code table, carrier-by-carrier ranking, and a recommended next-steps section. Designed to be readable in 15 minutes or forwarded directly to your office manager.",
  },
  {
    q: "What happens after I pay?",
    a: "You’ll get an immediate email confirming receipt and an estimated delivery time. Your report arrives within 24 hours. Most arrive the same business day. If you have a question after reading it, reply to that email and a human will answer.",
  },
];

export function Faq() {
  return (
    <section className="border-t border-canvas-border bg-canvas-tint">
      <div className="mx-auto max-w-container px-6 sm:px-8 py-20 sm:py-28">
        <div className="max-w-2xl">
          <p className="text-xs sm:text-sm font-medium uppercase tracking-[0.14em] text-accent">
            FAQ
          </p>
          <h2 className="mt-5 text-3xl font-semibold tracking-tightish text-ink-900 sm:text-4xl">
            Questions worth answering up front.
          </h2>
        </div>
        <div className="mt-12 max-w-3xl divide-y divide-canvas-border border-y border-canvas-border">
          {faqs.map((item) => (
            <details key={item.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-left text-base font-medium text-ink-900 sm:text-lg">
                <span className="pt-0.5">{item.q}</span>
                <span className="mt-1 select-none text-ink-400 transition-transform group-open:rotate-45">
                  <PlusIcon />
                </span>
              </summary>
              <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-ink-700">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function PlusIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8 1.5V14.5M1.5 8H14.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
