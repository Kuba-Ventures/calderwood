import { Reveal } from "@/components/motion/reveal";
import { SectionHead } from "./ui";

const faqs = [
  {
    q: "Where does the UCR data come from?",
    a: "REFMed's national UCR database, covering all 50 states. No crowdsourced fees, no modeled estimates. Where confidence is low for a specific code or zip, we flag it on the report instead of reporting false precision.",
    a: "A national UCR benchmark database covering all 50 states. No crowdsourced fees, no modeled estimates. Where confidence is low for a specific code or zip (low-volume codes, rural markets), we flag it on the report instead of reporting a false-precision number.",
  },
  {
    q: "What if my fee schedule isn't in a clean format?",
    a: "Upload whatever you have. We accept CSVs from Dentrix, Eaglesoft, and Open Dental directly, plus PDFs or screenshots. If you only know your top 20 codes off the top of your head, that's enough to run the assessment.",
  },
  {
    q: "Do you contact my carriers?",
    a: "No. We never contact your carriers, your patients, or anyone else. The report is for you. What you do with it — renegotiate yourself, hire a consultant, drop a contract — is your decision.",
  },
  {
    q: "Is my data confidential?",
    a: "Yes. Fee schedules are proprietary practice data and we treat them that way. We don't share, sell, or aggregate practice-level information. We never see patient data, and the intake form is built to refuse PHI.",
  },
  {
    q: "What happens after I get the report?",
    a: "Read it, then identify the two or three carriers with the largest gap. The report tells you which codes to lead with in a renegotiation and what fee to ask for. If you want a consultant to run it, you'll know enough to brief one.",
  },
];

export function Faq() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-wrap px-7">
        <SectionHead
          pill="FAQ"
          title={
            <>
              Questions worth{" "}
              <span className="text-gradient">answering up front.</span>
            </>
          }
        />
        <Reveal className="mx-auto max-w-[780px]">
          {faqs.map((f) => (
            <details
              key={f.q}
              className="group mb-3 overflow-hidden rounded-[14px] border border-line bg-white transition-shadow open:shadow-soft"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 px-[22px] py-5 font-display text-[17px] font-bold text-heading [&::-webkit-details-marker]:hidden">
                {f.q}
                <span className="grid h-[26px] w-[26px] flex-none place-items-center rounded-full bg-[#EEF1FE] font-bold text-brand transition-transform duration-200 group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="max-w-[68ch] px-[22px] pb-[22px] text-[15px] leading-relaxed text-muted">
                {f.a}
              </p>
            </details>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
