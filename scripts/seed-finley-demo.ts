#!/usr/bin/env tsx
//
// Seed finley@qsbsrollover.com with a fully delivered demo report for
// Underwood Family Dental (Brookline, MA). Idempotent: re-running deletes
// the existing practice row (cascading schedules + frequencies + report)
// and rebuilds. The auth user stays in place across runs.
//
// Required env:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   DEMO_FINLEY_PASSWORD
//
// Run:
//   npm run seed:finley

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { ReportDoc } from "../components/report/report-doc";
import { compute } from "../lib/computation/compute";
import {
  InMemoryBenchmarkSource,
  InMemoryGeoResolver,
  resolveBenchmarkWith,
} from "../lib/benchmark/resolve";
import { STATE_TO_REGION } from "../lib/seed/state-to-region";
import { ZIP_TO_METRO, ZIP_TO_STATE } from "../lib/data/zip-fixtures";
import type {
  ComputationInput,
  UcrBenchmarkRow,
} from "../lib/types/pipeline";

const DEMO_EMAIL = "finley@qsbsrollover.com";
const DEMO_PRACTICE_NAME = "Underwood Family Dental";
const DEMO_ZIP = "02446";
const STORAGE_BUCKET = "reports";
const STORAGE_PATH = "finley-demo.pdf";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return v;
}

async function main() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const password = requireEnv("DEMO_FINLEY_PASSWORD");
  const sb = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Auth user: create if missing, leave alone otherwise (id stable).
  console.log(`Step 1: ensuring auth user ${DEMO_EMAIL} exists...`);
  await ensureAuthUser(sb, password);

  // 2. Static seed data (benchmarks + lookups). Idempotent upserts.
  console.log("Step 2: seeding static lookups + Boston benchmarks...");
  await seedStaticLookups(sb);
  await seedBenchmarks(sb);

  // 3. Tear down any prior practice data (cascade handles children).
  console.log(`Step 3: clearing any prior practice rows for ${DEMO_EMAIL}...`);
  const { error: delErr } = await sb
    .from("practices")
    .delete()
    .eq("email", DEMO_EMAIL);
  if (delErr) throw delErr;

  // 4. Insert practice row.
  console.log("Step 4: inserting practice row...");
  const fixtureDir = path.join(__dirname, "..", "test-fixtures", "sample-practice");
  const input: ComputationInput = JSON.parse(
    fs.readFileSync(path.join(fixtureDir, "input.json"), "utf8")
  );
  // Demo per-provider fees: spread the master fee across providers so the
  // provider-variance section has data on the seeded report.
  const demoProviderFees: Record<string, Record<string, number>> = {};
  input.masterSchedule.slice(0, 8).forEach((e) => {
    const isHyg = /^D[01]/.test(e.code);
    const hi = Math.round(e.fee * 1.06 * 100) / 100;
    const lo = Math.round(e.fee * 0.94 * 100) / 100;
    demoProviderFees[e.code] = isHyg
      ? { DDS0: hi, DDS3: e.fee, HYG2: lo }
      : { DDS0: hi, DDS3: lo };
  });
  input.providerFees = demoProviderFees;
  const { data: practice, error: pracErr } = await sb
    .from("practices")
    .insert({
      email: DEMO_EMAIL,
      practice_name: DEMO_PRACTICE_NAME,
      zip5: DEMO_ZIP,
      provider_count_bucket: "2-5",
      contracted_carriers: input.contractedCarriers,
      recredentialing_dates: {
        Cigna: "2026-10-15",
        Aetna: "2027-04-01",
        MetLife: "2027-02-15",
      },
      status: "delivered",
      stripe_payment_id: "pi_demo_finley_seed",
    })
    .select()
    .single();
  if (pracErr) throw pracErr;
  console.log(`  practice id: ${practice.id}`);

  // 5. Insert master + carrier fee schedules.
  console.log("Step 5: inserting fee schedules...");
  const scheduleRows: Array<Record<string, unknown>> = [
    {
      practice_id: practice.id,
      schedule_type: "master",
      carrier: null,
      raw_file_url: null,
      parsed_data: input.masterSchedule,
      parse_confidence: "high",
      parse_notes: "seeded",
      provider_fees: input.providerFees,
    },
  ];
  for (const [carrier, fees] of Object.entries(input.carrierSchedules)) {
    scheduleRows.push({
      practice_id: practice.id,
      schedule_type: "carrier",
      carrier,
      raw_file_url: null,
      parsed_data: fees,
      parse_confidence: "high",
      parse_notes: "seeded",
    });
  }
  const { error: schedErr } = await sb.from("fee_schedules").insert(scheduleRows);
  if (schedErr) throw schedErr;

  // 6. Insert frequency rows.
  console.log("Step 6: inserting frequency data...");
  const freqRows = Object.entries(input.frequencies).map(([code, freq]) => ({
    practice_id: practice.id,
    cdt_code: code,
    annual_frequency: freq,
  }));
  const { error: freqErr } = await sb.from("frequency_data").insert(freqRows);
  if (freqErr) throw freqErr;

  // 7. Compute report against the seeded benchmarks (use in-memory resolver
  // so the seed is independent of the live DB benchmark rows).
  console.log("Step 7: running computation engine...");
  const benchmarks: UcrBenchmarkRow[] = JSON.parse(
    fs.readFileSync(path.join(fixtureDir, "benchmarks.json"), "utf8")
  );
  const geo = new InMemoryGeoResolver(ZIP_TO_STATE, ZIP_TO_METRO, STATE_TO_REGION);
  const src = new InMemoryBenchmarkSource(benchmarks);
  const resolve = resolveBenchmarkWith(src, geo);
  const computationOutput = await compute(input, resolve);
  console.log(
    `  total underpayment: $${computationOutput.executiveSummary.totalAnnualUnderpayment.toLocaleString()}`
  );
  console.log(
    `  top carrier: ${computationOutput.executiveSummary.topCarrier?.name} ($${computationOutput.executiveSummary.topCarrier?.recoverable.toLocaleString()})`
  );

  // 8. Render the PDF and upload to Supabase storage.
  console.log("Step 8: rendering + uploading PDF...");
  const pdfBuffer = await renderToBuffer(
    React.createElement(ReportDoc, {
      data: computationOutput,
      meta: {
        practiceName: DEMO_PRACTICE_NAME,
        zip5: DEMO_ZIP,
        providerCount: "2-5",
        generatedAt: new Date(),
      },
    })
  );
  await ensureBucket(sb, STORAGE_BUCKET);
  const { error: upErr } = await sb.storage
    .from(STORAGE_BUCKET)
    .upload(STORAGE_PATH, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (upErr) throw upErr;
  const { data: pub } = sb.storage.from(STORAGE_BUCKET).getPublicUrl(STORAGE_PATH);
  const pdfUrl = pub.publicUrl;
  console.log(`  PDF uploaded: ${pdfUrl}`);

  // 9. Insert the report row.
  console.log("Step 9: writing report row...");
  const { error: repErr } = await sb.from("reports").insert({
    practice_id: practice.id,
    computation_output: computationOutput,
    pdf_url: pdfUrl,
    delivered_at: new Date().toISOString(),
  });
  if (repErr) throw repErr;

  console.log("");
  console.log("Finley demo seeded.");
  console.log(`  Log in at /login with ${DEMO_EMAIL} / DEMO_FINLEY_PASSWORD`);
  console.log(`  PDF: ${pdfUrl}`);
}

