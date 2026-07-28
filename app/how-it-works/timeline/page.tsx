import { HowItWorksTimeline } from "@/components/landing/how-it-works-timeline";
import { FinalCta } from "@/components/landing/final-cta";
import { LandingShell } from "@/components/landing/shell";

export const metadata = {
  title: "How It Works | New Fee Schedule",
};

export default function HowItWorksTimelinePage() {
  return (
    <LandingShell>
      <HowItWorksTimeline />
      <FinalCta />
    </LandingShell>
  );
}
