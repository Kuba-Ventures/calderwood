// Shared domain types for the intake → parse → compute → report pipeline.
// These mirror the DB schema in supabase/migrations/0001_init.sql.

export type GeoLevel = "zip3" | "metro" | "state" | "region" | "national";

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

export type ComputationOutput = {
  codeRows: CodeRow[];
  executiveSummary: {
    totalAnnualUnderpayment: number;
    codesBelowP75InTop20: { count: number; total: number };
    topCarrier: { name: string; recoverable: number } | null;
    underpaymentBasis: UnderpaymentBasis;
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
