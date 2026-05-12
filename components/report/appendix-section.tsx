import React from "react";
// Appendix: full code-by-code table with confidence flags visible.

import { Text, View } from "@react-pdf/renderer";
import type { ComputationOutput } from "@/lib/types/pipeline";
import { COLORS, fmtUsd, pillStyle, styles } from "./styles";

export function AppendixSection({ data }: { data: ComputationOutput }) {
  const rows = [...data.codeRows].sort((a, b) => a.code.localeCompare(b.code));

  return (
    <View>
      <Text style={styles.sectionLabel}>Appendix · Code-by-code</Text>
      <Text style={styles.h2}>Every code on your master schedule.</Text>
      <Text style={[styles.bodyMuted, { marginTop: 6 }]}>
        Confidence reflects the geo level used for the benchmark. High
        confidence = ZIP3 or metro. Medium = state. Low = region or national.
        No-data codes are flagged and excluded from dollar totals.
      </Text>

      <View style={[styles.tableHeader, { marginTop: 14 }]}>
        <View style={{ width: 44 }}><Text style={styles.tableHeadCell}>Code</Text></View>
        <View style={{ flex: 2 }}><Text style={styles.tableHeadCell}>Procedure</Text></View>
        <View style={{ width: 50 }}><Text style={[styles.tableHeadCell, { textAlign: "right" }]}>Fee</Text></View>
        <View style={{ width: 50 }}><Text style={[styles.tableHeadCell, { textAlign: "right" }]}>P50</Text></View>
        <View style={{ width: 50 }}><Text style={[styles.tableHeadCell, { textAlign: "right" }]}>P75</Text></View>
        <View style={{ width: 50 }}><Text style={[styles.tableHeadCell, { textAlign: "right" }]}>P90</Text></View>
        <View style={{ width: 38 }}><Text style={[styles.tableHeadCell, { textAlign: "right" }]}>Rank</Text></View>
        <View style={{ width: 56 }}><Text style={[styles.tableHeadCell, { textAlign: "right" }]}>Annual</Text></View>
        <View style={{ width: 60 }}><Text style={[styles.tableHeadCell, { textAlign: "right" }]}>Confidence</Text></View>
      </View>

      {rows.map((r) => {
        const annualImpact = Math.max(
          r.annualRecoverableMarket,
          ...Object.values(r.annualRecoverableByCarrier)
        );
        return (
          <View key={r.code} style={styles.tableRow} wrap={false}>
            <View style={{ width: 44 }}><Text style={[styles.tableCell, { fontFamily: "Helvetica-Bold", fontSize: 8 }]}>{r.code}</Text></View>
            <View style={{ flex: 2 }}><Text style={[styles.tableCell, { fontSize: 8 }]}>{r.description}</Text></View>
            <View style={{ width: 50 }}><Text style={[styles.tableCellRight, { fontSize: 8 }]}>{fmtUsd(r.practiceFee)}</Text></View>
            <View style={{ width: 50 }}><Text style={[styles.tableCellRight, { fontSize: 8, color: COLORS.ink500 }]}>{r.p50 !== null ? fmtUsd(r.p50) : "--"}</Text></View>
            <View style={{ width: 50 }}><Text style={[styles.tableCellRight, { fontSize: 8 }]}>{r.p75 !== null ? fmtUsd(r.p75) : "--"}</Text></View>
            <View style={{ width: 50 }}><Text style={[styles.tableCellRight, { fontSize: 8, color: COLORS.ink500 }]}>{r.p90 !== null ? fmtUsd(r.p90) : "--"}</Text></View>
            <View style={{ width: 38 }}>
              <Text style={[styles.tableCellRight, { fontSize: 8 }]}>
                {r.percentileRank !== null ? `${Math.round(r.percentileRank)}th` : "--"}
              </Text>
            </View>
            <View style={{ width: 56 }}>
              <Text style={[styles.tableCellRight, { fontSize: 8, color: annualImpact > 0 ? COLORS.red : COLORS.ink400, fontFamily: annualImpact > 0 ? "Helvetica-Bold" : "Helvetica" }]}>
                {annualImpact > 0 ? fmtUsd(annualImpact, { round: true }) : "--"}
              </Text>
            </View>
            <View style={{ width: 60, alignItems: "flex-end" }}>
              <Text style={[styles.pill, pillStyle(r.confidence)]}>
                {r.confidence === "no_data" ? "NO DATA" : r.confidence.toUpperCase()}
              </Text>
            </View>
          </View>
        );
      })}

      {data.flags.length > 0 && (
        <View style={{ marginTop: 18 }}>
          <Text style={styles.sectionLabel}>Notes</Text>
          {data.flags.map((flag, i) => (
            <Text key={i} style={[styles.bodyMuted, { marginBottom: 2 }]}>
              · {flag}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}
