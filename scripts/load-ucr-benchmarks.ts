#!/usr/bin/env tsx
//
// Load UCR benchmark rows from a CSV file into Supabase. Schema:
//
//   geo_level,geo_id,cdt_code,p50,p75,p90,sample_size,source_version
//
// Validates every row before insert. Reject any row that fails.
//
// Usage:
//   npm run load:ucr -- --file ./data/ada-ucr-2026.csv --dry-run
//   npm run load:ucr -- --file ./data/ada-ucr-2026.csv

import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import { z } from "zod";
import { CDT_REGEX, type UcrBenchmarkRow } from "@/lib/types/pipeline";

const GEO_LEVELS = ["zip3", "metro", "state", "region", "national"] as const;

const RowSchema = z.object({
  geo_level: z.enum(GEO_LEVELS),
  geo_id: z.string().min(1),
  cdt_code: z.string().regex(CDT_REGEX),
  p50: z.coerce.number().positive().max(10000),
  p75: z.coerce.number().positive().max(10000),
  p90: z.coerce.number().positive().max(10000),
  sample_size: z.coerce.number().int().nonnegative(),
  source_version: z.string().min(1),
});

type Args = { file?: string; dryRun: boolean };

function parseArgs(argv: string[]): Args {
  const out: Args = { dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--file") out.file = argv[++i];
    else if (a === "--dry-run") out.dryRun = true;
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file) {
    console.error("Usage: load-ucr-benchmarks --file <ucr.csv> [--dry-run]");
    process.exit(1);
  }

  const buf = fs.readFileSync(path.resolve(args.file), "utf8");
  const parsed = Papa.parse<Record<string, string>>(buf, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const valid: UcrBenchmarkRow[] = [];
  const errors: { line: number; reason: string }[] = [];

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i];
    const result = RowSchema.safeParse(row);
    if (!result.success) {
      errors.push({
        line: i + 2,
        reason: result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "),
      });
      continue;
    }
    const v = result.data;
    if (!(v.p50 <= v.p75 && v.p75 <= v.p90)) {
      errors.push({ line: i + 2, reason: "percentiles out of order" });
      continue;
    }
    valid.push(v as UcrBenchmarkRow);
  }

  console.log(`Parsed: ${parsed.data.length} rows`);
  console.log(`Valid:  ${valid.length}`);
  console.log(`Errors: ${errors.length}`);
  for (const e of errors.slice(0, 10)) {
    console.log(`  line ${e.line}: ${e.reason}`);
  }
  if (errors.length > 10) {
    console.log(`  ...and ${errors.length - 10} more`);
  }

  if (errors.length > 0) {
    console.log(
      "\nReject any file with validation errors. Fix the source CSV before loading."
    );
  }

  if (args.dryRun) {
    console.log("\nDry-run: no inserts performed.");
    return;
  }

  if (errors.length > 0) {
    console.error("Aborting: validation errors must be resolved first.");
    process.exit(1);
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars required for live load."
    );
    process.exit(1);
  }

  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(url, key, { auth: { persistSession: false } });

  for (const c of chunk(valid, 1000)) {
    const { error } = await sb.from("ucr_benchmarks").upsert(c, {
      onConflict: "geo_level,geo_id,cdt_code,source_version",
    });
    if (error) throw error;
  }
  console.log(`Inserted ${valid.length} benchmark rows.`);
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
