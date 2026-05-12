// Practice + report data-access layer. All DB writes for the intake →
// parse → compute → report pipeline pass through these functions so the
// SQL stays in one place and tests can stub the DAL cleanly.

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ComputationOutput,
  FeeEntry,
  ParseConfidence,
  PracticeStatus,
  ScheduleType,
} from "@/lib/types/pipeline";

export type PracticeRow = {
  id: string;
  email: string;
  practice_name: string | null;
  zip5: string;
  provider_count_bucket: "1" | "2-5" | "6+";
  contracted_carriers: string[];
  recredentialing_dates: Record<string, string> | null;
  created_at: string;
  stripe_payment_id: string | null;
  status: PracticeStatus;
};

export type FeeScheduleRow = {
  id: string;
  practice_id: string;
  schedule_type: ScheduleType;
  carrier: string | null;
  raw_file_url: string | null;
  parsed_data: FeeEntry[] | null;
  parse_confidence: ParseConfidence | null;
  parse_notes: string | null;
  created_at: string;
};

export type ReportRow = {
  id: string;
  practice_id: string;
  computation_output: ComputationOutput;
  pdf_url: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  delivered_at: string | null;
};

export async function getPracticeByEmail(
  sb: SupabaseClient,
  email: string
): Promise<PracticeRow | null> {
  const { data, error } = await sb
    .from("practices")
    .select("*")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as PracticeRow | null) ?? null;
}

export async function getReportByPracticeId(
  sb: SupabaseClient,
  practiceId: string
): Promise<ReportRow | null> {
  const { data, error } = await sb
    .from("reports")
    .select("*")
    .eq("practice_id", practiceId)
    .maybeSingle();
  if (error) throw error;
  return (data as ReportRow | null) ?? null;
}

export async function upsertPractice(
  sb: SupabaseClient,
  fields: Omit<PracticeRow, "id" | "created_at">
): Promise<PracticeRow> {
  const { data, error } = await sb
    .from("practices")
    .upsert([fields], { onConflict: "email" })
    .select()
    .single();
  if (error) throw error;
  return data as PracticeRow;
}

export async function deletePracticeByEmail(
  sb: SupabaseClient,
  email: string
): Promise<number> {
  // Cascade handles fee_schedules / frequency_data / reports.
  const { count, error } = await sb
    .from("practices")
    .delete({ count: "exact" })
    .eq("email", email);
  if (error) throw error;
  return count ?? 0;
}

export async function insertFeeSchedule(
  sb: SupabaseClient,
  fields: Omit<FeeScheduleRow, "id" | "created_at">
): Promise<FeeScheduleRow> {
  const { data, error } = await sb
    .from("fee_schedules")
    .insert([fields])
    .select()
    .single();
  if (error) throw error;
  return data as FeeScheduleRow;
}

export async function insertFrequencies(
  sb: SupabaseClient,
  practiceId: string,
  frequencies: Record<string, number>
): Promise<void> {
  const rows = Object.entries(frequencies).map(([cdt_code, annual_frequency]) => ({
    practice_id: practiceId,
    cdt_code,
    annual_frequency,
  }));
  if (rows.length === 0) return;
  const { error } = await sb.from("frequency_data").upsert(rows, {
    onConflict: "practice_id,cdt_code",
  });
  if (error) throw error;
}

export async function upsertReport(
  sb: SupabaseClient,
  fields: Omit<ReportRow, "id">
): Promise<ReportRow> {
  const { data, error } = await sb
    .from("reports")
    .upsert([fields], { onConflict: "practice_id" })
    .select()
    .single();
  if (error) throw error;
  return data as ReportRow;
}

export async function getFeeSchedules(
  sb: SupabaseClient,
  practiceId: string
): Promise<FeeScheduleRow[]> {
  const { data, error } = await sb
    .from("fee_schedules")
    .select("*")
    .eq("practice_id", practiceId);
  if (error) throw error;
  return (data as FeeScheduleRow[]) ?? [];
}

export async function getFrequencies(
  sb: SupabaseClient,
  practiceId: string
): Promise<Record<string, number>> {
  const { data, error } = await sb
    .from("frequency_data")
    .select("cdt_code, annual_frequency")
    .eq("practice_id", practiceId);
  if (error) throw error;
  const out: Record<string, number> = {};
  for (const row of (data as Array<{ cdt_code: string; annual_frequency: number }>) ?? []) {
    out[row.cdt_code] = row.annual_frequency;
  }
  return out;
}
