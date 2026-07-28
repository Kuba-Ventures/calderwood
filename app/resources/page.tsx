import { Faq } from "@/components/landing/faq";
import { FinalCta } from "@/components/landing/final-cta";
import { LandingShell } from "@/components/landing/shell";

export const metadata = {
  title: "Resources | New Fee Schedule",
};

export default function ResourcesPage() {
  return (
    <LandingShell>
      <Faq />
      <FinalCta />
    </LandingShell>
  );
}