async function ensureAuthUser(
  sb: ReturnType<typeof createClient>,
  password: string
): Promise<void> {
  // Look for existing user by email. Supabase admin API doesn't have a
  // single-call lookup, so list and filter.
  const { data: list, error: listErr } = await sb.auth.admin.listUsers({
    perPage: 200,
  });
  if (listErr) throw listErr;
  const existing = list.users.find((u) => u.email === DEMO_EMAIL);
  if (existing) {
    // Refresh the password in case DEMO_FINLEY_PASSWORD changed.
    const { error } = await sb.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    if (error) throw error;
    console.log(`  user already exists (id=${existing.id}); password refreshed`);
    return;
  }
  const { error: createErr } = await sb.auth.admin.createUser({
    email: DEMO_EMAIL,
    password,
    email_confirm: true,
  });
  if (createErr) throw createErr;
  console.log("  user created");
}

async function seedStaticLookups(sb: ReturnType<typeof createClient>) {
  // state_to_region
  const regionRows = Object.entries(STATE_TO_REGION).map(([state_code, region]) => ({
    state_code,
    region,
  }));
  await sb.from("state_to_region").upsert(regionRows, { onConflict: "state_code" });

  // zip_to_state / zip_to_metro from fixtures
  const stateRows = Object.entries(ZIP_TO_STATE).map(([zip5, state_code]) => ({
    zip5,
    state_code,
  }));
  await sb.from("zip_to_state").upsert(stateRows, { onConflict: "zip5" });

  const metroRows = Object.entries(ZIP_TO_METRO).map(([zip5, metro_id]) => ({
    zip5,
    metro_id,
  }));
  await sb.from("zip_to_metro").upsert(metroRows, { onConflict: "zip5" });
}

async function seedBenchmarks(sb: ReturnType<typeof createClient>) {
  const fixtureDir = path.join(__dirname, "..", "test-fixtures", "sample-practice");
  const benchmarks: UcrBenchmarkRow[] = JSON.parse(
    fs.readFileSync(path.join(fixtureDir, "benchmarks.json"), "utf8")
  );
  // The fixture uses metro_id "14460" but our zip 02446 -> 14460 lookup
  // already matches, so these go in as-is.
  const { error } = await sb.from("ucr_benchmarks").upsert(benchmarks, {
    onConflict: "geo_level,geo_id,cdt_code,source_version",
  });
  if (error) throw error;
}

async function ensureBucket(
  sb: ReturnType<typeof createClient>,
  name: string
): Promise<void> {
  const { data: buckets } = await sb.storage.listBuckets();
  if (buckets?.some((b) => b.name === name)) return;
  const { error } = await sb.storage.createBucket(name, { public: true });
  if (error && !String(error.message).includes("already exists")) throw error;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
