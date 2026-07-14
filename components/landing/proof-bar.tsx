const carriers = [
  { name: "Delta Dental", src: "/logos/delta-dental.svg" },
  { name: "Aetna", src: "/logos/aetna.svg" },
  { name: "Cigna", src: "/logos/cigna.svg" },
  { name: "UnitedHealthcare", src: "/logos/unitedhealthcare.svg" },
  { name: "MetLife", src: "/logos/metlife.svg" },
  { name: "Guardian", src: "/logos/guardian.svg" },
  { name: "Humana", src: "/logos/humana.svg" },
];

export function ProofBar() {
  return (
    <div className="pb-1.5 pt-11 text-center">
      <div className="mx-auto mb-[22px] max-w-wrap px-7 font-data text-xs uppercase tracking-[0.12em] text-muted">
        Benchmarks every major carrier
      </div>
      <div className="marquee-mask relative overflow-hidden">
        <div className="animate-marquee flex w-max items-center gap-14" aria-hidden="true">
          {[...carriers, ...carriers].map((c, i) => (
            <img
              key={i}
              src={c.src}
              alt=""
              className="h-6 w-auto shrink-0 opacity-90"
            />
          ))}
        </div>
      </div>
      <ul className="sr-only">
        {carriers.map((c) => (
          <li key={c.name}>{c.name}</li>
        ))}
      </ul>
      <p className="mx-auto mt-4 max-w-wrap px-7 font-data text-[10px] leading-relaxed tracking-[0.04em] text-muted opacity-70">
        Carrier names and logos are trademarks of their respective owners.
        Calderwood is not affiliated with, sponsored by, or endorsed by any carrier shown.
      </p>
    </div>
  );
}
