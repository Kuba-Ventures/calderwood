import { pageMetadata } from "@/lib/page-metadata";
import { Deliverable } from "@/components/landing/deliverable";
import { FinalCta } from "@/components/landing/final-cta";
import { LandingShell } from "@/components/landing/shell";

export const metadata = pageMetadata(
  "/features",
  "Features | New Fee Schedule",
  "Three answers in one PDF: what each carrier underpays you, code by code, how your fees compare to UCR in your zip code, and the dollars you can recover.",
);

export default function FeaturesPage() {
  return (
    <LandingShell>
      <Deliverable />
      <FinalCta />
    </LandingShell>
  );
}
