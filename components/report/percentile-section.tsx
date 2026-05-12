import React from "react";
// Section 1: Percentile rank for the top-volume codes, rendered as
// horizontal bars with a 75th-percentile guide line.

import { Text, View } from "@react-pdf/renderer";
import type { ComputationOutput } from "@/lib/types/pipeline";
import { COLORS, fmtPct, styles } from "./styles";

export function PercentileSection({ data }: { data: ComputationOutput }) {
  // Top 12 by practice volume, excluding no_data.
  const rows = [...data.codeRows]
    .filter((r) => r.confidence !== "no_data" && r.percentileRank !== null)
    .sort(
      (a, b) =>
        b.practiceFee * b.annualFrequency - a.practiceFee * a.annualFrequency
    )
    .slice(0, 12);

  return (
    <View>
      <Text style={styles.sectionLabel}>Section 1 · Percentile rank</Text>
      <Text style={styles.h2}>Where each fee sits in your ZIP.</Text>
      <Text style={[styles.bodyMuted, { marginTop: 6 }]}>
        Each bar shows your master fee&apos;s percentile rank against the
        local UCR distribution. The vertical line marks the 75th percentile.
        Fees to the left of the line are below market.
      </Text>

      <View style={{ marginTop: 18 }}>
        {rows.map((row) => (
          <PercentileBar
            key={row.code}
            code={row.code}
            description={row.description}
            rank={row.percentileRank!}
          />
        ))}
      </View>

      <View style={{ flexDirection: "row", marginTop: 14, gap: 16 }}>
        <Legend swatchColor={COLORS.accent} label="your master fee" />
        <Legend tick label="75th percentile (target)" />
      </View>
    </View>
  );
}

function PercentileBar({
  code,
  description,
  rank,
}: {
  code: string;
  description: string;
  rank: number;
}) {
  const w = Math.max(2, Math.min(100, rank));
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 4 }}>
      <View style={{ width: 44 }}>
        <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: COLORS.ink700 }}>
          {code}
        </Text>
      </View>
      <View style={{ width: 130, paddingRight: 10 }}>
        <Text style={{ fontSize: 8, color: COLORS.ink500 }}>{description}</Text>
      </View>
      <View
        style={{
          flex: 1,
          height: 8,
          backgroundColor: COLORS.canvasTint2,
          borderRadius: 4,
          position: "relative",
        }}
      >
        <View
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: `${w}%`,
            backgroundColor: COLORS.accent,
            borderRadius: 4,
          }}
        />
        <View
          style={{
            position: "absolute",
            left: "75%",
            top: -2,
            bottom: -2,
            width: 1,
            backgroundColor: COLORS.ink400,
          }}
        />
      </View>
      <View style={{ width: 42, paddingLeft: 8 }}>
        <Text style={{ fontSize: 9, fontFamily: "Times-Roman", color: COLORS.ink900, textAlign: "right" }}>
          {fmtPct(rank)}
        </Text>
      </View>
    </View>
  );
}

function Legend({
  swatchColor,
  tick,
  label,
}: {
  swatchColor?: string;
  tick?: boolean;
  label: string;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      {tick ? (
        <View style={{ width: 1, height: 10, backgroundColor: COLORS.ink400 }} />
      ) : (
        <View style={{ width: 16, height: 4, backgroundColor: swatchColor, borderRadius: 2 }} />
      )}
      <Text style={{ fontSize: 8, color: COLORS.ink500 }}>{label}</Text>
    </View>
  );
}
