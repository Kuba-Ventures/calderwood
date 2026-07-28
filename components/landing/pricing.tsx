import { Reveal } from "@/components/motion/reveal";
import { Arrow, Button, SectionHead } from "./ui";

const included = [
  "Code-by-code underpayment analysis",
  "Percentile scoring against your zip code",
  "Carrier ranking by recoverable revenue",
  "Full PDF report, delivered in minutes",
];

export function Pricing() {
  return (
    <section
      id="pricing"
      className="scroll-mt-24 border-y border-line bg-tint-2 py-[76px]"
    >
      <div className="mx-auto max-w-wrap px-7">
        <SectionHead pill="Pricing" title="One flat price. No sales call." />
        <Reveal
          y={40}
          className="mx-auto max-w-[520px] rounded-[20px] border border-line bg-white p-10 text-center shadow-soft"
        >
          <div className="font-serif text-[64px] font-semibold leading-none tracking-[-0.02em] text-brand-deep">
            $199
            <span className="text-[19px] font-semibold text-muted"> / report</span>
          </div>
          <ul className="mx-auto mt-6 inline-block space-y-[11px] text-left">
            {included.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 text-[15px] text-ink-700"
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
                  className="mt-0.5 flex-none text-brand"
                  aria-hidden="true"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-7">
            <Button href="/signup">
              Get Started <Arrow />
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
