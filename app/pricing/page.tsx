import { PricingCompare } from "@/components/landing/pricing-compare";
import { FinalCta } from "@/components/landing/final-cta";
import { LandingShell } from "@/components/landing/shell";

export const metadata = {
  title: "Pricing | New Fee Schedule",
};

export default function PricingPage() {
  return (
    <LandingShell>
      <PricingCompare />
      <FinalCta />
    </LandingShell>
  );
}
