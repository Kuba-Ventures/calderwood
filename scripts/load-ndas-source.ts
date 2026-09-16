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
// Optionally also loads --headings (Codes,RngCode,Org,In,Header: CDT code
// ranges to category labels) to populate cdt_codes.category. PROCODEN.csv
// is NOT a separate input here: it's exactly NMAS with the category-divider
// rows stripped out (same 853 = 758 priced + 95 IR codes, identical values
// on every overlapping code), so it adds no information NMAS doesn't
// already have. cdt_codes.description is sourced from NMAS's NOMEN field.
//
// This writes:
//   - raw 1:1 rows into staging_ndas_nmas / staging_ndas_zipvals (audit trail)
//   - one national row per code into ucr_benchmarks (geo_level='national')
//   - one row per zip5 into zip_geo_factors
//   - one row per code into cdt_codes (description + category), if --headings given
// resolve.ts multiplies national x geo_factor at lookup time for geo_level
// 'zip5' rather than materializing every (zip5, code) pair.
//
// Usage:
//   npm run load:ndas -- --nmas ./data/NMAS.csv --zipvals ./data/ZIPVALS_24.csv --dry-run
//   npm run load:ndas -- --nmas ./data/NMAS.csv --zipvals ./data/ZIPVALS_24.csv --headings ./data/headings.csv --source-version ndas_2026

import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import { z } from "zod";
import { CDT_REGEX } from "@/lib/types/pipeline";

// NDAS is a computed schedule, not a survey: there's no real sample_size.
// Use a fixed placeholder well above resolveBenchmark's SAMPLE_FLOOR (30) so
// these rows aren't skipped, and rely on source_version to trace provenance.
const NDAS_SAMPLE_SIZE_PLACEHOLDER = 500;

// NMAS.csv columns: CDTINDEX,A,Code,ORDER,IN,INT2,NOMEN,Note,P40..P95
// (NOMEN/Note hold what other NDAS tables call DESC/NOTES).
//
// The file mixes three row shapes, not one:
//  - category-divider rows with no CDT code (e.g. "IMAGE CAPTURE ONLY") -- not
//    data, skipped silently.
//  - real codes NDAS marks "IR" (Individually Rated) on every percentile --
//    NDAS's own way of saying "no statistical percentile for this code".
//    Kept in staging for the code/description, but no national benchmark row.
//  - real codes with real percentiles. Complex surgical/prosthetic codes run
//    well past $10k (max observed: $22,808 for D7949), so the bound here is
//    set generously rather than at the $10k cap used for typical UCR data.
const PERCENTILE_MAX = 30000;
const PRICE_FIELDS = ["p40", "p50", "p60", "p70", "p80", "p90", "p95"] as const;

const CodedRowSchema = z.object({
  code: z.string().regex(CDT_REGEX),
  cdtindex: z.coerce.number().int().optional(),
  nomen: z.string().min(1),
  note: z.string().optional(),
});
const NmasRowSchema = CodedRowSchema.extend({
  p40: z.coerce.number().positive().max(PERCENTILE_MAX),
  p50: z.coerce.number().positive().max(PERCENTILE_MAX),
  p60: z.coerce.number().positive().max(PERCENTILE_MAX),
  p70: z.coerce.number().positive().max(PERCENTILE_MAX),
  p80: z.coerce.number().positive().max(PERCENTILE_MAX),
  p90: z.coerce.number().positive().max(PERCENTILE_MAX),
  p95: z.coerce.number().positive().max(PERCENTILE_MAX),
});

const ZipRowSchema = z.object({
  zip: z.string().regex(/^\d{5}$/),
  state: z.string().optional(),
  city: z.string().optional(),
  geo_n: z.coerce.number().positive().max(10),
});

// headings.csv: Codes,RngCode,Org,In,Header. Only the 12 top-level ("H")
// ranges are used for cdt_codes.category -- the ~77 "N" rows are finer
// sub-headings (e.g. "CLINICAL ORAL EVALUATIONS") that don't fit the
// schema's single category column.
const HeadingRowSchema = z.object({
  codes: z.string().regex(CDT_REGEX),
  rngcode: z.string().regex(CDT_REGEX),
  org: z.string(),
  header: z.string().min(1),
});

type Args = {
  nmas?: string;
  zipvals?: string;
  headings?: string;
  sourceVersion: string;
  dryRun: boolean;
};

function parseArgs(argv: string[]): Args {
  const out: Args = { sourceVersion: "ndas_2026", dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--nmas") out.nmas = argv[++i];
    else if (a === "--zipvals") out.zipvals = argv[++i];
    else if (a === "--headings") out.headings = argv[++i];
    else if (a === "--source-version") out.sourceVersion = argv[++i];
    else if (a === "--dry-run") out.dryRun = true;
  }
  return out;
}

