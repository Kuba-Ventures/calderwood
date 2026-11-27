import { pageMetadata } from "@/lib/page-metadata";
import { Methodology } from "@/components/landing/methodology";
import { StatBand } from "@/components/landing/stat-band";
import { FinalCta } from "@/components/landing/final-cta";
import { LandingShell } from "@/components/landing/shell";

export const metadata = pageMetadata(
  "/sample-report",
  "Sample Report | New Fee Schedule",
  "See an example report: carrier-by-carrier underpayment, every CDT code against local UCR percentiles, and the math behind each dollar figure.",
);

export default function SampleReportPage() {
  return (
    <LandingShell>
      <Methodology />
      <StatBand />
      <FinalCta />
    </LandingShell>
  );
}
