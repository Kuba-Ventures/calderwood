import { Reveal } from "@/components/motion/reveal";
import { Arrow, Button, SectionHead } from "./ui";

const included = [
  "Code-by-code underpayment analysis",
  "Percentile scoring against your zip code",
  "Carrier ranking by recoverable revenue",
  "Full PDF report, delivered in minutes",
];

/**
 * Value comparison. A split card that sets the small one-time cost against the
 * large recovery side by side, then itemizes everything the report includes.
 * Puts "what you pay" and "what you get" in the same eyeful.
 */
export function PricingCompare() {
  return (
    <section
      id="pricing"
      className="scroll-mt-24 border-y border-line bg-tint-2 py-[76px]"
    >
      <div className="mx-auto max-w-wrap px-7">
        <SectionHead pill="Pricing" title="One flat price. No sales call." />
        <Reveal
          y={40}
          className="mx-auto max-w-[820px] overflow-hidden rounded-[20px] border border-line bg-white shadow-soft"
        >
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* What you pay */}
            <div className="border-b border-line p-9 text-center md:border-b-0 md:border-r">
              <div className="text-[13px] font-semibold uppercase tracking-[0.16em] text-muted">
                What you pay
              </div>
              <div className="mt-3 font-serif text-[64px] font-semibold leading-none tracking-[-0.02em] text-brand-deep">
                $199
              </div>
              <div className="mt-2 text-[17px] text-body">
                one-time, per report
              </div>
              <div className="mt-2 text-[15px] font-semibold text-muted">
                No subscription. No sales call.
              </div>
            </div>

            {/* What you get */}
            <div className="bg-brand-deep p-9 text-center text-white">
              <div className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#C9C6F5]">
                What you get back
              </div>
              <div className="mt-3 font-serif text-[64px] font-semibold leading-none tracking-[-0.02em]">
                $73,840
              </div>
              <div className="mt-2 text-[17px] text-[#DAD8FA]">
                average recovery, per year
              </div>
              <div className="mt-2 text-[15px] font-semibold text-[#C9C6F5]">
                Illustrative average, not a guarantee.
              </div>
            </div>
          </div>

          {/* Included, full width */}
          <div className="border-t border-line px-9 py-8 text-center">
            <div className="text-[15px] font-semibold text-heading">
              Every report includes
            </div>
            <ul className="mx-auto mt-5 grid max-w-[640px] grid-cols-1 gap-x-8 gap-y-3 text-left sm:grid-cols-2">
              {included.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-[16px] text-ink-700"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-1 flex-none text-brand"
                    aria-hidden="true"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Button href="/signup">
                Get Started <Arrow />
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
