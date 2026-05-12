import React from "react";
import { Text, View } from "@react-pdf/renderer";
import type { ComputationOutput } from "@/lib/types/pipeline";
import type { ReportMeta } from "./report-doc";
import { COLORS, fmtUsd, styles } from "./styles";

export function Cover({
  data,
  meta,
}: {
  data: ComputationOutput;
  meta: ReportMeta;
}) {
  const s = data.executiveSummary;
  const providerLabel = providerCountLabel(meta.providerCount);
  const generatedLabel = meta.generatedAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <View>
      <Text style={styles.meta}>
        {meta.practiceName}  ·  ZIP {meta.zip5}  ·  {providerLabel}
        {"\n"}Generated {generatedLabel}
      </Text>

      <Text style={styles.sectionLabel}>Executive summary</Text>

      <View style={styles.summaryGrid}>
        <SummaryCard
          label="Annual underpayment"
          value={fmtUsd(s.totalAnnualUnderpayment, { round: true })}
          sub={`Across ${s.codesBelowP75InTop20.total} most-billed CDT codes`}
        />
        <SummaryCard
          label={`Codes below ${ordinal(75)} percentile`}
          value={`${s.codesBelowP75InTop20.count} of ${s.codesBelowP75InTop20.total}`}
          sub={
            s.codesBelowP75InTop20.total > 0
              ? `${Math.round(
                  (100 * s.codesBelowP75InTop20.count) / s.codesBelowP75InTop20.total
                )}% of high-volume codes`
              : "--"
          }
        />
        <SummaryCard
          label={
            s.topCarrier ? "Top carrier opportunity" : "Carrier breakdown"
          }
          value={
            s.topCarrier
              ? fmtUsd(s.topCarrier.recoverable, { round: true })
              : "Not available"
          }
          sub={
            s.topCarrier
              ? `${s.topCarrier.name}  ·  largest single-carrier gap`
              : "Carrier upload required to compute per-carrier opportunity."
          }
        />
        <SummaryCard
          label="Underpayment basis"
          value={s.underpaymentBasis === "carrier" ? "Contracted rates" : "Master fees"}
          sub={
            s.underpaymentBasis === "carrier"
              ? "Per-carrier schedules compared to UCR p75."
              : "Master fee schedule compared to UCR p75."
          }
        />
      </View>

      <View style={styles.callout}>
        <Text style={[styles.body, { color: COLORS.ink900 }]}>
          What this report tells you.
        </Text>
        <Text style={[styles.bodyMuted, { marginTop: 6 }]}>
          For every code on your fee schedule, we compare what you charge (and
          what your carriers pay) against the UCR distribution for{" "}
          {meta.zip5}. Codes paid above the 75th percentile are doing well.
          Codes below are leaving revenue on the table. The next sections rank
          where to focus your renegotiation effort.
        </Text>
      </View>
    </View>
  );
}

function SummaryCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryCardLabel}>{label}</Text>
      <Text style={styles.numberHero}>{value}</Text>
      <Text style={styles.summaryCardSub}>{sub}</Text>
    </View>
  );
}

function providerCountLabel(bucket: string): string {
  if (bucket === "1") return "1 provider";
  if (bucket === "2-5") return "2 to 5 providers";
  if (bucket === "6+") return "6 or more providers";
  return bucket;
}

function ordinal(n: number): string {
  const j = n % 10;
  const k = n % 100;
  const suffix =
    j === 1 && k !== 11 ? "st"
    : j === 2 && k !== 12 ? "nd"
    : j === 3 && k !== 13 ? "rd"
    : "th";
  return `${n}${suffix}`;
}
