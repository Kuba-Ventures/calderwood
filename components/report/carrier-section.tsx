import React from "react";
// Section 3: Recoverable revenue by carrier. Only rendered when
// underpaymentBasis === "carrier".

import { Text, View } from "@react-pdf/renderer";
import type { ComputationOutput } from "@/lib/types/pipeline";
import { COLORS, fmtUsd, styles } from "./styles";

export function CarrierSection({ data }: { data: ComputationOutput }) {
  const rows = data.recoverableByCarrier;
  const max = Math.max(...rows.map((r) => r.recoverable), 1);

  return (
    <View>
      <Text style={styles.sectionLabel}>Section 3 · Recoverable by carrier</Text>
      <Text style={styles.h2}>Which contracts are bleeding revenue.</Text>
      <Text style={[styles.bodyMuted, { marginTop: 6 }]}>
        For every contracted carrier, we sum your annual gap-to-UCR-p75 across
        all codes where they pay you below market. The biggest opportunities
        sit at the top.
      </Text>

      <View style={{ marginTop: 18 }}>
        {rows.map((row, idx) => {
          const w = (row.recoverable / max) * 100;
          return (
            <View key={row.carrier} style={{ marginVertical: 6 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={{ fontSize: 10, fontFamily: idx === 0 ? "Helvetica-Bold" : "Helvetica", color: COLORS.ink900 }}>
                  {row.carrier}
                </Text>
                <Text style={{ fontSize: 12, fontFamily: "Times-Roman", color: COLORS.accentInk }}>
                  {fmtUsd(row.recoverable, { round: true })}
                </Text>
              </View>
              <View style={{ height: 10, backgroundColor: COLORS.canvasTint2, borderRadius: 5, overflow: "hidden" }}>
                <View
                  style={{
                    width: `${w}%`,
                    height: "100%",
                    backgroundColor: idx === 0 ? COLORS.accent : COLORS.accentSoft,
                  }}
                />
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.callout}>
        <Text style={[styles.body, { color: COLORS.ink900 }]}>
          How to use this section.
        </Text>
        <Text style={[styles.bodyMuted, { marginTop: 6 }]}>
          Start with the carrier at the top of the list. Pull their contract,
          identify the top 5 codes from Section 2 that they underpay, and
          request published UCR p75 rates on those codes when you call your
          provider rep. The methodology section walks through the math for a
          single code.
        </Text>
      </View>
    </View>
  );
}
