import { HowItWorksHybrid } from "@/components/landing/how-it-works-hybrid";
import { FinalCta } from "@/components/landing/final-cta";
import { LandingShell } from "@/components/landing/shell";

export const metadata = {
  title: "How It Works | New Fee Schedule",
};

export default function HowItWorksPage() {
  return (
    <LandingShell>
      <HowItWorksHybrid />
      <FinalCta />
    </LandingShell>
  );
}
