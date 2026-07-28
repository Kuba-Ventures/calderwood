import { Reveal } from "@/components/motion/reveal";
import { CountUp } from "@/components/motion/count-up";
import { Glow, SectionHead, radialGlow } from "./ui";

const stats = [
  {
    kicker: "up to",
    value: 35,
    suffix: "%",
    label: "below the 75th percentile on high-volume codes",
  },
  {
    kicker: "up to",
    value: 120,
    prefix: "$",
    suffix: "K",
    label: "recoverable per provider, every single year",
  },
  {
    kicker: "flat rate",
    value: 199,
    prefix: "$",
    label: "for the full breakdown, your report in minutes",
  },
];

export function StatBand() {
  return (
    <section className="relative overflow-hidden py-[76px] text-center">
      <Glow
        style={radialGlow("rgba(139,92,246,0.18)", 560, {
          top: -200,
          left: "50%",
          transform: "translateX(-50%)",
        })}
      />
      <div className="mx-auto max-w-wrap px-7">
        <SectionHead
          pill="The opportunity"
          title="What's typically hiding in a fee schedule."
        />
        <div className="relative z-[1] grid grid-cols-1 md:grid-cols-3">
          {stats.map((s, i) => (
            <Reveal
              key={s.label}
              delay={i * 100}
              className="border-t border-line px-[26px] py-5 first:border-t-0 md:border-l md:border-t-0 md:first:border-l-0"
            >
              <div className="mb-2.5 text-xs uppercase tracking-[0.1em] text-muted">
                {s.kicker}
              </div>
              <CountUp
                value={s.value}
                prefix={s.prefix}
                suffix={s.suffix}
                className="font-serif text-[clamp(44px,7vw,72px)] font-semibold leading-none tracking-[-0.03em] text-brand"
              />
              <div className="mx-auto mt-3.5 max-w-[24ch] text-[15px] text-muted">
                {s.label}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
