import { Reveal } from "@/components/motion/reveal";
import { Odometer } from "@/components/motion/odometer";
import { Arrow, Button, Glow, Pill, radialGlow } from "./ui";

/** Illustrative per-code fee assessment shown in the hero console card. */
const CODES = ["D2740", "D2392", "D2750", "D2950", "D3310"];

/** Carrier gaps for the active code (D2740), largest first. Bar width is
 *  relative to the top carrier so Cigna reads as the anchor. */
const CARRIERS = [
  { name: "Cigna", gap: "$32,180", pct: 100, top: true },
  { name: "Delta", gap: "$14,320", pct: 45 },
  { name: "United", gap: "$11,540", pct: 36 },
  { name: "Aetna", gap: "$9,870", pct: 31 },
  { name: "MetLife", gap: "$6,210", pct: 19 },
];

const CHIPS = [
  "Underpayments, code by code",
  "Carrier-by-carrier gaps",
  "Percentile scored",
];

export function Hero() {
  return (
    <header className="relative overflow-hidden pb-14 pt-[64px]">
      <Glow
        style={radialGlow("rgba(91,124,247,0.5)", 520, { top: -160, left: -120 })}
      />
      <Glow
        style={radialGlow("rgba(123,92,245,0.42)", 460, { top: -120, right: -100 })}
      />
      <Glow
        style={radialGlow("rgba(242,200,121,0.4)", 420, { top: 160, right: "10%" })}
      />

      <div className="relative z-[2] mx-auto grid max-w-wrap grid-cols-1 items-center gap-12 px-7 lg:grid-cols-[1fr_1.16fr] lg:gap-14">
        {/* ---- copy column ---- */}
        <Reveal className="text-left">
          <Pill>Live, code-by-code</Pill>
          <h1 className="mb-5 mt-[22px] font-display text-[clamp(36px,4.6vw,56px)] font-extrabold leading-[1.05] tracking-[-0.025em] text-heading">
            See what every carrier is{" "}
            <span className="text-gradient">underpaying you.</span>
          </h1>
          <p className="mb-3 max-w-[46ch] text-[18px] text-body">
            A code-by-code benchmark of your fee schedule against UCR data in
            your zip. Most independent practices are reimbursed{" "}
            <b className="font-bold text-heading">15–35% below</b> the 75th
            percentile — a gap of{" "}
            <b className="font-bold text-heading">
              $40k–$120k per provider, per year.
            </b>
          </p>
          <div className="mt-[26px] flex flex-col gap-[14px] sm:flex-row sm:flex-wrap">
            <Button href="/signup">
              Find what you&apos;re leaving on the table <Arrow />
            </Button>
            <Button href="/signup" variant="ghost">
              See a sample report
            </Button>
          </div>
          <p className="mt-3 font-data text-[13.5px] text-muted">
            See your opportunity in minutes. Pay $199 only to unlock.
          </p>

          <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-3">
            {CHIPS.map((c) => (
              <li
                key={c}
                className="flex items-center gap-2.5 text-[13.5px] text-muted"
              >
                <span className="grid h-7 w-7 place-items-center rounded-lg border border-line bg-[#EEF1FE] text-[13px] font-bold text-brand">
                  ✓
                </span>
                {c}
              </li>
            ))}
          </ul>
        </Reveal>

        {/* ---- console card column ---- */}
        <Reveal y={40} delay={90} className="relative">
          {/* gradient hairline border */}
          <div className="rounded-[20px] bg-[linear-gradient(120deg,rgba(30,47,209,0.4),rgba(123,92,245,0.25),rgba(242,200,121,0.4))] p-px shadow-lift">
            <div className="overflow-hidden rounded-[19px] bg-white">
              {/* window chrome */}
              <div className="flex items-center justify-between border-b border-line bg-[linear-gradient(180deg,#FBFCFF,#F5F7FF)] px-5 py-[13px]">
                <div className="flex items-center gap-2.5">
                  <span className="flex gap-1.5" aria-hidden="true">
                    <i className="h-2.5 w-2.5 rounded-full bg-[#F6C6BE]" />
                    <i className="h-2.5 w-2.5 rounded-full bg-[#F3DDAE]" />
                    <i className="h-2.5 w-2.5 rounded-full bg-[#BFD3C4]" />
                  </span>
                  <span className="font-display text-sm font-bold text-heading">
                    Fee Assessment
                  </span>
                </div>
                <span className="hidden font-data text-[11.5px] text-muted sm:inline">
                  Practice 4729 · ZIP 02446
                </span>
              </div>

              {/* per-code switcher */}
              <div className="flex items-center gap-1.5 overflow-x-auto border-b border-line px-4 py-[11px]">
                {CODES.map((code, i) => (
                  <span
                    key={code}
                    className={`flex-none rounded-lg px-3 py-1.5 font-data text-[12px] font-semibold ${
                      i === 0
                        ? "bg-grad-brand text-white shadow-[0_8px_18px_-10px_rgba(30,47,209,0.9)]"
                        : "border border-line bg-white text-muted"
                    }`}
                  >
                    {code}
                  </span>
                ))}
                <span className="ml-auto flex-none pl-2 font-data text-[11px] text-muted">
                  + 15 more codes
                </span>
              </div>

              {/* KPI tiles */}
              <div className="grid grid-cols-2 gap-2.5 p-4 sm:grid-cols-4">
                <Kpi label="Your avg reimbursement" value="$605" />
                <Kpi label="75th-pct benchmark" value="$1,125" />
                <Kpi label="Gap per procedure" value="+$520" gold />
                <Kpi
                  label="Annual (vol 142)"
                  gold
                  valueNode={
                    <Odometer
                      value={73840}
                      prefix="$"
                      className="mt-1.5 font-data text-[22px] font-semibold tracking-[-0.02em] text-gold-deep"
                    />
                  }
                />
              </div>

              {/* chart + carrier breakdown */}
              <div className="grid grid-cols-1 gap-5 px-4 pb-4 sm:grid-cols-[1.2fr_1fr]">
                <div>
                  <div className="mb-2.5 flex items-center justify-between">
                    <span className="text-[12px] font-bold text-heading">
                      Reimbursement vs benchmark
                    </span>
                    <span className="flex gap-3 font-data text-[10px] font-semibold text-muted">
                      <span className="flex items-center gap-1.5">
                        <i className="block w-3.5 border-t-2 border-brand" />
                        You
                      </span>
                      <span className="flex items-center gap-1.5">
                        <i className="block w-3.5 border-t-2 border-dashed border-violet" />
                        75th pct
                      </span>
                    </span>
                  </div>
                  <ComparisonChart />
                </div>

                <div>
                  <div className="mb-2.5 text-[12px] font-bold text-heading">
                    Gap by carrier · D2740
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {CARRIERS.map((c) => (
                      <div
                        key={c.name}
                        className="grid grid-cols-[58px_1fr_58px] items-center gap-2.5 font-data text-[11.5px]"
                      >
                        <span className="font-semibold text-heading">
                          {c.name}
                        </span>
                        <span className="h-2 overflow-hidden rounded-full bg-[#EEF0F8]">
                          <i
                            className={`block h-full rounded-full ${
                              c.top
                                ? "bg-[linear-gradient(90deg,#E0A93A,#B57C15)]"
                                : "bg-[linear-gradient(90deg,#5B7CF7,#1E2FD1)]"
                            }`}
                            style={{ width: `${c.pct}%` }}
                          />
                        </span>
                        <span className="text-right font-semibold text-gold-deep">
                          {c.gap}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-line bg-[#FBFCFF] px-4 py-3 font-data text-[10.5px] text-muted">
                <span>Built from a national UCR benchmark database</span>
                <span>14 of 20 codes below 75th pct</span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </header>
  );
}

function Kpi({
  label,
  value,
  valueNode,
  gold = false,
}: {
  label: string;
  value?: string;
  valueNode?: React.ReactNode;
  gold?: boolean;
}) {
  return (
    <div
      className={`rounded-[14px] px-[13px] py-3 ${
        gold
          ? "border border-[#F1DFB4] bg-[linear-gradient(160deg,#FFF9EC,#FFFDF7)]"
          : "border border-line bg-[linear-gradient(180deg,#fff,#FAFBFF)]"
      }`}
    >
      <div className="min-h-[26px] text-[10.5px] font-semibold leading-[1.25] text-muted">
        {label}
      </div>
      {valueNode ?? (
        <div
          className={`mt-1.5 font-data text-[22px] font-semibold tracking-[-0.02em] ${
            gold ? "text-gold-deep" : "text-heading"
          }`}
        >
          {value}
        </div>
      )}
    </div>
  );
}

/** Static SVG: your reimbursement line under the 75th-pct benchmark, with the
 *  gold "opportunity" band shaded between them and D2740 highlighted. */
function ComparisonChart() {
  return (
    <svg
      viewBox="0 0 320 150"
      width="100%"
      role="img"
      aria-label="Your reimbursement runs below the 75th-percentile benchmark across your five most-billed codes"
    >
      <rect x="78" y="12" width="39" height="112" rx="4" fill="#F2C879" opacity="0.18" />
      <g stroke="#E7EAF6" strokeWidth="1">
        <line x1="20" y1="32" x2="310" y2="32" />
        <line x1="20" y1="60" x2="310" y2="60" />
        <line x1="20" y1="88" x2="310" y2="88" />
        <line x1="20" y1="116" x2="310" y2="116" />
      </g>
      <polygon
        points="30,88 97.5,76 165,82 232.5,79 300,69 300,32 232.5,48 165,43 97.5,38 30,63"
        fill="#F2C879"
        opacity="0.22"
      />
      <polyline
        points="30,63 97.5,38 165,43 232.5,48 300,32"
        fill="none"
        stroke="#7B5CF5"
        strokeWidth="2.2"
        strokeDasharray="5 4"
        strokeLinecap="round"
      />
      <polyline
        points="30,88 97.5,76 165,82 232.5,79 300,69"
        fill="none"
        stroke="#1E2FD1"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g fill="#1E2FD1">
        <circle cx="30" cy="88" r="3" />
        <circle cx="97.5" cy="76" r="4" stroke="#fff" strokeWidth="2" />
        <circle cx="165" cy="82" r="3" />
        <circle cx="232.5" cy="79" r="3" />
        <circle cx="300" cy="69" r="3" />
      </g>
      <g fill="#6B7398" fontSize="9" textAnchor="middle" className="font-data">
        <text x="30" y="140">D2140</text>
        <text x="97.5" y="140">D2740</text>
        <text x="165" y="140">D2750</text>
        <text x="232.5" y="140">D2950</text>
        <text x="300" y="140">D3310</text>
      </g>
    </svg>
  );
}
