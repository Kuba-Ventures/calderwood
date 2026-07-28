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

// Illustrative sample — a plain-English example of what the report shows,
// not a computed figure.
const sample: { code: string; label: string; you: string; ucr: string; gap: string }[] = [
  { code: "D2740", label: "Crown, porcelain", you: "$1,150", ucr: "$1,410", gap: "+$260" },
  { code: "D2950", label: "Core buildup", you: "$215", ucr: "$305", gap: "+$90" },
  { code: "D3330", label: "Root canal, molar", you: "$1,020", ucr: "$1,240", gap: "+$220" },
];

/**
 * Split layout with card steps. The three steps are numbered, icon-led cards
 * down the left (from v2); the right shows a worked money example, code by
 * code (from v3). Cards look like cards, and the reader always sees the
 * dollar outcome the report produces.
 */
export function HowItWorksHybrid() {
  return (
    <section
      id="how"
      className="scroll-mt-24 border-y border-line bg-tint-2 py-[74px]"
    >
      <div className="mx-auto max-w-wrap px-7">
        <SectionHead
          pill="How it works"
          title="Three simple steps to a stronger fee schedule"
          sub="Every step points at the same thing: the dollars each carrier is underpaying you."
        />
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2 lg:gap-14">
          {/* Card steps */}
          <div className="space-y-6">
            {steps.map((s, i) => (
              <Reveal key={s.title} delay={i * 90}>
                <div className="flex flex-col rounded-2xl border border-line bg-white p-6 shadow-[0_24px_60px_-42px_rgba(17,24,72,0.42)]">
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
                    <h3 className="text-[20px] font-bold leading-tight text-heading">
                      {s.title}
                    </h3>
                  </div>
                  <p className="mt-4 text-[17px] leading-relaxed text-body">
                    {s.body}
                  </p>
                  <div className="mt-4 border-t border-line pt-3 text-[16px] font-semibold text-brand-deep">
                    {s.outcome}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Worked example */}
          <Reveal delay={120} y={20} className="lg:sticky lg:top-24">
            <div className="rounded-2xl border border-line bg-white p-7 shadow-[0_28px_70px_-44px_rgba(17,24,72,0.5)]">
              <div className="text-[13px] font-semibold uppercase tracking-[0.14em] text-brand">
                Sample of what you get
              </div>
              <h3 className="mt-1.5 font-serif text-[26px] font-semibold text-brand-deep">
                Underpayment, code by code
              </h3>

              <table className="mt-5 w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-line text-[13px] uppercase tracking-[0.08em] text-muted">
                    <th className="py-2 font-semibold">Code</th>
                    <th className="py-2 text-right font-semibold">Your fee</th>
                    <th className="py-2 text-right font-semibold">UCR 75th</th>
                    <th className="py-2 text-right font-semibold">Gap</th>
                  </tr>
                </thead>
                <tbody>
                  {sample.map((r) => (
                    <tr key={r.code} className="border-b border-line/70">
                      <td className="py-3">
                        <div className="text-[16px] font-bold text-heading">
                          {r.code}
                        </div>
                        <div className="text-[14px] text-muted">{r.label}</div>
                      </td>
                      <td className="py-3 text-right text-[16px] tabular-nums text-body">
                        {r.you}
                      </td>
                      <td className="py-3 text-right text-[16px] tabular-nums text-body">
                        {r.ucr}
                      </td>
                      <td className="py-3 text-right text-[17px] font-bold tabular-nums text-brand-deep">
                        {r.gap}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-6 flex items-baseline justify-between rounded-xl bg-[#EEF1FE] px-5 py-4">
                <span className="text-[16px] font-semibold text-brand-deep">
                  Recoverable across all codes
                </span>
                <span className="font-serif text-[30px] font-semibold leading-none text-brand-deep">
                  $73,840
                </span>
              </div>
              <p className="mt-3 text-[14px] text-muted">
                Illustrative example. Your report reflects your own fees and
                local benchmarks.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
