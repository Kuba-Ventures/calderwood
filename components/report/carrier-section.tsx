import React from "react";
// PDF section: carrier reimbursement. Scorecard (A-F grade, blended % of p75,
// recoverable) + a static code-by-carrier matrix (cells = % of p75, colored
// maroon->neutral->green). Rendered when carrier schedules are present.

import { Text, View } from "@react-pdf/renderer";
import type { ComputationOutput } from "@/lib/types/pipeline";
import { COLORS, fmtUsd, styles } from "./styles";

function gradeFor(b: number) {
  return b >= 0.97 ? "A" : b >= 0.92 ? "B" : b >= 0.87 ? "C" : b >= 0.82 ? "D" : "F";
}
function mix(a: number[], b: number[], t: number) {
  return [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t));
}
function heat(ratio: number) {
  const m = [153, 27, 27], n = [238, 241, 244], g = [21, 128, 61];
  let c = ratio <= 0.97
    ? mix(m, n, Math.max(0, Math.min(1, (ratio - 0.78) / 0.19)))
    : mix(n, g, Math.max(0, Math.min(1, (ratio - 0.97) / 0.09)));
  c = mix(c, [255, 255, 255], 0.18);
  const lum = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
  return { bg: `rgb(${c[0]},${c[1]},${c[2]})`, fg: lum < 140 ? "#ffffff" : "#0b1220" };
}

export function CarrierSection({ data }: { data: ComputationOutput }) {
  const present = new Set<string>();
  data.codeRows.forEach((r) => Object.keys(r.carrierFees).forEach((k) => present.add(k)));
  const recBy: Record<string, number> = {};
  data.recoverableByCarrier.forEach((c) => (recBy[c.carrier] = c.recoverable));

  const carriers = Array.from(present)
    .map((name) => {
      let num = 0, den = 0;
      for (const r of data.codeRows) {
        const rate = r.carrierFees[name];
        if (rate == null || !r.p75) continue;
        num += rate * r.annualFrequency;
        den += r.p75 * r.annualFrequency;
      }
      const blended = den > 0 ? num / den : 0;
      return { name, blended, grade: gradeFor(blended), recoverable: Math.round(recBy[name] ?? 0) };
    })
    .sort((a, b) => b.recoverable - a.recoverable);

  const codes = data.codeRows
    .filter((r) => r.p75 && r.p75 > 0 && Object.keys(r.carrierFees).length > 0)
    .sort((a, b) => b.annualRecoverableMarket - a.annualRecoverableMarket)
    .slice(0, 12);

  return (
    <View>
      <Text style={styles.sectionLabel}>Section · Carrier reimbursement</Text>
      <Text style={styles.h2}>Which carrier underpays you most.</Text>
      <Text style={[styles.bodyMuted, { marginTop: 6 }]}>
        Each carrier graded against your local UCR p75, then a code-by-carrier grid
        of contracted rates as a percentage of p75.
      </Text>

      {/* scorecard */}
      <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap" }}>
        {carriers.map((c) => (
          <View key={c.name} style={{ width: "33.33%", padding: 4 }}>
            <View style={{ border: `0.5pt solid ${COLORS.canvasBorder}`, borderRadius: 4, padding: 8 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: COLORS.ink900 }}>{c.name}</Text>
                <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: COLORS.accent }}>{c.grade}</Text>
              </View>
              <Text style={{ fontSize: 13, fontFamily: "Times-Roman", color: COLORS.red, marginTop: 4 }}>
                {fmtUsd(c.recoverable, { round: true })}
              </Text>
              <Text style={{ fontSize: 7.5, color: COLORS.ink400, marginTop: 2 }}>
                pays {(c.blended * 100).toFixed(0)}% of p75
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* matrix */}
      <View style={{ marginTop: 14 }} wrap={false}>
        <View style={{ flexDirection: "row", borderBottom: `0.5pt solid ${COLORS.canvasBorder}`, paddingBottom: 4 }}>
          <Text style={{ width: "24%", fontSize: 7, fontFamily: "Helvetica-Bold", color: COLORS.ink400, textTransform: "uppercase", letterSpacing: 0.6 }}>
            Code
          </Text>
          {carriers.map((c) => (
            <Text key={c.name} style={{ flex: 1, fontSize: 6.5, fontFamily: "Helvetica-Bold", color: COLORS.ink400, textAlign: "center" }}>
              {c.name}
            </Text>
          ))}
        </View>
        {codes.map((r) => (
          <View key={r.code} style={{ flexDirection: "row", marginTop: 2 }}>
            <View style={{ width: "24%", justifyContent: "center", paddingVertical: 3 }}>
              <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: COLORS.accent }}>{r.code}</Text>
              <Text style={{ fontSize: 6.5, color: COLORS.ink400 }}>p75 {fmtUsd(r.p75 ?? 0, { round: true })}</Text>
            </View>
            {carriers.map((c) => {
              const rate = r.carrierFees[c.name];
              const ratio = rate && r.p75 ? rate / r.p75 : 1;
              const { bg, fg } = heat(ratio);
              return (
                <View
                  key={c.name}
                  style={{
                    flex: 1, marginLeft: 2, borderRadius: 2, paddingVertical: 5,
                    alignItems: "center", justifyContent: "center",
                    backgroundColor: rate == null ? COLORS.canvasTint : bg,
                  }}
                >
                  <Text style={{ fontSize: 7.5, fontFamily: "Times-Roman", color: rate == null ? COLORS.ink300 : fg }}>
                    {rate == null ? "n/a" : `${(ratio * 100).toFixed(0)}%`}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.callout}>
        <Text style={[styles.body, { color: COLORS.ink900 }]}>How to use this.</Text>
        <Text style={[styles.bodyMuted, { marginTop: 6 }]}>
          Start with the lowest-grade, highest-volume carrier. On each code where
          they pay well under p75, ask for the published UCR rate, using any carrier
          already paying more on that code as your anchor.
        </Text>
      </View>
    </View>
  );
}
