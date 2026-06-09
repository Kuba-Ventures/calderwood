import React from "react";
// PDF section: opportunity by procedure category. Navy bars, recoverable as a
// share of each category's annual production. Derived from codeRows.

import { Text, View } from "@react-pdf/renderer";
import type { ComputationOutput } from "@/lib/types/pipeline";
import { COLORS, fmtUsd, styles } from "./styles";
import { categoryFor } from "@/lib/data/cdt-categories";

type Cat = { name: string; recoverable: number; production: number };

export function CategorySection({ data }: { data: ComputationOutput }) {
  const map: Record<string, Cat> = {};
  for (const r of data.codeRows) {
    if (!r.p75 || r.p75 <= 0) continue;
    const name = categoryFor(r.code);
    const m = map[name] || (map[name] = { name, recoverable: 0, production: 0 });
    m.recoverable += r.annualRecoverableMarket;
    m.production += r.practiceFee * r.annualFrequency;
  }
  const cats = Object.values(map)
    .map((c) => ({ ...c, pct: c.production > 0 ? c.recoverable / c.production : 0 }))
    .filter((c) => c.recoverable > 0)
    .sort((a, b) => b.recoverable - a.recoverable);
  if (cats.length === 0) return null;
  const max = Math.max(...cats.map((c) => c.pct), 0.0001);

  return (
    <View>
      <Text style={styles.sectionLabel}>Section · Opportunity by category</Text>
      <Text style={styles.h2}>Opportunity by procedure category.</Text>
      <Text style={[styles.bodyMuted, { marginTop: 6 }]}>
        Recoverable revenue as a share of each category&rsquo;s annual production.
      </Text>
      <View style={{ marginTop: 16 }}>
        {cats.map((c) => (
          <View key={c.name} style={{ marginVertical: 6 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: COLORS.ink900 }}>
                {c.name}
              </Text>
              <Text style={{ fontSize: 11, fontFamily: "Times-Roman", color: COLORS.accentInk }}>
                {fmtUsd(c.recoverable, { round: true })}
              </Text>
            </View>
            <View style={{ height: 9, backgroundColor: COLORS.canvasTint2, borderRadius: 5, overflow: "hidden" }}>
              <View style={{ width: `${Math.max(3, (c.pct / max) * 100)}%`, height: "100%", backgroundColor: COLORS.accent }} />
            </View>
            <Text style={{ fontSize: 7.5, color: COLORS.ink400, marginTop: 2, textAlign: "right" }}>
              {(c.pct * 100).toFixed(1)}% of production
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
