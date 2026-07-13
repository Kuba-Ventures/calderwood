const carriers = [
  "Delta",
  "Aetna",
  "Cigna",
  "UnitedHealthcare",
  "MetLife",
  "Guardian",
  "Humana",
];

export function ProofBar() {
  return (
    <div className="pb-1.5 pt-11 text-center">
      <div className="mx-auto mb-[22px] max-w-wrap px-7 font-data text-xs uppercase tracking-[0.12em] text-muted">
        Benchmarks every major carrier
      </div>
      <div className="marquee-mask relative overflow-hidden">
        <div className="animate-marquee flex w-max gap-14" aria-hidden="true">
          {[...carriers, ...carriers].map((c, i) => (
            <span
              key={i}
              className="whitespace-nowrap font-display text-2xl font-bold text-[#AAB2D4]"
            >
              {c}
            </span>
          ))}
    <section className="border-y border-canvas-border bg-canvas">
      <div className="mx-auto max-w-container px-6 py-6 sm:px-8 sm:py-7">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between sm:gap-10">
          <p className="max-w-md text-sm leading-relaxed text-ink-500">
            Built from a national UCR benchmark database spanning all 50 states.
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
    </div>
  );
}
