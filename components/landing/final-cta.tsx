import { Reveal } from "@/components/motion/reveal";
import { Arrow, Button, Glow, radialGlow } from "./ui";

export function FinalCta() {
  return (
    <section className="px-7 pb-[110px] pt-10">
      <div className="mx-auto max-w-wrap">
        <Reveal
          y={40}
          className="bg-grad-brand relative overflow-hidden rounded-[28px] px-8 py-[66px] text-center text-white shadow-[0_50px_100px_-40px_rgba(30,47,209,0.7)]"
        >
          <Glow
            style={radialGlow("rgba(242,200,121,0.5)", 420, {
              top: -160,
              right: -80,
            })}
          />
          <Glow
            style={radialGlow("rgba(123,92,245,0.6)", 380, {
              bottom: -160,
              left: -60,
            })}
          />
          <h2 className="relative z-[1] font-display text-[clamp(30px,4.4vw,50px)] font-extrabold text-white">
            Find out in minutes.
          </h2>
          <p className="relative z-[1] mt-3.5 text-[17px] text-[#DCE2FF]">
            See the gap in your fee schedule before you pay a cent.
          </p>
          <div className="relative z-[1] mt-[30px]">
            <Button href="/signup" variant="white">
              Get started for $199 <Arrow />
            </Button>
          </div>
          <p className="relative z-[1] mt-4 font-data text-[13px] text-[#B8C1F0]">
            See your opportunity in minutes. Pay $199 only to unlock.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
