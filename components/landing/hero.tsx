export function Hero() {
  return (
    <section className="relative">
      <div className="mx-auto max-w-container px-6 sm:px-8 pt-20 pb-20 sm:pt-28 sm:pb-24">
        <p className="text-xs sm:text-sm font-medium uppercase tracking-[0.14em] text-accent">
          For independent dental practices and small DSOs
        </p>
        <h1 className="mt-5 text-balance text-[40px] font-semibold leading-[1.05] tracking-tighter2 text-ink-900 sm:text-[64px]">
          How much is each carrier underpaying you?
        </h1>
        <p className="mt-6 max-w-[640px] text-pretty text-lg leading-relaxed text-ink-700 sm:text-xl">
          A code-by-code benchmark of your fee schedule against UCR data in your zip code, delivered within 24 hours. Most independent practices are reimbursed 15–35% below the 75th percentile in their metro. The gap typically runs $40,000 to $120,000 per provider per year.
        </p>
        <div className="mt-10 flex flex-col items-start gap-3">
          <a
            href="/start"
            className="inline-flex items-center justify-center rounded-md bg-ink-900 px-6 py-4 text-base font-medium text-white shadow-sm transition hover:bg-ink-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
          >
            Find out what you&rsquo;re leaving on the table for $199
          </a>
          <p className="text-sm text-ink-500">
            $199 flat. No sales call. Report in your inbox in 24 hours.
          </p>
        </div>
      </div>
    </section>
  );
}
