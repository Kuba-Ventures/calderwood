import type { ReactNode } from "react";
import { Reveal } from "@/components/motion/reveal";
import { SectionHead } from "./ui";

const steps: {
  icon: ReactNode;
  title: string;
  body: string;
  outcome: string;
}[] = [
  {
    icon: <path d="M12 15V3M7 8l5-5 5 5M4 17v2a1 1 0 001 1h14a1 1 0 001-1v-2" />,
    title: "Upload your data",
    body: "Securely upload your production report: CSV, PDF, or a snapshot of your top codes. We handle the rest.",
    outcome: "No spreadsheets to build",
  },
  {
    icon: <path d="M5 20V10M12 20V4M19 20v-7" />,
    title: "We analyze and benchmark",
    body: "We compare your fees to local and national UCR benchmarks, code by code, against the 50th, 75th, and 90th percentiles.",
    outcome: "Every CDT code checked",
  },
  {
    icon: (
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M9 13h6M9 17h6" />
    ),
    title: "Get your new fee schedule",
    body: "Review your opportunities, see which carrier to call first, and build a new fee schedule with confidence.",
    outcome: "$73,840 average recovery",
  },
];

/**
 * Bold outcome cards. Each step is a solid, bordered card with a big numbered
 * label, an icon, and a plain-English outcome pinned to the bottom — buttons
 * and cards look like what they are. The final card leads with the dollars
 * recoverable so the money stays the focus.
 */
export function HowItWorksCards() {
  return (
    <section
      id="how"
      className="scroll-mt-24 border-y border-line bg-tint-2 py-[74px]"
    >
      <div className="mx-auto max-w-wrap px-7">
        <SectionHead
          pill="How it works"
          title="Three simple steps to a stronger fee schedule"
          sub="From your production report to a stronger fee schedule, without the guesswork."
        />
        <div className="grid grid-cols-1 gap-7 md:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 90}>
              <div className="flex h-full flex-col rounded-2xl border border-line bg-white p-7 shadow-[0_24px_60px_-42px_rgba(17,24,72,0.42)]">
                <div className="flex items-center gap-4">
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand-deep font-serif text-[24px] font-semibold text-white">
                    {i + 1}
                  </span>
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-[#EEF1FE]">
                    <svg
                      width="24"
                      height="24"
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
                </div>
                <h3 className="mt-6 text-[21px] font-bold leading-tight text-heading">
                  {s.title}
                </h3>
                <p className="mt-3 text-[17px] leading-relaxed text-body">
                  {s.body}
                </p>
                <div className="mt-6 border-t border-line pt-4 text-[16px] font-semibold text-brand-deep">
                  {s.outcome}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
