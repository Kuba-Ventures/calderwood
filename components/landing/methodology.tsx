import { Reveal } from "@/components/motion/reveal";
import { SectionHead } from "./ui";

function LedgerRow({
  k,
  sub,
  v,
  op = false,
}: {
  k: string;
  sub: string;
  v: string;
  op?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between border-b border-line px-[22px] py-[17px]">
      <span className="text-sm text-body">
        {k}
        <small className="block text-[13px] text-body">{sub}</small>
      </span>
      <span
        className={`font-data text-[22px] font-medium tabular-nums ${
          op ? "text-muted" : "text-heading"
        }`}
      >
        {v}
      </span>
    </div>
  );
}

export function Methodology() {
  return (
    <section id="sample" className="scroll-mt-24 border-y border-line bg-tint-2 py-[76px]">
      <div className="mx-auto grid max-w-wrap grid-cols-1 items-center gap-14 px-7 lg:grid-cols-[1fr_0.95fr] lg:gap-[56px]">
        <SectionHead
          align="left"
          pill="Methodology"
          title="The math behind your report."
          sub="One worked example using D2740, a porcelain crown. Every code in your fee schedule runs through the same arithmetic. No modeled estimates, no crowdsourced fees."
        />
        <Reveal
          y={40}
          className="overflow-hidden rounded-[18px] border border-line bg-white shadow-soft"
        >
          <div className="flex justify-between bg-brand-deep px-[22px] py-[15px] font-data text-xs text-white">
            <span>WORKED EXAMPLE</span>
            <span className="text-[#C9C6F5]">D2740 · Crown, porcelain</span>
          </div>
          <LedgerRow k="Your fee" sub="what you charge today" v="$185" />
          <LedgerRow
            k="75th percentile UCR"
            sub="a fair target for your ZIP"
            v="$215"
          />
          <LedgerRow
            k="Annual frequency"
            sub="procedures last year"
            v="× 142"
            op
          />
          <div className="flex items-baseline justify-between bg-[linear-gradient(160deg,#FFF4F1,#FFFAFA)] px-[22px] py-[17px]">
            <span className="font-bold text-coral">Recoverable per year</span>
            <span className="font-data text-[30px] font-semibold tabular-nums text-coral">
              $4,260
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
