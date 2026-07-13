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
        </div>
      </div>
    </div>
  );
}
