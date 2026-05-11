import { Hero } from "@/components/landing/hero";
import { AudienceStrip } from "@/components/landing/audience-strip";
import { Deliverable } from "@/components/landing/deliverable";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Pricing } from "@/components/landing/pricing";
import { Faq } from "@/components/landing/faq";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  return (
    <main>
      <Hero />
      <AudienceStrip />
      <Deliverable />
      <HowItWorks />
      <Pricing />
      <Faq />
      <Footer />
    </main>
  );
}
