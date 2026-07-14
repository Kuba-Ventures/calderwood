import { Reveal } from "@/components/motion/reveal";
import { Odometer } from "@/components/motion/odometer";
import { GapBar } from "./gap-bar";
import { Arrow, Button, Glow, Pill, radialGlow } from "./ui";

export function Hero() {
  return (
    <header className="relative overflow-hidden pb-10 pt-[70px] text-center">
      <Glow
        style={radialGlow("rgba(91,124,247,0.5)", 520, {
          top: -160,
          left: -120,
        })}
      />
      <Glow
        style={radialGlow("rgba(123,92,245,0.42)", 460, {
          top: -120,
          right: -100,
        })}
      />
      <Glow
        style={radialGlow("rgba(242,200,121,0.4)", 420, {
          top: 120,
          right: "16%",
        })}
      />

      <div className="relative z-[2] mx-auto max-w-[820px] px-7">
        <Reveal>
          <Pill>For independent practices &amp; small DSOs</Pill>
          <h1 className="mx-auto mb-5 mt-[22px] font-display text-[clamp(40px,6vw,68px)] font-extrabold leading-[1.08] tracking-[-0.02em] text-heading">
            How much is each carrier
            <br />
            <span className="text-gradient">underpaying you?</span>
          </h1>
          <p className="mx-auto mb-3 max-w-[60ch] text-[19px] text-body">
            A code-by-code benchmark of your fee schedule against UCR data in
            your zip code, in minutes.
          </p>
          <p className="mx-auto mb-3 max-w-[60ch] text-[19px] text-body">
            Most independent practices are reimbursed{" "}
            <b className="font-bold text-heading">15–35% below</b> the 75th
            percentile in their metro. The gap typically runs{" "}
            <b className="font-bold text-heading">
              $40k–$120k per provider, per year.
            </b>
          </p>
          <div className="mt-[30px] flex flex-col justify-center gap-[14px] sm:flex-row sm:flex-wrap">
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
        </Reveal>
      </div>

      {/* floating product card */}
      <Reveal
        y={40}
        className="relative z-[2] mx-auto mt-[52px] max-w-[940px] px-7"
      >
        <div className="relative">
          <div className="absolute left-[-26px] top-16 z-[3] hidden items-center gap-[7px] rounded-xl border border-line bg-white px-3 py-2 font-data text-xs font-medium shadow-soft lg:flex">
            <span className="bg-grad-brand h-2 w-2 rounded-[3px]" />
            Percentile scored
          </div>
          <div className="absolute bottom-[70px] right-[-30px] z-[3] hidden items-center gap-[7px] rounded-xl border border-line bg-white px-3 py-2 font-data text-xs font-medium shadow-soft lg:flex">
            <span className="font-semibold text-[#1E9E6A]">▲</span> Cigna gap ·
            $32,180
          </div>

          {/* gradient hairline border */}
          <div className="rounded-[20px] bg-[linear-gradient(120deg,rgba(30,47,209,0.4),rgba(123,92,245,0.25),rgba(242,200,121,0.4))] p-px shadow-lift">
            <div className="overflow-hidden rounded-[19px] bg-white">
              <div className="flex items-center justify-between border-b border-line bg-[linear-gradient(180deg,#FBFCFF,#F5F7FF)] px-5 py-[14px]">
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
                  Practice 4729 · ZIP 02446 · 2 providers · 11 May 2026
                </span>
              </div>

              <div className="p-[26px] text-left">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.3fr_1fr_1fr]">
                  <div className="rounded-[14px] border border-[#F1DFB4] bg-[linear-gradient(160deg,#FFF9EC,#FFFDF7)] px-[18px] py-4">
                    <div className="text-xs font-semibold text-muted">
                      Annual underpayment
                    </div>
                    <Odometer
                      value={87420}
                      prefix="$"
                      className="mt-1.5 font-data text-[clamp(26px,3.6vw,34px)] font-semibold tracking-[-0.02em] text-gold-deep"
                    />
                    <div className="mt-[5px] font-data text-[11px] text-muted">
                      across 20 most-billed CDT codes
                    </div>
                  </div>
                  <div className="rounded-[14px] border border-line bg-[linear-gradient(180deg,#fff,#FAFBFF)] px-[18px] py-4">
                    <div className="text-xs font-semibold text-muted">
                      Codes below 75th pct
                    </div>
                    <div className="mt-1.5 font-data text-[clamp(26px,3.6vw,34px)] font-semibold leading-[1.1] tracking-[-0.02em] text-heading">
                      14<span className="text-[20px] text-muted">/20</span>
                    </div>
                    <div className="mt-[5px] font-data text-[11px] text-muted">
                      71% of high-volume codes
                    </div>
                  </div>
                  <div className="rounded-[14px] border border-line bg-[linear-gradient(180deg,#fff,#FAFBFF)] px-[18px] py-4">
                    <div className="text-xs font-semibold text-muted">
                      Top carrier opportunity
                    </div>
                    <div className="mt-1.5 font-data text-[clamp(26px,3.6vw,34px)] font-semibold leading-[1.1] tracking-[-0.02em] text-heading">
                      $32,180
                    </div>
                    <div className="mt-[5px] font-data text-[11px] text-muted">
                      Cigna · largest single gap
                    </div>
                  </div>
                </div>

                <GapBar collectPct={74} gapLabel="◂ $87,420 recoverable gap" />
              </div>

              <div className="flex items-center justify-between border-t border-line bg-[#FBFCFF] px-[26px] py-3 font-data text-[10.5px] text-muted">
                <span>Built from a national UCR benchmark database</span>
                <span>page 1 of 14</span>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </header>
  );
}
