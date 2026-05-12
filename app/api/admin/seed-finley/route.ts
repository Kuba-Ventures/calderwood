// Admin endpoint: seed the finley@qsbsrollover.com demo account.
// Gated by ADMIN_PASSWORD env var (Authorization: Bearer <password>).
//
// Prereq: the SQL migrations (supabase/migrations/*.sql) must already be
// applied to the project. Paste them into the Supabase SQL Editor first,
// then hit this endpoint.
//
// curl example:
//   curl -X POST https://calderwood.vercel.app/api/admin/seed-finley \
//     -H "Authorization: Bearer $ADMIN_PASSWORD"
//
// Idempotent: re-hitting deletes + rebuilds the practice rows. Auth user
// stays in place.

import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@supabase/supabase-js";
import { ReportDoc } from "@/components/report/report-doc";
import { compute } from "@/lib/computation/compute";
import {
  InMemoryBenchmarkSource,
  InMemoryGeoResolver,
  resolveBenchmarkWith,
} from "@/lib/benchmark/resolve";
import { STATE_TO_REGION } from "@/lib/seed/state-to-region";
import { ZIP_TO_METRO, ZIP_TO_STATE } from "@/lib/data/zip-fixtures";
import type {
  ComputationInput,
  UcrBenchmarkRow,
} from "@/lib/types/pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEMO_EMAIL = "finley@qsbsrollover.com";
const DEMO_PRACTICE_NAME = "Underwood Family Dental";
const DEMO_ZIP = "02446";
const STORAGE_BUCKET = "reports";
const STORAGE_PATH = "finley-demo.pdf";

export async function POST(request: Request) {
  const admin = process.env.ADMIN_PASSWORD;
  if (!admin) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD not configured" },
      { status: 500 }
    );
  }
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : auth;
  if (token !== admin) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const demoPassword = process.env.DEMO_FINLEY_PASSWORD;
  if (!url || !serviceKey || !demoPassword) {
    return NextResponse.json(
      {
        error:
          "missing one of: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEMO_FINLEY_PASSWORD",
      },
      { status: 500 }
    );
  }

  const sb = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const steps: string[] = [];
  try {
    // 1. Auth user
    const { data: list } = await sb.auth.admin.listUsers({ perPage: 200 });
    const existing = list.users.find((u) => u.email === DEMO_EMAIL);
    if (existing) {
      await sb.auth.admin.updateUserById(existing.id, {
        password: demoPassword,
        email_confirm: true,
      });
      steps.push(`auth user exists (${existing.id}), password refreshed`);
    } else {
      const { error } = await sb.auth.admin.createUser({
        email: DEMO_EMAIL,
        password: demoPassword,
        email_confirm: true,
      });
      if (error) throw new Error(`createUser: ${error.message}`);
      steps.push("auth user created");
    }

    // 2. Static lookups + benchmarks
    await seedStaticLookups(sb);
    await seedBenchmarks(sb);
    steps.push("static lookups + benchmarks upserted");

    // 3. Tear down prior practice data
    const { error: delErr } = await sb
      .from("practices")
      .delete()
      .eq("email", DEMO_EMAIL);
    if (delErr) throw new Error(`delete practices: ${delErr.message}`);
    steps.push("prior practice rows cleared");

    // 4. Practice row
    const input = readFixture<ComputationInput>("input.json");
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
    if (pracErr) throw new Error(`insert practice: ${pracErr.message}`);
    steps.push(`practice inserted (${practice.id})`);

    // 5. Fee schedules
    const scheduleRows: Array<Record<string, unknown>> = [
      {
        practice_id: practice.id,
        schedule_type: "master",
        carrier: null,
        raw_file_url: null,
        parsed_data: input.masterSchedule,
        parse_confidence: "high",
        parse_notes: "seeded",
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
    const { error: schedErr } = await sb
      .from("fee_schedules")
      .insert(scheduleRows);
    if (schedErr) throw new Error(`insert fee_schedules: ${schedErr.message}`);
    steps.push(`${scheduleRows.length} fee schedules inserted`);

    // 6. Frequencies
    const freqRows = Object.entries(input.frequencies).map(([code, freq]) => ({
      practice_id: practice.id,
      cdt_code: code,
      annual_frequency: freq,
    }));
    const { error: freqErr } = await sb
      .from("frequency_data")
      .insert(freqRows);
    if (freqErr) throw new Error(`insert frequency_data: ${freqErr.message}`);
    steps.push(`${freqRows.length} frequency rows inserted`);

    // 7. Compute
    const benchmarks = readFixture<UcrBenchmarkRow[]>("benchmarks.json");
    const geo = new InMemoryGeoResolver(
      ZIP_TO_STATE,
      ZIP_TO_METRO,
      STATE_TO_REGION
    );
    const src = new InMemoryBenchmarkSource(benchmarks);
    const resolve = resolveBenchmarkWith(src, geo);
    const computationOutput = await compute(input, resolve);
    steps.push(
      `computed: $${computationOutput.executiveSummary.totalAnnualUnderpayment.toLocaleString()} total, top=${computationOutput.executiveSummary.topCarrier?.name}`
    );

    // 8. PDF + upload
    const reportElement = React.createElement(ReportDoc, {
      data: computationOutput,
      meta: {
        practiceName: DEMO_PRACTICE_NAME,
        zip5: DEMO_ZIP,
        providerCount: "2-5",
        generatedAt: new Date(),
      },
    }) as any;
    const pdfBuffer = await renderToBuffer(reportElement);
    await ensureBucket(sb, STORAGE_BUCKET);
    const { error: upErr } = await sb.storage
      .from(STORAGE_BUCKET)
      .upload(STORAGE_PATH, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });
    if (upErr) throw new Error(`storage upload: ${upErr.message}`);
    const { data: pub } = sb.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(STORAGE_PATH);
    const pdfUrl = pub.publicUrl;
    steps.push(`PDF uploaded to ${pdfUrl}`);

    // 9. Report row
    const { error: repErr } = await sb.from("reports").insert({
      practice_id: practice.id,
      computation_output: computationOutput,
      pdf_url: pdfUrl,
      delivered_at: new Date().toISOString(),
    });
    if (repErr) throw new Error(`insert report: ${repErr.message}`);
    steps.push("report row written");

    return NextResponse.json({
      ok: true,
      message: `Seeded ${DEMO_EMAIL}.`,
      pdfUrl,
      steps,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        stepsCompleted: steps,
      },
      { status: 500 }
    );
  }
}

function readFixture<T>(name: string): T {
  const p = path.join(
    process.cwd(),
    "test-fixtures",
    "sample-practice",
    name
  );
  return JSON.parse(fs.readFileSync(p, "utf8")) as T;
}

async function seedStaticLookups(sb: any) {
  const regionRows = Object.entries(STATE_TO_REGION).map(
    ([state_code, region]) => ({ state_code, region })
  );
  await sb
    .from("state_to_region")
    .upsert(regionRows, { onConflict: "state_code" });
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

async function seedBenchmarks(sb: any) {
  const benchmarks = readFixture<UcrBenchmarkRow[]>("benchmarks.json");
  await sb.from("ucr_benchmarks").upsert(benchmarks, {
    onConflict: "geo_level,geo_id,cdt_code,source_version",
  });
}

async function ensureBucket(sb: any, name: string) {
  const { data: buckets } = await sb.storage.listBuckets();
  if (buckets?.some((b: { name: string }) => b.name === name)) return;
  await sb.storage.createBucket(name, { public: true });
}
