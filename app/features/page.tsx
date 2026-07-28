import { Deliverable } from "@/components/landing/deliverable";
import { FinalCta } from "@/components/landing/final-cta";
import { LandingShell } from "@/components/landing/shell";

export const metadata = {
  title: "Features | New Fee Schedule",
};

export default function FeaturesPage() {
  return (
    <LandingShell>
      <Deliverable />
      <FinalCta />
    </LandingShell>
  );
}
