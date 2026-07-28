import { HowItWorksExample } from "@/components/landing/how-it-works-example";
import { FinalCta } from "@/components/landing/final-cta";
import { LandingShell } from "@/components/landing/shell";

export const metadata = {
  title: "How It Works | New Fee Schedule",
};

export default function HowItWorksExamplePage() {
  return (
    <LandingShell>
      <HowItWorksExample />
      <FinalCta />
    </LandingShell>
  );
}
