import type { ReactNode } from "react";
import { Reveal } from "@/components/motion/reveal";
import { SectionHead } from "./ui";

const steps: { icon: ReactNode; title: string; body: string }[] = [
  {
    icon: <path d="M12 15V3M7 8l5-5 5 5M4 17v2a1 1 0 001 1h14a1 1 0 001-1v-2" />,
    title: "Upload Your Data",
    body: "Securely upload your production report: CSV, PDF, or a snapshot of your top codes. We handle the rest.",
  },
  {
    icon: <path d="M5 20V10M12 20V4M19 20v-7" />,
    title: "We Analyze & Benchmark",
    body: "We compare your fees to local and national UCR benchmarks, code by code, against the 50th, 75th, and 90th percentiles.",
  },
  {
    icon: (
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M9 13h6M9 17h6" />
    ),
    title: "Get Your New Fee Schedule",
    body: "Review your opportunities, see which carrier to call first, and build a new fee schedule with confidence.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how"
      className="scroll-mt-24 border-y border-line bg-tint-2 py-[74px]"
    >
      <div className="mx-auto max-w-wrap px-7">
        <SectionHead
          pill="How it works"
          title="Three simple steps to a stronger fee schedule"
        />
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 90}>
              <span className="grid h-16 w-16 place-items-center rounded-full bg-[#EEF1FE]">
                <svg
                  width="27"
                  height="27"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-brand-deep"
                >
                  {s.icon}
                </svg>
              </span>
              <h3 className="mt-5 text-[19px] font-bold text-heading">
                {`${i + 1}. ${s.title}`}
              </h3>
              <p className="mt-2.5 max-w-[32ch] text-[16px] leading-relaxed text-body">
                {s.body}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
