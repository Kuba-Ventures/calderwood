import { pageMetadata } from "@/lib/page-metadata";
import { Faq } from "@/components/landing/faq";
import { FinalCta } from "@/components/landing/final-cta";
import { LandingShell } from "@/components/landing/shell";

export const metadata = pageMetadata(
  "/resources",
  "Resources | New Fee Schedule",
  "Answers to common questions from dental practice owners and office managers about fee schedules, UCR benchmarks, carrier payments and our report.",
);

export default function ResourcesPage() {
  return (
    <LandingShell>
      <Faq />
      <FinalCta />
    </LandingShell>
  );
}
