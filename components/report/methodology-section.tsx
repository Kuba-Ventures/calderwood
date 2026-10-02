import React from "react";
// Methodology + dynamic worked example. The worked example must come from
// the practice's actual computation output, not a hardcoded code.

import { Text, View } from "@react-pdf/renderer";
import type {
  CodeRow,
  ComputationOutput,
  UnderpaymentBasis,
} from "@/lib/types/pipeline";
import { COLORS, fmtUsd, styles } from "./styles";

export function MethodologySection({
  data,
  basis,
}: {
  data: ComputationOutput;
  basis: UnderpaymentBasis;
}) {
  const ex = data.workedExample;

  return (
    <View>
      <Text style={styles.sectionLabel}>Methodology</Text>
      <Text style={styles.h2}>How the numbers were calculated.</Text>

      <Text style={[styles.bodyMuted, { marginTop: 10 }]}>
        UCR (usual, customary, and reasonable) benchmarks are resolved at the
        most specific geo level available. The first level is your ZIP code: a
        national benchmark adjusted by a ZIP-level geographic factor. After
        that come your three-digit ZIP area, metro, state, region, and
        national. A level is used only when its benchmark rests on at least 30
        fees; otherwise the code falls through to the next level. The ZIP-level
        figure carries the sample size of the national benchmark it is built
        from.
      </Text>

      <Text style={[styles.bodyMuted, { marginTop: 8 }]}>
        For each code on your master fee schedule we compute the gap to the
        local 75th percentile, clamped at zero (codes where you are paid above
        p75 contribute nothing to recoverable totals). Per-carrier gaps use
        the carrier&apos;s contracted rate for that specific code. We never
        assume the master fee applies when a carrier-specific rate is missing
        -- those codes are excluded from that carrier&apos;s totals.
      </Text>

      <Text style={[styles.bodyMuted, { marginTop: 8 }]}>
        Annual recoverable is the per-code gap multiplied by your annual
        frequency for that code (sourced from your PMS export). The headline
        is the sum of your own fee&apos;s gap to p75 across codes; the per-code
        clamp is never applied at the aggregate level. Carrier totals use
        contracted rates instead. We do not know your payer mix, so each
        code&apos;s volume is split evenly across the carriers that list a
        rate for it.
      </Text>

      <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
        Worked example · {ex ? ex.code : "(no eligible code)"}
      </Text>

      {ex ? <Example row={ex} basis={basis} /> : (
        <Text style={styles.bodyMuted}>
          No code in your top 10 by impact met the worked-example criteria
          (high-confidence benchmark, positive gap, frequency above threshold).
          See the appendix for the full row-by-row calculation.
        </Text>
      )}
    </View>
  );
}

function Example({ row, basis }: { row: CodeRow; basis: UnderpaymentBasis }) {
  // For carrier basis, walk through the worst-paying carrier on this code.
  const worstCarrier = basis === "carrier"
    ? Object.entries(row.annualRecoverableByCarrier).sort((a, b) => b[1] - a[1])[0]
    : null;
  const carrierName = worstCarrier?.[0];
  const carrierFee = carrierName ? row.carrierFees[carrierName] : null;
  const carrierGap = carrierName ? row.carrierGaps[carrierName] : null;
  // Same even volume split as the carrier totals (see summarizeTotals).
  const carriersOnCode = Object.keys(row.annualRecoverableByCarrier).length;
  const carrierRecoverable =
    worstCarrier && carriersOnCode > 0 ? worstCarrier[1] / carriersOnCode : undefined;

  return (
    <View style={{ marginTop: 6 }}>
      <Text style={styles.body}>
        Procedure: <Text style={{ fontFamily: "Helvetica-Bold" }}>{row.description}</Text>
      </Text>
      <View style={{ marginTop: 10 }}>
        <Line label={`Your master fee for ${row.code}`} value={fmtUsd(row.practiceFee)} />
        <Line label={`UCR 50th percentile (${geoLabel(row.geoLevelUsed)} level)`} value={row.p50 !== null ? fmtUsd(row.p50) : "--"} />
        <Line label="UCR 75th percentile (target)" value={row.p75 !== null ? fmtUsd(row.p75) : "--"} bold />
        <Line label="UCR 90th percentile" value={row.p90 !== null ? fmtUsd(row.p90) : "--"} />
      </View>

      {basis === "carrier" && carrierName && carrierFee !== null && carrierGap !== null && (
        <View style={{ marginTop: 14, padding: 12, backgroundColor: COLORS.canvasTint }}>
          <Text style={[styles.summaryCardLabel, { marginBottom: 6 }]}>
            Worst-paying carrier on this code: {carrierName}
          </Text>
          <Line label={`${carrierName} contracted rate`} value={fmtUsd(carrierFee)} />
          <Line label="Gap to UCR p75" value={fmtUsd(carrierGap)} />
          <Line label="Annual frequency" value={row.annualFrequency.toLocaleString()} />
          <Line label="Carriers sharing that volume" value={carriersOnCode.toLocaleString()} />
          <Line
            label={`Annual recoverable from ${carrierName}`}
            value={fmtUsd(carrierRecoverable ?? 0, { round: true })}
            bold
            accent
          />
        </View>
      )}

      {basis === "market" && (
        <View style={{ marginTop: 14, padding: 12, backgroundColor: COLORS.canvasTint }}>
          <Line label="Gap (UCR p75 minus your fee)" value={fmtUsd(row.marketGap)} />
          <Line label="Annual frequency" value={row.annualFrequency.toLocaleString()} />
          <Line
            label="Annual recoverable revenue"
            value={fmtUsd(row.annualRecoverableMarket, { round: true })}
            bold
            accent
          />
        </View>
      )}
    </View>
  );
}

function Line({
  label,
  value,
  bold,
  accent,
}: {
  label: string;
  value: string;
  bold?: boolean;
  accent?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 3,
      }}
    >
      <Text style={{ fontSize: 9, color: COLORS.ink500 }}>{label}</Text>
      <Text
        style={{
          fontSize: bold ? 11 : 10,
          fontFamily: bold ? "Times-Roman" : "Helvetica",
          color: accent ? COLORS.accentInk : COLORS.ink900,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function geoLabel(level: CodeRow["geoLevelUsed"]): string {
  switch (level) {
    case "zip5":
      return "ZIP";
    case "zip3":
      return "3-digit ZIP";
    case null:
      return "--";
    default:
      return level;
  }
}
