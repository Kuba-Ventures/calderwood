import { pageMetadata } from "@/lib/page-metadata";
import { HowItWorksHybrid } from "@/components/landing/how-it-works-hybrid";
import { FinalCta } from "@/components/landing/final-cta";
import { LandingShell } from "@/components/landing/shell";

export const metadata = pageMetadata(
  "/how-it-works",
  "How It Works | New Fee Schedule",
  "Upload your fee schedule and carrier EOBs, we benchmark every CDT code against your zip code, and you get a report showing what each carrier underpays you.",
);

export default function HowItWorksPage() {
  return (
    <LandingShell>
      <HowItWorksHybrid />
      <FinalCta />
    </LandingShell>
  );
}
