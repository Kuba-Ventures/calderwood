import type { ReactNode } from "react";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "./ui";

/** Left-column value props, each with a small line icon. */
const FEATURES: { icon: ReactNode; text: string }[] = [
  {
    icon: (
      <path d="M12 15V3M7 8l5-5 5 5M4 17v2a1 1 0 001 1h14a1 1 0 001-1v-2" />
    ),
    text: "Identify underpayments code by code",
  },
  {
    icon: <path d="M3 3v18h18M7 15l4-4 3 3 5-6" />,
    text: "Benchmark against local and national data",
  },
  {
    icon: (
      <path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    ),
    text: "Build a new fee schedule with confidence",
  },
];

function FeatIcon({ children }: { children: ReactNode }) {
  return (
    <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-[#EEF1FE]">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-brand"
      >
        {children}
      </svg>
    </span>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-wrap grid-cols-1 items-center gap-12 px-7 pb-14 pt-8 lg:grid-cols-[1.02fr_1.28fr] lg:gap-14 lg:pt-12">
        <Reveal>
          <h1 className="font-serif text-[clamp(38px,5vw,55px)] font-semibold leading-[1.05] tracking-[-0.02em] text-brand-deep [text-wrap:balance]">
            A better fee schedule starts with better data.
          </h1>
          <p className="mt-5 max-w-[34ch] text-[18px] leading-relaxed text-body">
            See exactly what insurance companies are paying in your area, where
            you&apos;re leaving money on the table, and build a fee schedule
            that maximizes production and profitability.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button href="/signup">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 16V4M6 10l6-6 6 6M4 20h16" />
              </svg>
              Upload Production Report
            </Button>
            <Button href="#sample" variant="ghost">
              See a Sample Report
            </Button>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-4">
            {FEATURES.map((f) => (
              <li key={f.text} className="flex max-w-[210px] items-center gap-3">
                <FeatIcon>{f.icon}</FeatIcon>
                <span className="text-[15px] font-medium leading-snug text-ink-700">
                  {f.text}
                </span>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal y={40} delay={120}>
          <ConsoleCard />
        </Reveal>
      </div>
    </section>
  );
}

/**
 * Static "Fee Assessment" card shown beside the hero copy. It leads with the
 * single savings number, then a few supporting figures and a comparison chart,
 * so a non-technical reader sees the opportunity at a glance.
 */
function ConsoleCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_34px_80px_-42px_rgba(30,27,75,0.45)]">
      <div className="flex items-center gap-[7px] border-b border-line bg-[#FAF9FC] px-[18px] py-[13px]">
        <span className="h-[11px] w-[11px] rounded-full bg-[#F0685F]" />
        <span className="h-[11px] w-[11px] rounded-full bg-[#F7C04A]" />
        <span className="h-[11px] w-[11px] rounded-full bg-[#4CAF6D]" />
        <span className="ml-2 text-[13px] font-semibold text-ink-600">
          Fee Assessment
        </span>
        <span className="ml-auto text-[13px] font-medium text-ink-500">
          D2740 · Crown
        </span>
      </div>

      <div className="p-6 sm:p-7">
        <div className="text-[13px] font-semibold uppercase tracking-[0.1em] text-ink-500">
          Annual opportunity
        </div>
        <div className="mt-1.5 font-serif text-[clamp(40px,6vw,52px)] font-semibold leading-none tracking-[-0.02em] text-coral">
          $73,840
        </div>
        <div className="mt-2.5 text-[15px] leading-relaxed text-body">
          Recoverable across your 20 most-billed codes, at the 75th-percentile
          benchmark.
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <Stat k="Your average" v="$605" tone="ink" />
          <Stat k="Fair benchmark" v="$1,125" tone="green" />
          <Stat k="Per procedure" v="+$520" tone="coral" />
        </div>

        <div className="mt-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[14px] font-semibold text-heading">
              You vs. the benchmark
            </div>
            <div className="flex gap-4 text-[12px] text-ink-500">
              <span className="inline-flex items-center gap-1.5">
                <i className="inline-block h-0 w-[16px] border-t-[2.5px] border-brand" />
                You
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="inline-block h-0 w-[16px] border-t-[2.5px] border-dashed border-[#2f9e6a]" />
                Benchmark
              </span>
            </div>
          </div>
          <ComparisonChart />
        </div>
      </div>
    </div>
  );
}

function Stat({
  k,
  v,
  tone,
}: {
  k: string;
  v: string;
  tone: "ink" | "green" | "coral";
}) {
  const color =
    tone === "green"
      ? "text-[#2f9e6a]"
      : tone === "coral"
        ? "text-coral"
        : "text-heading";
  return (
    <div className="rounded-xl border border-line p-3.5">
      <div className="text-[13px] font-medium text-ink-500">{k}</div>
      <div className={`mt-1 text-[22px] font-bold tracking-[-0.01em] ${color}`}>
        {v}
      </div>
    </div>
  );
}

/** Reimbursement vs. benchmark line chart with an opportunity band on D2740. */
function ComparisonChart() {
  return (
    <svg
      viewBox="0 0 460 200"
      className="mt-2 w-full"
      role="img"
      aria-label="Your reimbursement runs below the 75th-percentile benchmark across five codes"
    >
      <g stroke="#EEF0F5">
        <line x1="52" y1="18" x2="452" y2="18" />
        <line x1="52" y1="62" x2="452" y2="62" />
        <line x1="52" y1="106" x2="452" y2="106" />
        <line x1="52" y1="150" x2="452" y2="150" />
      </g>
      <g fill="#8A90A2" fontSize="11">
        <text x="46" y="22" textAnchor="end">$1,500</text>
        <text x="46" y="66" textAnchor="end">$1,000</text>
        <text x="46" y="110" textAnchor="end">$500</text>
        <text x="46" y="154" textAnchor="end">$0</text>
      </g>
      <rect x="118" y="18" width="52" height="132" fill="rgba(79,70,229,0.10)" />
      <polyline
        fill="none"
        stroke="#2f9e6a"
        strokeWidth="2.5"
        strokeDasharray="4 4"
        strokeLinecap="round"
        points="64,80 144,62 224,70 304,54 384,46 452,38"
      />
      <polyline
        fill="none"
        stroke="var(--brand)"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        points="64,122 144,106 224,126 304,120 384,106 452,98"
      />
      <circle cx="144" cy="106" r="4.5" fill="var(--brand)" />
      <circle cx="144" cy="62" r="4.5" fill="#fff" stroke="#2f9e6a" strokeWidth="2.5" />
      <g fill="#8A90A2" fontSize="11" textAnchor="middle">
        <text x="64" y="172">D2140</text>
        <text x="144" y="172">D2740</text>
        <text x="224" y="172">D2750</text>
        <text x="304" y="172">D2950</text>
        <text x="384" y="172">D3310</text>
      </g>
    </svg>
  );
}
