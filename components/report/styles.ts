// Shared React-PDF styles. Colors mirror tailwind.config.ts so the report
// reads as the same brand as the dashboard. Default fonts are Helvetica
// (sans) + Times-Roman (serif) to avoid bundling Google fonts at build
// time; if Inter/Newsreader matters later, register them in report-doc.

import { StyleSheet } from "@react-pdf/renderer";

export const COLORS = {
  ink900: "#0b1220",
  ink700: "#1f2a44",
  ink500: "#475569",
  ink400: "#64748b",
  ink300: "#94a3b8",
  ink200: "#cbd5e1",
  canvas: "#ffffff",
  canvasTint: "#f8fafc",
  canvasTint2: "#f1f5f9",
  canvasBorder: "#e2e8f0",
  accent: "#0c4a6e",
  accentInk: "#082f49",
  accentSoft: "#e0f2fe",
  red: "#991b1b",
  amber: "#a16207",
  gainInk: "#3f5f4b",
} as const;

export const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 64,
    paddingHorizontal: 56,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: COLORS.ink700,
    backgroundColor: COLORS.canvas,
  },
  brandHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottom: `1pt solid ${COLORS.canvasBorder}`,
  },
  brandName: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink900,
    letterSpacing: -0.3,
  },
  brandRight: {
    fontSize: 8,
    color: COLORS.ink400,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  meta: {
    marginTop: 12,
    fontSize: 9,
    color: COLORS.ink400,
    lineHeight: 1.4,
  },
  sectionLabel: {
    marginTop: 28,
    marginBottom: 10,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink400,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  h1: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink900,
    letterSpacing: -0.5,
    marginTop: 4,
  },
  h2: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink900,
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 10,
    lineHeight: 1.5,
    color: COLORS.ink700,
  },
  bodyMuted: {
    fontSize: 9,
    color: COLORS.ink500,
    lineHeight: 1.45,
  },
  numberHero: {
    fontSize: 28,
    fontFamily: "Times-Roman",
    color: COLORS.accentInk,
    letterSpacing: -0.5,
  },
  numberMedium: {
    fontSize: 18,
    fontFamily: "Times-Roman",
    color: COLORS.accentInk,
  },
  summaryGrid: {
    marginTop: 18,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  summaryCard: {
    width: "50%",
    paddingVertical: 10,
    paddingRight: 14,
  },
  summaryCardLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink400,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  summaryCardSub: {
    fontSize: 8.5,
    color: COLORS.ink500,
    marginTop: 4,
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottom: `0.5pt solid ${COLORS.canvasBorder}`,
    backgroundColor: COLORS.canvasTint,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderBottom: `0.5pt solid ${COLORS.canvasBorder}`,
  },
  tableHeadCell: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink400,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  tableCell: {
    fontSize: 9,
    color: COLORS.ink700,
  },
  tableCellRight: {
    fontSize: 9,
    color: COLORS.ink700,
    textAlign: "right",
  },
  footer: {
    position: "absolute",
    bottom: 32,
    left: 56,
    right: 56,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: COLORS.ink400,
  },
  callout: {
    marginTop: 18,
    padding: 14,
    backgroundColor: COLORS.canvasTint,
    borderLeft: `2pt solid ${COLORS.accent}`,
  },
  pill: {
    paddingVertical: 1,
    paddingHorizontal: 5,
    borderRadius: 6,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
});

export function pillStyle(level: "high" | "medium" | "low" | "no_data") {
  switch (level) {
    case "high":
      return { backgroundColor: COLORS.accentSoft, color: COLORS.accentInk };
    case "medium":
      return { backgroundColor: "#fef3c7", color: COLORS.amber };
    case "low":
      return { backgroundColor: "#fee2e2", color: COLORS.red };
    case "no_data":
      return { backgroundColor: COLORS.canvasTint2, color: COLORS.ink400 };
  }
}

export function fmtUsd(n: number, opts: { round?: boolean } = {}): string {
  const value = opts.round ? Math.round(n) : n;
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function fmtPct(rank: number | null): string {
  if (rank === null) return "--";
  return `${Math.round(rank)}${ordinalSuffix(Math.round(rank))}`;
}

function ordinalSuffix(n: number): string {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
}
