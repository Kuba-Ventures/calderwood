import React from "react";
// Top-level React-PDF Document. Composes the cover, sections, methodology,
// and appendix. Driven entirely by ComputationOutput so the same renderer
// works for any practice. Footer disclosure of underpaymentBasis is
// required per Phase 6 spec.

import { Document, Page, Text, View } from "@react-pdf/renderer";
import type { ComputationOutput } from "@/lib/types/pipeline";
import { COLORS, fmtUsd, styles } from "./styles";
import { Cover } from "./cover";
import { PercentileSection } from "./percentile-section";
import { Top10Section } from "./top10-section";
import { CarrierSection } from "./carrier-section";
import { CategorySection } from "./category-section";
import { MethodologySection } from "./methodology-section";
import { AppendixSection } from "./appendix-section";

export type ReportMeta = {
  practiceName: string;
  zip5: string;
  providerCount: string; // "1" | "2-5" | "6+"
  generatedAt: Date;
};

export function ReportDoc({
  data,
  meta,
}: {
  data: ComputationOutput;
  meta: ReportMeta;
}) {
  const basis = data.executiveSummary.underpaymentBasis;
  const basisLine =
    basis === "carrier"
      ? "Headline based on contracted-rate gap to UCR p75."
      : "Headline based on master fee gap to UCR p75 (no carrier schedules parsed).";

  return (
    <Document
      title={`${meta.practiceName} -- Calderwood Fee Assessment`}
      author="Calderwood"
    >
      <Page size="LETTER" style={styles.page}>
        <BrandHeader />
        <Cover data={data} meta={meta} />
        <Footer basisLine={basisLine} />
      </Page>

      <Page size="LETTER" style={styles.page}>
        <BrandHeader />
        <PercentileSection data={data} />
        <Footer basisLine={basisLine} />
      </Page>

      <Page size="LETTER" style={styles.page}>
        <BrandHeader />
        <Top10Section data={data} />
        <Footer basisLine={basisLine} />
      </Page>

      {basis === "carrier" && data.recoverableByCarrier.length > 0 && (
        <Page size="LETTER" style={styles.page}>
          <BrandHeader />
          <CarrierSection data={data} />
          <Footer basisLine={basisLine} />
        </Page>
      )}

      <Page size="LETTER" style={styles.page}>
        <BrandHeader />
        <CategorySection data={data} />
        <Footer basisLine={basisLine} />
      </Page>

      <Page size="LETTER" style={styles.page}>
        <BrandHeader />
        <MethodologySection data={data} basis={basis} />
        <Footer basisLine={basisLine} />
      </Page>

      <Page size="LETTER" style={styles.page} wrap>
        <BrandHeader />
        <AppendixSection data={data} />
        <Footer basisLine={basisLine} />
      </Page>
    </Document>
  );
}

function BrandHeader() {
  return (
    <View style={styles.brandHeader} fixed>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View
          style={{
            width: 8,
            height: 8,
            backgroundColor: COLORS.accent,
            marginRight: 6,
          }}
        />
        <Text style={styles.brandName}>Calderwood</Text>
      </View>
      <Text style={styles.brandRight}>Fee Assessment</Text>
    </View>
  );
}

function Footer({ basisLine }: { basisLine: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text>{basisLine}</Text>
      <Text
        render={({ pageNumber, totalPages }) =>
          `calderwoodtech.com  ·  page ${pageNumber} of ${totalPages}`
        }
      />
    </View>
  );
}

// Re-export the helpers for sibling files.
export { fmtUsd };
