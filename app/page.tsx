import { LandingNav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { ProofBar } from "@/components/landing/proof-bar";
import { Deliverable } from "@/components/landing/deliverable";
import { StatBand } from "@/components/landing/stat-band";
import { Methodology } from "@/components/landing/methodology";
import { HowItWorks } from "@/components/landing/how-it-works";
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
        <Deliverable />
        <StatBand />
        <Methodology />
        <HowItWorks />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
