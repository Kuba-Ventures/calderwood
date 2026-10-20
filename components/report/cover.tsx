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

      {s.volumeBasis === "none" ? (
        <PricesOnlySummary data={data} zip5={meta.zip5} />
      ) : (
        <CountsSummary data={data} zip5={meta.zip5} />
      )}
    </View>
  );
}

// Gap as shown: rounded p75 minus rounded fee, so the row's arithmetic is
// exact on the page ("$107 vs $141" next to "+$34").
const shownGap = (r: { practiceFee: number; p75: number }) =>
  Math.round(r.p75) - Math.round(r.practiceFee);

// Prices-only upload (no procedure counts): no yearly dollars, so the cover
// leads with what the practice collects less each time it does an everyday
// procedure.
function PricesOnlySummary({ data, zip5 }: { data: ComputationOutput; zip5: string }) {
  const p = data.executiveSummary.perProcedure;
  const headline = p?.headline ?? null;
  return (
    <View>
      <View
        style={{
          marginTop: 14,
          borderWidth: 1,
          borderColor: COLORS.amber,
          backgroundColor: "#fffbeb",
          padding: 8,
          borderRadius: 3,
        }}
      >
        <Text style={{ fontSize: 9.5, color: COLORS.ink900 }}>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>Prices only. </Text>
          Your file had no procedure counts, so this report compares each fee to
          your area but does not total yearly dollars.
        </Text>
      </View>

      <Text style={styles.sectionLabel}>Executive summary</Text>
      {headline ? (
        <View style={{ marginTop: 10 }}>
          <Text style={[styles.numberHero, { fontSize: 26 }]}>
            {fmtUsd(shownGap(headline))} less per {headline.name.toLowerCase()}
          </Text>
          <Text style={[styles.bodyMuted, { marginTop: 4 }]}>
            Than the local 75th percentile ({fmtUsd(headline.practiceFee, { round: true })} vs{" "}
            {fmtUsd(headline.p75, { round: true })}).{" "}
            {p && p.codesBenchmarked > 0
              ? `${p.codesBelowP75} of the ${p.codesBenchmarked} codes we could benchmark are below it.`
              : ""}
          </Text>
        </View>
      ) : (
        <Text style={[styles.h2, { marginTop: 10 }]}>
          Your fees are at or above the local 75th percentile.
        </Text>
      )}

      {p && p.everyday.length > 0 && (
        <View style={{ marginTop: 16 }}>
          <View style={styles.tableHeader}>
            <View style={{ flex: 2 }}><Text style={styles.tableHeadCell}>Everyday procedure</Text></View>
            <View style={{ width: 70 }}><Text style={[styles.tableHeadCell, { textAlign: "right" }]}>You</Text></View>
            <View style={{ width: 70 }}><Text style={[styles.tableHeadCell, { textAlign: "right" }]}>75th pct</Text></View>
            <View style={{ width: 80 }}><Text style={[styles.tableHeadCell, { textAlign: "right" }]}>Each time</Text></View>
          </View>
          {p.everyday.map((r) => (
            <View key={r.code} style={styles.tableRow}>
              <View style={{ flex: 2 }}>
                <Text style={styles.tableCell}>
                  {r.name}  <Text style={{ color: COLORS.ink400, fontSize: 7.5 }}>{r.code}</Text>
                </Text>
              </View>
              <View style={{ width: 70 }}><Text style={styles.tableCellRight}>{fmtUsd(r.practiceFee, { round: true })}</Text></View>
              <View style={{ width: 70 }}><Text style={styles.tableCellRight}>{fmtUsd(r.p75, { round: true })}</Text></View>
              <View style={{ width: 80 }}>
                <Text style={[styles.tableCellRight, { fontFamily: "Helvetica-Bold", color: COLORS.ink900 }]}>
                  +{fmtUsd(shownGap(r))}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.callout}>
        <Text style={[styles.body, { color: COLORS.ink900 }]}>
          See it in yearly dollars.
        </Text>
        <Text style={[styles.bodyMuted, { marginTop: 6 }]}>
          Add a production report (like a Procedure Summary) or a Quantity column
          with how many times you did each code last year, and we total what these
          gaps cost you each year in {zip5}.
        </Text>
      </View>
    </View>
  );
}

function CountsSummary({ data, zip5 }: { data: ComputationOutput; zip5: string }) {
  const s = data.executiveSummary;
  return (
    <View>
      <Text style={styles.sectionLabel}>Executive summary</Text>

      <View style={styles.summaryGrid}>
        <SummaryCard
          label="Annual underpayment"
          value={fmtUsd(s.totalAnnualUnderpayment, { round: true })}
          sub={`Your own fees vs the local 75th percentile, across your ${s.codesBelowP75InTop20.total} most-billed CDT codes`}
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
          label="Insurer payment gap"
          value={
            s.underpaymentBasis === "carrier" && s.carrierAnnualUnderpayment != null
              ? fmtUsd(s.carrierAnnualUnderpayment, { round: true })
              : "Not available"
          }
          sub={
            s.underpaymentBasis === "carrier"
              ? "What your insurers' contracted rates fall short of the local 75th percentile. A separate measure from the headline; don't add the two."
              : "Carrier upload required to compare contracted rates."
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
          {zip5}. Codes paid above the 75th percentile are doing well.
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
