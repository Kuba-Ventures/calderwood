// Real report generation: the user-facing counterpart to the seed route.
// Reads a practice's fee schedules + frequencies, resolves live benchmarks,
// runs compute(), renders the PDF, uploads it, and writes the report row —
// advancing practices.status at each real work boundary so the dashboard's
// status tracker reflects genuine job state (not a timer).
//
// Status walk (each is a real DB write between real units of work):
//   awaiting_uploads -> parsing      (resolving benchmarks + computing)
//   parsing          -> review_queue (compute done; rendering the deliverable)
//   review_queue     -> report_ready (PDF stored, report row written)
// Payment later flips report_ready -> delivered (see the Stripe webhook).

import "server-only";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ReportDoc } from "@/components/report/report-doc";
import { compute } from "@/lib/computation/compute";
import { resolveForZip } from "@/lib/benchmark/supabase-source";
import {
  defaultFrequencies,
  providersFromBucket,
} from "@/lib/data/default-frequencies";
import {
  getFeeSchedules,
  getFrequencies,
  upsertReport,
} from "@/lib/db/practices";
import type { PracticeRow } from "@/lib/db/practices";
import type {
  ComputationInput,
  FeeEntry,
  PracticeStatus,
} from "@/lib/types/pipeline";

const STORAGE_BUCKET = "reports";

async function setStatus(
  sb: SupabaseClient,
  practiceId: string,
  status: PracticeStatus
): Promise<void> {
  const { error } = await sb
    .from("practices")
    .update({ status })
    .eq("id", practiceId);
  if (error) throw error;
}

async function ensureBucket(sb: SupabaseClient, name: string): Promise<void> {
  const { data: buckets } = await sb.storage.listBuckets();
  if (buckets?.some((b) => b.name === name)) return;
  await sb.storage.createBucket(name, { public: true });
}

/**
 * Generate (or regenerate) the report for one practice. Must be called with a
 * service-role client — it advances status and writes storage + the report row.
 * Idempotent: re-running recomputes and upserts the single report per practice.
 */
export async function generateReport(
  sb: SupabaseClient,
  practice: PracticeRow
): Promise<{ totalAnnualUnderpayment: number }> {
  await setStatus(sb, practice.id, "parsing");

  // 1. Assemble the ComputationInput from stored schedules + frequencies.
  const schedules = await getFeeSchedules(sb, practice.id);
  const master = schedules.find((s) => s.schedule_type === "master");
  const masterSchedule: FeeEntry[] = (master?.parsed_data as FeeEntry[]) ?? [];
  const carrierSchedules: Record<string, FeeEntry[]> = {};
  for (const s of schedules) {
    if (s.schedule_type === "carrier" && s.carrier && s.parsed_data) {
      carrierSchedules[s.carrier] = s.parsed_data as FeeEntry[];
    }
  }

  // Frequencies: use stored billing volumes if present, else fall back to the
  // per-provider defaults scaled by the practice's provider count.
  let frequencies = await getFrequencies(sb, practice.id);
  if (Object.keys(frequencies).length === 0) {
    frequencies = defaultFrequencies(
      masterSchedule.map((e) => e.code),
      providersFromBucket(practice.provider_count_bucket)
    );
  }

  const input: ComputationInput = {
    zip5: practice.zip5,
    contractedCarriers: practice.contracted_carriers,
    masterSchedule,
    carrierSchedules,
    frequencies,
  };

  // 2. Compute against live benchmarks.
  const resolve = resolveForZip(sb);
  const output = await compute(input, resolve);

  // 3. Render + store the deliverable.
  await setStatus(sb, practice.id, "review_queue");
  const element = React.createElement(ReportDoc, {
    data: output,
    meta: {
      practiceName: practice.practice_name ?? "Your practice",
      zip5: practice.zip5,
      providerCount: practice.provider_count_bucket,
      generatedAt: new Date(),
    },
  }) as React.ReactElement;
  const pdfBuffer = await renderToBuffer(element);
  await ensureBucket(sb, STORAGE_BUCKET);
  const storagePath = `${practice.id}.pdf`;
  const { error: upErr } = await sb.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (upErr) throw upErr;
  const { data: pub } = sb.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath);

  // 4. Persist the report. delivered_at stays null until payment unlocks it.
  await upsertReport(sb, {
    practice_id: practice.id,
    computation_output: output,
    pdf_url: pub.publicUrl,
    reviewed_by: null,
    reviewed_at: null,
    delivered_at: null,
  });

  await setStatus(sb, practice.id, "report_ready");

  return {
    totalAnnualUnderpayment:
      output.executiveSummary.totalAnnualUnderpayment,
  };
}
