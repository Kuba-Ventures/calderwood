import { Reveal } from "@/components/motion/reveal";
import { Arrow, Button } from "./ui";

export function FinalCta() {
  return (
    <section className="px-7 pb-[90px] pt-6">
      <div className="mx-auto max-w-wrap">
        <Reveal
          y={40}
          className="relative overflow-hidden rounded-[24px] bg-brand-deep px-8 py-16 text-center text-white shadow-[0_50px_100px_-46px_rgba(49,46,129,0.8)]"
        >
          <h2 className="font-serif text-[clamp(30px,4.4vw,44px)] font-semibold [text-wrap:balance]">
            See what every carrier is underpaying you.
          </h2>
          <p className="mt-3.5 text-[17px] text-[#C9C6F5]">
            $199 flat. Your report in minutes. No sales call.
          </p>
          <div className="mt-7">
            <Button href="/signup" variant="white">
              Get Started <Arrow />
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
