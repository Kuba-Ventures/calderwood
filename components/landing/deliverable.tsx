import { Reveal } from "@/components/motion/reveal";
import { PercentileBar } from "./percentile-bar";
import { CarrierBar } from "./carrier-bar";
import { SectionHead } from "./ui";

const percentiles = [
  { code: "D0150", pct: 62, label: "62nd" },
  { code: "D2150", pct: 41, label: "41st" },
  { code: "D2740", pct: 55, label: "55th" },
  { code: "D3310", pct: 48, label: "48th" },
];

const carriers = [
  { name: "Cigna", value: "$32,180", pct: 100 },
  { name: "Aetna", value: "$20,400", pct: 63 },
  { name: "UnitedHealthcare", value: "$16,150", pct: 50 },
  { name: "MetLife", value: "$10,290", pct: 32 },
  { name: "Other", value: "$8,400", pct: 26 },
];

const topCodes = [
  { code: "D2740", desc: "Crown, porcelain", annual: "$4,260" },
  { code: "D7140", desc: "Extraction, erupted", annual: "$3,780" },
  { code: "D2950", desc: "Build-up, post", annual: "$2,225" },
  { code: "D3310", desc: "Endo, anterior", annual: "$1,596" },
];

const cardBase =
  "relative overflow-hidden rounded-[18px] border border-line bg-white p-[26px] shadow-[0_10px_30px_-22px_rgba(17,24,72,0.4)] transition duration-200 hover:-translate-y-[5px] hover:shadow-soft";

function Idx({ children }: { children: string }) {
  return (
    <span className="inline-flex rounded-lg border border-[#DCE1FB] bg-[#EEF1FE] px-[9px] py-[3px] font-data text-xs tracking-[0.05em] text-brand">
      {children}
    </span>
  );
}

function CardHead({
  idx,
  title,
  body,
}: {
  idx: string;
  title: string;
  body: string;
}) {
  return (
    <>
      <Idx>{idx}</Idx>
      <h3 className="mb-2 mt-3.5 text-[21px] font-bold text-brand-deep">
        {title}
      </h3>
      <p className="text-[14.5px] text-body">{body}</p>
    </>
  );
}

export function Deliverable() {
  return (
    <section id="features" className="scroll-mt-24 py-[76px]">
      <div className="mx-auto max-w-wrap px-7">
        <SectionHead
          pill="What's in the report"
          title="Three answers, one PDF."
          sub="Built from a national UCR benchmark database covering all 50 states, not crowdsourced guesses."
        />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <Reveal className={`${cardBase} md:col-span-2`}>
            <CardHead
              idx="01"
              title="Your fees, scored against your zip code"
              body="Every code benchmarked against the 50th, 75th, and 90th percentiles for your specific zip."
            />
            <div className="mt-5">
              {percentiles.map((p) => (
                <PercentileBar
                  key={p.code}
                  code={p.code}
                  pct={p.pct}
                  label={p.label}
                />
              ))}
              <div className="mt-3.5 flex gap-4 font-data text-[11px] text-muted">
                <span>
                  <i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-[3px] bg-brand align-[-1px]" />
                  Your fee
                </span>
                <span>
                  <i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-[3px] bg-gold align-[-1px]" />
                  75th percentile marker
                </span>
              </div>
            </div>
          </Reveal>

          <Reveal
            delay={80}
            className={`${cardBase} md:col-start-3 md:row-span-2 md:row-start-1`}
          >
            <CardHead
              idx="03"
              title="Which carrier to call first"
              body="Each contracted carrier scored on total recoverable revenue."
            />
            <div className="mt-5">
              {carriers.map((c) => (
                <CarrierBar
                  key={c.name}
                  name={c.name}
                  value={c.value}
                  pct={c.pct}
                />
              ))}
            </div>
          </Reveal>

          <Reveal delay={160} className={`${cardBase} md:col-span-2`}>
            <CardHead
              idx="02"
              title="The 10 codes losing you the most money"
              body="Ranked by annual dollar impact: gap to the 75th percentile × your yearly frequency."
            />
            <table className="mt-5 w-full border-collapse text-[13.5px]">
              <tbody>
                {topCodes.map((r) => (
                  <tr
                    key={r.code}
                    className="border-b border-line last:border-b-0"
                  >
                    <td className="py-[11px] font-data text-heading">
                      {r.code}
                    </td>
                    <td className="py-[11px] text-body">{r.desc}</td>
                    <td className="py-[11px] text-right font-data font-semibold text-coral">
                      {r.annual}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
