import type { ReactNode } from "react";
import { Reveal } from "@/components/motion/reveal";
import { SectionHead } from "./ui";

const steps: { title: string; body: string; time: string }[] = [
  {
    title: "Upload your data",
    body: "Securely upload your production report: CSV, PDF, or a snapshot of your top codes. We handle the rest.",
    time: "Takes about 2 minutes",
  },
  {
    title: "We analyze and benchmark",
    body: "We compare your fees to local and national UCR benchmarks, code by code, against the 50th, 75th, and 90th percentiles.",
    time: "Done automatically",
  },
  {
    title: "Get your new fee schedule",
    body: "Review your opportunities, see which carrier to call first, and build a new fee schedule with confidence.",
    time: "Ready in minutes",
  },
];

/**
 * Vertical numbered timeline. One step at a time, top to bottom, with large
 * numbered badges and a connecting rail — easy to follow for a non-technical,
 * older reader. Leads with the dollar outcome so the money is the focus.
 */
export function HowItWorksTimeline() {
  return (
    <section
      id="how"
      className="scroll-mt-24 border-y border-line bg-tint-2 py-[74px]"
    >
      <div className="mx-auto max-w-wrap px-7">
        <SectionHead
          pill="How it works"
          title="Three simple steps to a stronger fee schedule"
          sub="See exactly which codes are underpaid and how much you can recover, in minutes."
        />

        <Reveal className="mx-auto mb-14 max-w-[680px]">
          <div className="rounded-2xl border border-line bg-white px-7 py-6 text-center shadow-[0_24px_60px_-40px_rgba(17,24,72,0.4)]">
            <div className="text-[13px] font-semibold uppercase tracking-[0.14em] text-brand">
              The average practice finds
            </div>
            <div className="mt-1 font-serif text-[clamp(38px,6vw,56px)] font-semibold leading-none text-brand-deep">
              $73,840
            </div>
            <div className="mt-1.5 text-[17px] text-body">
              left on the table each year in underpaid claims.
            </div>
          </div>
        </Reveal>

        <ol className="mx-auto max-w-[720px]">
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 90}>
              <li className="relative grid grid-cols-[64px_1fr] gap-6 pb-12 last:pb-0">
                {/* connecting rail */}
                {i < steps.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute left-[31px] top-16 h-[calc(100%-4rem)] w-0.5 bg-[#D6DCF6]"
                  />
                )}
                <span className="relative z-10 grid h-16 w-16 place-items-center rounded-full bg-brand-deep font-serif text-[28px] font-semibold text-white shadow-[0_10px_26px_-10px_rgba(49,46,129,0.7)]">
                  {i + 1}
                </span>
                <div className="pt-2">
                  <h3 className="text-[22px] font-bold leading-tight text-heading">
                    {s.title}
                  </h3>
                  <p className="mt-2.5 max-w-[52ch] text-[17px] leading-relaxed text-body">
                    {s.body}
                  </p>
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#EEF1FE] px-3 py-1 text-[14px] font-semibold text-brand">
                    {s.time}
                  </div>
                </div>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
