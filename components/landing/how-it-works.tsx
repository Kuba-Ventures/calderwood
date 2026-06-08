type Step = {
  n: string;
  title: string;
  body: React.ReactNode;
  Icon?: React.ComponentType;
};

const steps: Step[] = [
  {
    n: "1",
    title: "Enter your practice zip code",
    body: "We use the zip to pull the right UCR percentiles. Nothing else.",
    Icon: PinIcon,
  },
  {
    n: "2",
    title: "Tell us how many providers you have",
    body: "1, 2 to 5, or 6+. Same price for everyone right now.",
    Icon: PeopleIcon,
  },
  {
    n: "3",
    title: "Give us your current fee schedule",
    body: "Upload a CSV or Excel export, paste a table, snap a photo of an EOB, or hand-enter your top 20 CDT codes, whichever is least friction for you.",
    Icon: DocIcon,
  },
  {
    n: "4",
    title: "Pick your contracted carriers",
    body: "Delta, Aetna, Cigna, MetLife, UnitedHealthcare, Guardian, BCBS, Humana, or other.",
    Icon: ShieldIcon,
  },
];

export function HowItWorks() {
  return (
    <section className="bg-canvas">
      <div className="mx-auto max-w-container px-6 py-24 sm:px-8 sm:py-28">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-accent sm:text-sm">
            How it works
          </p>
          <h2 className="mt-5 text-3xl font-semibold tracking-tightish text-ink-900 sm:text-4xl">
            Five minutes of your time. Your report in minutes.
          </h2>
        </div>

        <ol className="relative mt-14 max-w-3xl">
          <div
            className="absolute left-[14px] top-2 bottom-3 w-px bg-canvas-border"
            aria-hidden
          />
          {steps.map(({ n, title, body, Icon }) => (
            <li key={n} className="relative pl-12 pb-10 last:pb-0">
              <div className="absolute left-0 top-0 flex h-7 w-7 items-center justify-center rounded-full border border-canvas-border bg-canvas font-mono text-xs text-ink-700">
                {n}
              </div>
              <div className="flex items-start justify-between gap-6">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold tracking-tightish text-ink-900">
                    {title}
                  </h3>
                  <div className="mt-2 max-w-readable text-[15px] leading-relaxed text-ink-700">
                    {body}
                  </div>
                </div>
                {Icon && (
                  <div className="hidden flex-none pt-1 text-ink-400 sm:block">
                    <Icon />
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-6 max-w-readable pl-12 text-base text-ink-700">
          Your benchmarked report is ready within minutes. Review the
          opportunity we found, then pay $199 to unlock the full breakdown and
          PDF. No charge until your report is ready.
        </p>
      </div>
    </section>
  );
}

function ShieldIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <path d="M12 21s-7-7.5-7-13a7 7 0 0114 0c0 5.5-7 13-7 13z" strokeLinejoin="round" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="9" cy="9" r="3" />
      <path d="M3 19a6 6 0 0112 0" />
      <circle cx="17.5" cy="10" r="2.25" />
      <path d="M16 19a4 4 0 015-4" />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  );
}
