import { LandingNav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { ProofBar } from "@/components/landing/proof-bar";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Deliverable } from "@/components/landing/deliverable";
import { Methodology } from "@/components/landing/methodology";
import { StatBand } from "@/components/landing/stat-band";
import { Pricing } from "@/components/landing/pricing";
import { Faq } from "@/components/landing/faq";
import { FinalCta } from "@/components/landing/final-cta";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  return (
    <div className="bg-paper font-sans text-body">
      <LandingNav />
      <main>
        <Hero />
        <ProofBar />
        <HowItWorks />
        <Deliverable />
        <Methodology />
        <StatBand />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
