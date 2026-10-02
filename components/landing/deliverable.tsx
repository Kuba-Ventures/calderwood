import { Reveal } from "@/components/motion/reveal";
import { PercentileBar } from "./percentile-bar";
import { CarrierBar } from "./carrier-bar";
import { SampleTag, SectionHead } from "./ui";

// All three cards show the same sample practice
// (test-fixtures/sample-practice/expected-output.json), so their figures agree
// with each other and with the methodology example. Each card is labeled
// "Sample practice".
const percentiles = [
  { code: "D0150", pct: 57, label: "57th" },
  { code: "D2150", pct: 49, label: "49th" },
  { code: "D2740", pct: 48, label: "48th" },
  { code: "D3310", pct: 48, label: "48th" },
];

const carriers = [
  { name: "Cigna", value: "$26,857", pct: 100 },
  { name: "UnitedHealthcare", value: "$22,467", pct: 84 },
  { name: "Aetna", value: "$18,974", pct: 71 },
  { name: "Delta", value: "$13,633", pct: 51 },
  { name: "MetLife", value: "$11,694", pct: 44 },
];

const topCodes = [
  { code: "D1110", desc: "Prophylaxis, adult", annual: "$7,004" },
  { code: "D4341", desc: "Perio scaling, 4+ teeth", annual: "$6,512" },
  { code: "D4910", desc: "Perio maintenance", annual: "$5,060" },
  { code: "D0210", desc: "X-rays, full series", annual: "$4,464" },
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
      <div className="flex items-center justify-between gap-2">
        <Idx>{idx}</Idx>
        <SampleTag>Sample practice</SampleTag>
      </div>
      <h3 className="mb-2 mt-3.5 text-[21px] font-bold text-brand-deep">
        {title}
      </h3>
      <p className="text-[15.5px] text-body">{body}</p>
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
