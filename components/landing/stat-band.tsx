import { Reveal } from "@/components/motion/reveal";
import { Glow, SectionHead, radialGlow } from "./ui";

type Tile = {
  kind: "text" | "price";
  kicker: string;
  headline: string;
  label: string;
};

const tiles: Tile[] = [
  {
    kind: "text",
    kicker: "Every billed code",
    headline: "Code by code",
    label: "your fee next to the local benchmark, with the gap in dollars",
  },
  {
    kind: "text",
    kicker: "Every contracted carrier",
    headline: "By carrier",
    label: "dollars below the 75th percentile, so you know who to call first",
  },
  {
    kind: "price",
    kicker: "flat rate",
    // Matches REPORT_PRICE_USD_CENTS (19900) in lib/stripe.ts. Static text, so
    // the price is visible without any scroll-triggered animation.
    headline: "$199",
    label: "for the full breakdown, your report in minutes",
  },
];

const headlineClass =
  "font-serif font-semibold leading-none tracking-[-0.03em] text-brand";

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
        <SectionHead pill="The opportunity" title="What your report shows." />
        <div className="relative z-[1] grid grid-cols-1 md:grid-cols-3">
          {tiles.map((t, i) => (
            <Reveal
              key={t.label}
              delay={i * 100}
              className="flex flex-col items-center border-t border-line px-[26px] py-5 first:border-t-0 md:border-l md:border-t-0 md:first:border-l-0"
            >
              <div className="mb-2.5 text-xs uppercase tracking-[0.1em] text-muted">
                {t.kicker}
              </div>
              {t.kind === "price" ? (
                <div className={`${headlineClass} text-[clamp(44px,7vw,72px)]`}>
                  {t.headline}
                </div>
              ) : (
                <div
                  className={`${headlineClass} flex min-h-[clamp(44px,7vw,72px)] items-center text-[clamp(34px,4.6vw,50px)]`}
                >
                  {t.headline}
                </div>
              )}
              <div className="mx-auto mt-3.5 max-w-[26ch] text-[15px] text-body">
                {t.label}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
