import React from "react";
// Section 2: Top 10 codes by annual recoverable impact.

import { Text, View } from "@react-pdf/renderer";
import type { ComputationOutput } from "@/lib/types/pipeline";
import { COLORS, fmtUsd, styles } from "./styles";

export function Top10Section({ data }: { data: ComputationOutput }) {
  const basis = data.executiveSummary.underpaymentBasis;
  const rows = data.top10ByImpact;

  return (
    <View>
      <Text style={styles.sectionLabel}>Section 2 · Top 10 by impact</Text>
      <Text style={styles.h2}>
        The codes where the gap costs you the most.
      </Text>
      <Text style={[styles.bodyMuted, { marginTop: 6 }]}>
        Sorted by annual recoverable revenue ({basis === "carrier" ? "worst-paying carrier per code" : "gap to UCR p75"} × annual frequency).
        These are the codes worth opening a renegotiation conversation about.
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

      {rows.map((r) => {
        const impact = basis === "carrier"
          ? Math.max(0, ...Object.values(r.annualRecoverableByCarrier))
          : r.annualRecoverableMarket;
        const gap = basis === "carrier"
          ? Math.max(0, ...Object.values(r.carrierGaps))
          : r.marketGap;
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
