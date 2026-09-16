#!/usr/bin/env tsx
//
// Load the NDAS 2026 fee source into Supabase. NDAS ships two tables, not
// pre-computed regional percentiles:
//
//   NMAS.csv:      CODE,Int,SeqOrder,P40,P50,P60,P70,P80,P90,P95,DESC,NOTES
//                  (national percentiles per CDT code)
//   ZIPVALS_24.csv: ZIP3,ZIP,STATE,CITY,GEO_N,available
//                  (per-zip5 geographic adjustment factor)
//
// This writes:
//   - raw 1:1 rows into staging_ndas_nmas / staging_ndas_zipvals (audit trail)
//   - one national row per code into ucr_benchmarks (geo_level='national')
//   - one row per zip5 into zip_geo_factors
// resolve.ts multiplies national x geo_factor at lookup time for geo_level
// 'zip5' rather than materializing every (zip5, code) pair.
//
// Usage:
//   npm run load:ndas -- --nmas ./data/NMAS.csv --zipvals ./data/ZIPVALS_24.csv --dry-run
//   npm run load:ndas -- --nmas ./data/NMAS.csv --zipvals ./data/ZIPVALS_24.csv --source-version ndas_2026

import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import { z } from "zod";
import { CDT_REGEX } from "@/lib/types/pipeline";

// NDAS is a computed schedule, not a survey: there's no real sample_size.
// Use a fixed placeholder well above resolveBenchmark's SAMPLE_FLOOR (30) so
// these rows aren't skipped, and rely on source_version to trace provenance.
const NDAS_SAMPLE_SIZE_PLACEHOLDER = 500;

const NmasRowSchema = z.object({
  code: z.string().regex(CDT_REGEX),
  seqorder: z.coerce.number().int().optional(),
  p40: z.coerce.number().positive().max(10000),
  p50: z.coerce.number().positive().max(10000),
  p60: z.coerce.number().positive().max(10000),
  p70: z.coerce.number().positive().max(10000),
  p80: z.coerce.number().positive().max(10000),
  p90: z.coerce.number().positive().max(10000),
  p95: z.coerce.number().positive().max(10000),
  desc: z.string().min(1),
  notes: z.string().optional(),
});

const ZipRowSchema = z.object({
  zip: z.string().regex(/^\d{5}$/),
  state: z.string().optional(),
  city: z.string().optional(),
  geo_n: z.coerce.number().positive().max(10),
});

type Args = { nmas?: string; zipvals?: string; sourceVersion: string; dryRun: boolean };

function parseArgs(argv: string[]): Args {
  const out: Args = { sourceVersion: "ndas_2026", dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--nmas") out.nmas = argv[++i];
    else if (a === "--zipvals") out.zipvals = argv[++i];
    else if (a === "--source-version") out.sourceVersion = argv[++i];
    else if (a === "--dry-run") out.dryRun = true;
  }
  return out;
}

function parseCsv(file: string) {
  const buf = fs.readFileSync(path.resolve(file), "utf8");
  return Papa.parse<Record<string, string>>(buf, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  }).data;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.nmas || !args.zipvals) {
    console.error(
      "Usage: load-ndas-source --nmas <NMAS.csv> --zipvals <ZIPVALS.csv> [--source-version ndas_2026] [--dry-run]"
    );
    process.exit(1);
  }

  const nmasRows = parseCsv(args.nmas);
  const zipRows = parseCsv(args.zipvals);

  const validNmas: z.infer<typeof NmasRowSchema>[] = [];
  const nmasErrors: { line: number; reason: string }[] = [];
  for (let i = 0; i < nmasRows.length; i++) {
    const result = NmasRowSchema.safeParse(nmasRows[i]);
    if (!result.success) {
      nmasErrors.push({
        line: i + 2,
        reason: result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "),
      });
      continue;
    }
    validNmas.push(result.data);
  }

  const validZips: z.infer<typeof ZipRowSchema>[] = [];
  const zipErrors: { line: number; reason: string }[] = [];
  for (let i = 0; i < zipRows.length; i++) {
    const result = ZipRowSchema.safeParse(zipRows[i]);
    if (!result.success) {
      // The NDAS national placeholder row (ZIP="*****") is expected to fail
      // the 5-digit check; every other failure is a real problem.
      if (zipRows[i].zip !== "*****") {
        zipErrors.push({
          line: i + 2,
          reason: result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "),
        });
      }
      continue;
    }
    validZips.push(result.data);
  }

  console.log(`NMAS:    parsed ${nmasRows.length}, valid ${validNmas.length}, errors ${nmasErrors.length}`);
  for (const e of nmasErrors.slice(0, 10)) console.log(`  line ${e.line}: ${e.reason}`);
  console.log(`ZIPVALS: parsed ${zipRows.length}, valid ${validZips.length}, errors ${zipErrors.length}`);
  for (const e of zipErrors.slice(0, 10)) console.log(`  line ${e.line}: ${e.reason}`);

  if (nmasErrors.length > 0 || zipErrors.length > 0) {
    console.error("\nAborting: fix the source CSVs before loading.");
    process.exit(1);
  }

  if (args.dryRun) {
    console.log("\nDry-run: no inserts performed.");
    return;
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars required for live load.");
    process.exit(1);
  }

  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const stagingNmas = validNmas.map((r) => ({
    code: r.code,
    seq_order: r.seqorder ?? null,
    p40: r.p40,
    p50: r.p50,
    p60: r.p60,
    p70: r.p70,
    p80: r.p80,
    p90: r.p90,
    p95: r.p95,
    description: r.desc,
    notes: r.notes ?? null,
    source_version: args.sourceVersion,
  }));
  const nationalRows = validNmas.map((r) => ({
    geo_level: "national" as const,
    geo_id: "US",
    cdt_code: r.code,
    p50: r.p50,
    // NDAS doesn't ship a p75 percentile (only P40/50/60/70/80/90/95); take
    // the midpoint of the surrounding P70/P80 buckets.
    p75: (r.p70 + r.p80) / 2,
    p90: r.p90,
    sample_size: NDAS_SAMPLE_SIZE_PLACEHOLDER,
    source_version: args.sourceVersion,
  }));

  const stagingZips = validZips.map((r) => ({
    zip5: r.zip,
    state: r.state ?? null,
    city: r.city ?? null,
    geo_factor: r.geo_n,
    available: null,
    source_version: args.sourceVersion,
  }));
  const factorRows = validZips.map((r) => ({
    zip5: r.zip,
    geo_factor: r.geo_n,
    source_version: args.sourceVersion,
  }));

  for (const c of chunk(stagingNmas, 1000)) {
    const { error } = await sb.from("staging_ndas_nmas").upsert(c, { onConflict: "code" });
    if (error) throw error;
  }
  for (const c of chunk(nationalRows, 1000)) {
    const { error } = await sb
      .from("ucr_benchmarks")
      .upsert(c, { onConflict: "geo_level,geo_id,cdt_code,source_version" });
    if (error) throw error;
  }
  for (const c of chunk(stagingZips, 1000)) {
    const { error } = await sb.from("staging_ndas_zipvals").upsert(c, { onConflict: "zip5" });
    if (error) throw error;
  }
  for (const c of chunk(factorRows, 1000)) {
    const { error } = await sb.from("zip_geo_factors").upsert(c, { onConflict: "zip5" });
    if (error) throw error;
  }

  console.log(
    `Inserted ${nationalRows.length} national benchmark rows and ${factorRows.length} zip geo factors.`
  );
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
