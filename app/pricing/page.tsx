import { Pricing } from "@/components/landing/pricing";
import { Faq } from "@/components/landing/faq";
import { FinalCta } from "@/components/landing/final-cta";
import { LandingShell } from "@/components/landing/shell";

export const metadata = {
  title: "Pricing | New Fee Schedule",
};

export default function PricingPage() {
  return (
    <LandingShell>
      <Pricing />
      <Faq />
      <FinalCta />
    </LandingShell>
  );
}
