const faqs = [
  {
    q: "Where does the UCR data come from?",
    a: "The most recent ADA Survey of Dental Fees, FAIR Health UCR data, and state-level reimbursement disclosures. No crowdsourced fees, no modeled estimates. Where confidence is low for a specific code or zip (low-volume codes, rural markets), we flag it on the report instead of reporting a false-precision number.",
  },
  {
    q: "What if I don’t have my fee schedule in a clean format?",
    a: "Upload whatever you have. We accept CSVs from Dentrix, Eaglesoft, and Open Dental directly. We also work with PDFs or screenshots. If you only know your top 20 codes off the top of your head, that’s enough to run the assessment.",
  },
  {
    q: "Do you contact my carriers?",
    a: "No. We never contact your carriers, your patients, or anyone else. The report is for you. What you do with it (renegotiate yourself, hire a consultant, drop a contract) is your decision.",
  },
  {
    q: "What if my codes aren’t standard CDT?",
    a: "We benchmark against the standard ADA CDT code set. If you use custom codes for internal tracking, map them to their CDT equivalent before uploading. If you’re not sure, paste your code list as-is. For the first batch of customers we’re handling code mapping manually.",
  },
  {
    q: "Is my data confidential?",
    a: "Yes. Fee schedules are proprietary practice data and we treat them that way. We don’t share, sell, or aggregate practice-level information. We never see patient data and the intake form is built to refuse PHI.",
  },
  {
    q: "What happens after I get the report?",
    a: "Read it. Identify the two or three carriers with the largest gap. The report tells you which codes to lead with in a renegotiation conversation and what fee to ask for. If you want a consultant to actually run the renegotiation, we don’t sell that work, but you’ll know enough from the report to brief one.",
  },
];

export function Faq() {
  return (
    <section className="border-t border-canvas-border bg-canvas-tint">
      <div className="mx-auto max-w-container px-6 py-24 sm:px-8 sm:py-28">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-accent sm:text-sm">
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
              <p className="mt-3 max-w-readable text-[15px] leading-relaxed text-ink-700">
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
      aria-hidden
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
