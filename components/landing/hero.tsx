import { ReportMockup } from "./report-mockup";

export function Hero() {
  return (
    <section className="relative">
      <div className="mx-auto max-w-container px-6 py-20 sm:px-8 sm:py-24 lg:py-28">
        <div className="grid gap-14 lg:grid-cols-[1fr_minmax(0,440px)] lg:items-center lg:gap-20">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-accent sm:text-sm">
              For independent dental practices and small DSOs
            </p>
            <h1 className="mt-5 max-w-[14ch] text-balance text-[40px] font-semibold leading-[1.05] tracking-tighter2 text-ink-900 sm:text-[56px] lg:text-[60px]">
              How much is each carrier underpaying you?
            </h1>
            <p className="mt-6 max-w-readable text-pretty text-lg leading-relaxed text-ink-700 sm:text-xl">
              A code-by-code benchmark of your fee schedule against UCR data in your zip code, in minutes. Most independent practices are reimbursed 15–35% below the 75th percentile in their metro. The gap typically runs{" "}
              <span className="font-serif font-medium text-red-800">
                $40,000 to $120,000
              </span>{" "}
              per provider per year.
            </p>
            <div className="mt-10 flex flex-col items-start gap-3">
              <a
                href="/signup"
                className="group inline-flex items-center justify-center rounded-md bg-ink-900 px-6 py-4 text-base font-medium text-white shadow-sm transition hover:bg-ink-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
              >
                <span className="border-b-2 border-transparent transition group-hover:border-gain">
                  Find out what you&rsquo;re leaving on the table
                </span>
              </a>
              <p className="text-sm text-ink-500">
                See your opportunity in minutes. Pay $199 only to unlock the full breakdown.
              </p>
            </div>
          </div>
          <div className="relative">
            <ReportMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
