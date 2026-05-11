import { Hero } from "@/components/landing/hero";
import { ProofBar } from "@/components/landing/proof-bar";
import { Deliverable } from "@/components/landing/deliverable";
import { Methodology } from "@/components/landing/methodology";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Faq } from "@/components/landing/faq";
import { FinalCta } from "@/components/landing/final-cta";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  return (
    <main>
      <Hero />
      <ProofBar />
      <Deliverable />
      <Methodology />
      <HowItWorks />
      <Faq />
      <FinalCta />
      <Footer />
    </main>
  );
}
