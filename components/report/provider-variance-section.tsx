import React from "react";
// PDF section: fee variance across providers. Per code, each provider's fee as a
// bar (highest = green), with the recoverable from aligning everyone up.

import { Text, View } from "@react-pdf/renderer";
import type { ComputationOutput } from "@/lib/types/pipeline";
import { COLORS, fmtUsd, styles } from "./styles";

export function providerVarianceRows(data: ComputationOutput) {
  return data.codeRows
    .filter((r) => r.providerFees && (r.providerVarianceRecoverable ?? 0) > 0)
    .map((r) => {
      const providers = Object.entries(r.providerFees ?? {})
        .map(([provider, fee]) => ({ provider, fee }))
        .sort((a, b) => b.fee - a.fee);
      const fees = providers.map((p) => p.fee);
      return {
        code: r.code,
        label: r.description,
        providers,
        recoverable: Math.round(r.providerVarianceRecoverable ?? 0),
        spread: fees.length ? Math.max(...fees) - Math.min(...fees) : 0,
      };
    })
    .filter((r) => r.spread > 0)
    .sort((a, b) => b.recoverable - a.recoverable);
}

export function ProviderVarianceSection({ data }: { data: ComputationOutput }) {
  const rows = providerVarianceRows(data).slice(0, 8);
  if (rows.length === 0) return null;
  return (
    <View>
      <Text style={styles.sectionLabel}>Section · Provider variance</Text>
      <Text style={styles.h2}>Fee variance across providers.</Text>
      <Text style={[styles.bodyMuted, { marginTop: 6 }]}>
        The same code billed at different fees by different providers. Aligning
        everyone to your highest in-house fee is recoverable revenue.
      </Text>
      <View style={{ marginTop: 14 }}>
        {rows.map((r) => {
          const hi = Math.max(...r.providers.map((p) => p.fee), 1);
          return (
            <View
              key={r.code}
              style={{ marginVertical: 6, paddingBottom: 7, borderBottom: `0.5pt solid ${COLORS.canvasBorder}` }}
              wrap={false}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={{ fontSize: 9 }}>
                  <Text style={{ fontFamily: "Helvetica-Bold", color: COLORS.accent }}>{r.code}</Text>
                  <Text style={{ color: COLORS.ink500 }}>{`  ${r.label}`}</Text>
                </Text>
                <Text style={{ fontSize: 10, fontFamily: "Times-Roman", color: COLORS.red }}>
                  {fmtUsd(r.recoverable, { round: true })}
                </Text>
              </View>
              {r.providers.map((p) => (
                <View key={p.provider} style={{ flexDirection: "row", alignItems: "center", marginVertical: 1.5 }}>
                  <Text style={{ width: 46, fontSize: 7.5, color: COLORS.ink500 }}>{p.provider}</Text>
                  <View style={{ flex: 1, height: 7, backgroundColor: COLORS.canvasTint2, borderRadius: 4, overflow: "hidden", marginHorizontal: 6 }}>
                    <View style={{ width: `${(p.fee / hi) * 100}%`, height: "100%", backgroundColor: p.fee === hi ? COLORS.gainInk : COLORS.accent }} />
                  </View>
                  <Text style={{ width: 48, fontSize: 7.5, fontFamily: "Times-Roman", textAlign: "right", color: COLORS.ink700 }}>
                    {fmtUsd(p.fee, { round: true })}
                  </Text>
                </View>
              ))}
            </View>
          );
        })}
      </View>
    </View>
  );
}