function categoryFor(
  code: string,
  ranges: { codes: string; rngcode: string; header: string }[]
): string | null {
  const match = ranges.find((r) => code >= r.codes && code <= r.rngcode);
  return match?.header ?? null;
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

  const pricedNmas: z.infer<typeof NmasRowSchema>[] = [];
  const irNmas: z.infer<typeof CodedRowSchema>[] = [];
  let headerRowCount = 0;
  const nmasErrors: { line: number; reason: string }[] = [];
  for (let i = 0; i < nmasRows.length; i++) {
    const row = nmasRows[i];
    if (!row.code || !CDT_REGEX.test(row.code)) {
      headerRowCount++;
      continue;
    }
    if (PRICE_FIELDS.some((f) => row[f] === "IR")) {
      const result = CodedRowSchema.safeParse(row);
      if (!result.success) {
        nmasErrors.push({
          line: i + 2,
          reason: result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "),
        });
        continue;
      }
      irNmas.push(result.data);
      continue;
    }
    const result = NmasRowSchema.safeParse(row);
    if (!result.success) {
      nmasErrors.push({
        line: i + 2,
        reason: result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "),
      });
      continue;
    }
    pricedNmas.push(result.data);
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

  console.log(
    `NMAS:    parsed ${nmasRows.length}, priced ${pricedNmas.length}, individually-rated (no benchmark) ${irNmas.length}, ` +
      `header/divider rows skipped ${headerRowCount}, errors ${nmasErrors.length}`
  );
  for (const e of nmasErrors.slice(0, 10)) console.log(`  line ${e.line}: ${e.reason}`);
  console.log(`ZIPVALS: parsed ${zipRows.length}, valid ${validZips.length}, errors ${zipErrors.length}`);
  for (const e of zipErrors.slice(0, 10)) console.log(`  line ${e.line}: ${e.reason}`);

  let categoryRanges: z.infer<typeof HeadingRowSchema>[] = [];
  const headingErrors: { line: number; reason: string }[] = [];
  if (args.headings) {
    const headingRows = parseCsv(args.headings);
    for (let i = 0; i < headingRows.length; i++) {
      const result = HeadingRowSchema.safeParse(headingRows[i]);
      if (!result.success) {
        headingErrors.push({
          line: i + 2,
          reason: result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "),
        });
        continue;
      }
      if (result.data.org === "H") categoryRanges.push(result.data);
    }
    const codesWithoutCategory = [...pricedNmas, ...irNmas].filter(
      (r) => !categoryFor(r.code, categoryRanges)
    );
    console.log(
      `HEADINGS: parsed ${headingRows.length}, top-level category ranges ${categoryRanges.length}, errors ${headingErrors.length}, ` +
        `codes with no matching category ${codesWithoutCategory.length}`
    );
    for (const e of headingErrors.slice(0, 10)) console.log(`  line ${e.line}: ${e.reason}`);
    for (const r of codesWithoutCategory.slice(0, 10)) console.log(`  no category for ${r.code}`);
  }

  if (nmasErrors.length > 0 || zipErrors.length > 0 || headingErrors.length > 0) {
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

  const stagingNmas = [
    ...pricedNmas.map((r) => ({
      code: r.code,
      seq_order: r.cdtindex ?? null,
      p40: r.p40,
      p50: r.p50,
      p60: r.p60,
      p70: r.p70,
      p80: r.p80,
      p90: r.p90,
      p95: r.p95,
      description: r.nomen,
      notes: r.note ?? null,
      source_version: args.sourceVersion,
    })),
    // Individually-rated codes: kept for the code/description, no percentiles.
    ...irNmas.map((r) => ({
      code: r.code,
      seq_order: r.cdtindex ?? null,
      p40: null,
      p50: null,
      p60: null,
      p70: null,
      p80: null,
      p90: null,
      p95: null,
      description: r.nomen,
      notes: r.note ?? null,
      source_version: args.sourceVersion,
    })),
  ];
  const nationalRows = pricedNmas.map((r) => ({
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

  let cdtCodeCount = 0;
  if (args.headings) {
    const cdtCodeRows = [...pricedNmas, ...irNmas].map((r) => ({
      code: r.code,
      description: r.nomen,
      category: categoryFor(r.code, categoryRanges),
    }));
    for (const c of chunk(cdtCodeRows, 1000)) {
      const { error } = await sb.from("cdt_codes").upsert(c, { onConflict: "code" });
      if (error) throw error;
    }
    cdtCodeCount = cdtCodeRows.length;
  }

  console.log(
    `Inserted ${nationalRows.length} national benchmark rows, ${factorRows.length} zip geo factors, ` +
      `and ${cdtCodeCount} cdt_codes rows.`
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
