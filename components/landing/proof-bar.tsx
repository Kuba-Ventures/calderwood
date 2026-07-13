export function ProofBar() {
  return (
    <section className="border-y border-canvas-border bg-canvas">
      <div className="mx-auto max-w-container px-6 py-6 sm:px-8 sm:py-7">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between sm:gap-10">
          <p className="max-w-md text-sm leading-relaxed text-ink-500">
            Built from REFMed&apos;s national UCR database, spanning all 50 states.
          </p>
          <div className="flex flex-col gap-3 sm:items-end">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-400">
              Benchmarks every major carrier
            </p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px] font-semibold tracking-[0.08em] text-ink-500">
              <span>DELTA</span>
              <span className="text-ink-300">·</span>
              <span>AETNA</span>
              <span className="text-ink-300">·</span>
              <span>CIGNA</span>
              <span className="text-ink-300">·</span>
              <span>UNITEDHEALTHCARE</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
