import { HowItWorksCards } from "@/components/landing/how-it-works-cards";
import { FinalCta } from "@/components/landing/final-cta";
import { LandingShell } from "@/components/landing/shell";

export const metadata = {
  title: "How It Works | New Fee Schedule",
};

export default function HowItWorksCardsPage() {
  return (
    <LandingShell>
      <HowItWorksCards />
      <FinalCta />
    </LandingShell>
  );
}
