import { pageMetadata } from "@/lib/page-metadata";
import { PricingCompare } from "@/components/landing/pricing-compare";
import { FinalCta } from "@/components/landing/final-cta";
import { LandingShell } from "@/components/landing/shell";

export const metadata = pageMetadata(
  "/pricing",
  "Pricing | New Fee Schedule",
  "One flat price of $199 for a code-by-code dental fee benchmark. No subscription, no sales call. See what every carrier is underpaying you.",
);

export default function PricingPage() {
  return (
    <LandingShell>
      <PricingCompare />
      <FinalCta />
    </LandingShell>
  );
}
