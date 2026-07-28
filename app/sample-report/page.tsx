import { Methodology } from "@/components/landing/methodology";
import { StatBand } from "@/components/landing/stat-band";
import { FinalCta } from "@/components/landing/final-cta";
import { LandingShell } from "@/components/landing/shell";

export const metadata = {
  title: "Sample Report | New Fee Schedule",
};

export default function SampleReportPage() {
  return (
    <LandingShell>
      <Methodology />
      <StatBand />
      <FinalCta />
    </LandingShell>
  );
}
