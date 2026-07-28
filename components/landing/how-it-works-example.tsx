import { Reveal } from "@/components/motion/reveal";
import { SectionHead } from "./ui";

const steps: { title: string; body: string }[] = [
  {
    title: "Upload your data",
    body: "Securely upload your production report: CSV, PDF, or a snapshot of your top codes. We handle the rest.",
  },
  {
    title: "We analyze and benchmark",
    body: "We compare your fees to local and national UCR benchmarks, code by code, against the 50th, 75th, and 90th percentiles.",
  },
  {
    title: "Get your new fee schedule",
    body: "Review your opportunities, see which carrier to call first, and build a new fee schedule with confidence.",
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
 * Split layout: the three steps on the left, a worked money example on the
 * right so the reader sees the actual outcome — code, your fee, the UCR
 * benchmark, and the dollar gap. Leads with the savings, in plain terms an
 * office manager reads at a glance.
 */
export function HowItWorksExample() {
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
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14">
          {/* Steps */}
          <ol className="space-y-8">
            {steps.map((s, i) => (
              <Reveal key={s.title} delay={i * 90}>
                <li className="grid grid-cols-[52px_1fr] gap-5">
                  <span className="grid h-[52px] w-[52px] place-items-center rounded-full bg-brand-deep font-serif text-[22px] font-semibold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-[20px] font-bold leading-tight text-heading">
                      {s.title}
                    </h3>
                    <p className="mt-2 max-w-[46ch] text-[17px] leading-relaxed text-body">
                      {s.body}
                    </p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>

          {/* Worked example */}
          <Reveal delay={120} y={20}>
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
