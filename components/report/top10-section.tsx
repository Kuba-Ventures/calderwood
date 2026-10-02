import React from "react";
// Section 2: Top 10 codes by annual recoverable impact.

import { Text, View } from "@react-pdf/renderer";
import type { ComputationOutput } from "@/lib/types/pipeline";
import { top10Rows } from "@/lib/report/pdf-columns";
import { COLORS, fmtUsd, styles } from "./styles";

export function Top10Section({ data }: { data: ComputationOutput }) {
  const rows = top10Rows(data);
  const top10Total = rows.reduce((s, r) => s + r.annual, 0);
  const headline = data.executiveSummary.totalAnnualUnderpayment;

  return (
    <View>
      <Text style={styles.sectionLabel}>Section 2 · Top 10 by impact</Text>
      <Text style={styles.h2}>
        The codes where the gap costs you the most.
      </Text>
      <Text style={[styles.bodyMuted, { marginTop: 6 }]}>
        Sorted by annual gap: UCR p75 minus your fee, times annual volume (the
        same figure as the code-by-code table). Together these 10 codes are{" "}
        {fmtUsd(top10Total, { round: true })} of your{" "}
        {fmtUsd(headline, { round: true })} annual underpayment. Start your fee
        review with them.
      </Text>

      <View style={[styles.tableHeader, { marginTop: 16 }]}>
        <View style={{ width: 44 }}><Text style={styles.tableHeadCell}>Code</Text></View>
        <View style={{ flex: 2 }}><Text style={styles.tableHeadCell}>Procedure</Text></View>
        <View style={{ width: 56 }}><Text style={[styles.tableHeadCell, { textAlign: "right" }]}>Fee</Text></View>
        <View style={{ width: 56 }}><Text style={[styles.tableHeadCell, { textAlign: "right" }]}>P75</Text></View>
        <View style={{ width: 56 }}><Text style={[styles.tableHeadCell, { textAlign: "right" }]}>Gap</Text></View>
        <View style={{ width: 44 }}><Text style={[styles.tableHeadCell, { textAlign: "right" }]}>Vol/yr</Text></View>
        <View style={{ width: 72 }}><Text style={[styles.tableHeadCell, { textAlign: "right" }]}>Annual</Text></View>
      </View>

      {rows.map(({ row: r, gap, annual: impact }) => {
        return (
          <View key={r.code} style={styles.tableRow}>
            <View style={{ width: 44 }}><Text style={[styles.tableCell, { fontFamily: "Helvetica-Bold", fontSize: 8 }]}>{r.code}</Text></View>
            <View style={{ flex: 2 }}><Text style={styles.tableCell}>{r.description}</Text></View>
            <View style={{ width: 56 }}><Text style={styles.tableCellRight}>{fmtUsd(r.practiceFee)}</Text></View>
            <View style={{ width: 56 }}><Text style={styles.tableCellRight}>{r.p75 !== null ? fmtUsd(r.p75) : "--"}</Text></View>
            <View style={{ width: 56 }}><Text style={[styles.tableCellRight, { color: COLORS.red, fontFamily: "Helvetica-Bold" }]}>{fmtUsd(gap)}</Text></View>
            <View style={{ width: 44 }}><Text style={styles.tableCellRight}>{r.annualFrequency.toLocaleString()}</Text></View>
            <View style={{ width: 72 }}><Text style={[styles.tableCellRight, { color: COLORS.accentInk, fontFamily: "Times-Roman", fontSize: 10 }]}>{fmtUsd(impact, { round: true })}</Text></View>
          </View>
        );
      })}
    </View>
  );
}
