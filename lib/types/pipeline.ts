// Shared domain types for the intake → parse → compute → report pipeline.
// These mirror the DB schema in supabase/migrations/0001_init.sql.

export type GeoLevel = "zip5" | "zip3" | "metro" | "state" | "region" | "national";

export const CARRIERS = [
  "Delta",
  "Aetna",
  "Cigna",
  "MetLife",
  "UnitedHealthcare",
  "Guardian",
  "BCBS",
  "Humana",
  "Other",
] as const;
export type Carrier = (typeof CARRIERS)[number];

export type ProviderBucket = "1" | "2-5" | "6+";

export type PracticeStatus =
  | "awaiting_uploads"
  | "parsing"
  | "review_queue"
  | "report_ready"
  | "delivered";

export type ScheduleType = "master" | "carrier";
export type ParseConfidence = "high" | "medium" | "low" | "failed";

// Benchmark resolution

export type BenchmarkConfidence = "high" | "medium" | "low";

export type Benchmark = {
  p50: number;
  p75: number;
  p90: number;
  geoLevelUsed: GeoLevel;
  sampleSize: number;
  confidence: BenchmarkConfidence;
};

export type UcrBenchmarkRow = {
  geo_level: GeoLevel;
  geo_id: string;
  cdt_code: string;
  p50: number;
  p75: number;
  p90: number;
  sample_size: number;
  source_version: string;
};

// Fee entries and computation

export type FeeEntry = { code: string; fee: number };

export type ComputationInput = {
  zip5: string;
  contractedCarriers: string[];
  masterSchedule: FeeEntry[];
  carrierSchedules: Record<string, FeeEntry[]>;
  frequencies: Record<string, number>;
  /** Per-code, per-provider fee: code -> provider label -> fee. Optional. */
  providerFees?: Record<string, Record<string, number>>;
};

export type CodeConfidence = "high" | "medium" | "low" | "no_data";

export type CodeRow = {
  code: string;
  description: string;
  practiceFee: number;
  p50: number | null;
  p75: number | null;
  p90: number | null;
  geoLevelUsed: GeoLevel | null;
  confidence: CodeConfidence;
  marketGap: number;
  percentileRank: number | null;
  annualFrequency: number;
  annualRecoverableMarket: number;
  carrierFees: Record<string, number>;
  carrierGaps: Record<string, number>;
  annualRecoverableByCarrier: Record<string, number>;
  /** Per-provider fee for this code (provider label -> fee). Optional. */
  providerFees?: Record<string, number>;
  /** Recoverable by aligning lower providers up to the highest in-house fee. */
  providerVarianceRecoverable?: number;
};

export type UnderpaymentBasis = "carrier" | "market";

export type VolumeBasis = "counts" | "none";

/** One procedure's gap to the local p75, per time it is performed. */
export type PerProcedureGap = {
  code: string;
  /** Plain-English name for everyday codes, else the CDT description. */
  name: string;
  practiceFee: number;
  p75: number;
  /** p75 minus your fee: what you collect less each time. */
  gap: number;
};

export type PerProcedureSummary = {
  /** First everyday procedure below p75: the cover headline. */
  headline: PerProcedureGap | null;
  /** Everyday procedures below p75, display order. */
  everyday: PerProcedureGap[];
  /** Benchmarked codes, and how many sit below p75. */
  codesBenchmarked: number;
  codesBelowP75: number;
};

export type ComputationOutput = {
  codeRows: CodeRow[];
  executiveSummary: {
    /** Fee-schedule gap: sum of (p75 minus your fee) x volume. The headline. */
    totalAnnualUnderpayment: number;
    /**
     * Contracted-rate gap to p75, volume split evenly across the carriers on
     * each code. Optional because reports stored before it existed lack it.
     */
    carrierAnnualUnderpayment?: number;
    codesBelowP75InTop20: { count: number; total: number };
    topCarrier: { name: string; recoverable: number } | null;
    underpaymentBasis: UnderpaymentBasis;
    /**
     * "counts": the practice supplied procedure counts, so yearly dollars are
     * real. "none": prices only; every yearly figure is 0 and the report leads
     * with per-procedure gaps instead. Absent on reports stored before this
     * existed (those used estimated volumes); treat absent as "counts".
     */
    volumeBasis?: VolumeBasis;
    /** Per-procedure view, used when volumeBasis is "none". */
    perProcedure?: PerProcedureSummary;
  };
  top10ByImpact: CodeRow[];
  recoverableByCarrier: Array<{ carrier: string; recoverable: number }>;
  workedExample: CodeRow | null;
  flags: string[];
};

// Validation bounds used throughout the parser. Centralized here so the
// CSV and PDF paths agree on what's plausible.
export const FEE_MIN = 10;
export const FEE_MAX = 5000;
export const CDT_REGEX = /^D\d{4}$/;
