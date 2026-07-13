import { Reveal } from "@/components/motion/reveal";
import { SectionHead } from "./ui";

const steps = [
  {
    n: "1",
    title: "Enter your practice zip",
    body: "We use it to pull the right UCR percentiles. Nothing else.",
  },
  {
    n: "2",
    title: "Tell us your provider count",
    body: "1, 2–5, or 6+. Same price for everyone right now.",
  },
  {
    n: "3",
    title: "Give us your fee schedule",
    body: "Upload a CSV, paste a table, snap an EOB, or hand-enter your top 20 codes.",
  },
  {
    n: "4",
    title: "Pick your carriers",
    body: "Delta, Aetna, Cigna, MetLife, UnitedHealthcare, Guardian, BCBS, and more.",
  },
];

export function HowItWorks() {
  return (
    <section className="relative bg-[linear-gradient(180deg,#fff,var(--tint)_40%,#fff)] py-24">
      <div className="mx-auto max-w-wrap px-7">
        <SectionHead
          pill="How it works"
          title={
            <>
              Five minutes of your time.
              <br />
              <span className="text-gradient">Your report in minutes.</span>
            </>
          }
        />
        <div className="relative grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div
            aria-hidden="true"
            className="absolute left-[8%] right-[8%] top-[38px] hidden h-0.5 bg-[linear-gradient(90deg,transparent,#D6DBF4_12%,#D6DBF4_88%,transparent)] lg:block"
          />
          {steps.map((s, i) => (
            <Reveal
              key={s.n}
              delay={i * 90}
              className="relative z-[1] text-center"
            >
              <div className="mx-auto mb-[18px] grid h-14 w-14 place-items-center rounded-2xl border border-line bg-white font-data text-[20px] font-semibold text-brand shadow-soft">
                {s.n}
              </div>
              <h4 className="mb-2 font-display text-[16.5px] font-bold text-heading">
                {s.title}
              </h4>
              <p className="px-1.5 text-sm text-muted">{s.body}</p>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-[38px] text-center text-[15px] text-muted">
          Your benchmarked report is ready within minutes. Review the
          opportunity we found, then pay $199 to unlock the full breakdown and
          PDF. <b className="text-heading">No charge until your report is ready.</b>
        </Reveal>
      </div>
    </section>
  );
}
