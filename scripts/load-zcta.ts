#!/usr/bin/env tsx
//
// Load the full Census ZCTA-to-state and ZCTA-to-CBSA crosswalks into
// Supabase. Expects two CSV inputs that you download manually from:
//
//   ZCTA -> County: https://www.census.gov/geographies/reference-files/time-series/geo/relationship-files.html
//     Search "ZCTA to County Relationship File"
//
//   County -> CBSA: https://www.census.gov/geographies/reference-files/time-series/demo/metro-micro/delineation-files.html
//
// Or use the HUD USPS-to-CBSA crosswalk (single file, needs registration).
//
// Usage:
//   npm run load:zcta -- --zips ./data/zcta.csv --metros ./data/cbsa.csv --dry-run
//   npm run load:zcta -- --zips ./data/zcta.csv --metros ./data/cbsa.csv
//
// The dry-run reports parse + validation results without writing.

import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";

type Args = {
  zips?: string;
  metros?: string;
  dryRun: boolean;
};

function parseArgs(argv: string[]): Args {
  const out: Args = { dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--zips") out.zips = argv[++i];
    else if (a === "--metros") out.metros = argv[++i];
    else if (a === "--dry-run") out.dryRun = true;
  }
  return out;
}

type ZcsRow = { zip5: string; state_code: string };
type MetroRow = { zip5: string; metro_id: string };

function readCsv<T extends Record<string, unknown>>(file: string): T[] {
  const buf = fs.readFileSync(path.resolve(file), "utf8");
  const result = Papa.parse<T>(buf, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });
  if (result.errors.length) {
    console.error(`CSV errors in ${file}: ${result.errors.length}`);
  }
  return result.data;
}

function pickField(row: Record<string, unknown>, candidates: string[]): string {
  for (const c of candidates) {
    const v = row[c];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.zips || !args.metros) {
    console.error("Usage: load-zcta --zips <zcta.csv> --metros <cbsa.csv> [--dry-run]");
    process.exit(1);
  }

  const zipsRaw = readCsv<Record<string, string>>(args.zips);
  const metrosRaw = readCsv<Record<string, string>>(args.metros);

  const zipState: ZcsRow[] = [];
  const zipMetro: MetroRow[] = [];
  const errors: string[] = [];

  for (const row of zipsRaw) {
    const zip = pickField(row, ["zcta5", "zip5", "zip", "zip_code"]);
    const state = pickField(row, ["state", "state_code", "stusab"]).toUpperCase();
    if (!/^\d{5}$/.test(zip)) {
      errors.push(`Bad zip: ${JSON.stringify(row).slice(0, 80)}`);
      continue;
    }
    if (!/^[A-Z]{2}$/.test(state)) {
      errors.push(`Bad state for ${zip}: ${state}`);
      continue;
    }
    zipState.push({ zip5: zip, state_code: state });
  }

  for (const row of metrosRaw) {
    const zip = pickField(row, ["zcta5", "zip5", "zip", "zip_code"]);
    const metro = pickField(row, ["cbsa", "cbsa_code", "metro_id", "msa"]);
    if (!/^\d{5}$/.test(zip)) continue;
    if (!metro || metro === "99999") continue; // non-metro
    zipMetro.push({ zip5: zip, metro_id: metro });
  }

  console.log(`Parsed ${zipState.length} zip→state rows`);
  console.log(`Parsed ${zipMetro.length} zip→metro rows (non-metro zips dropped)`);
  if (errors.length) {
    console.log(`Validation errors: ${errors.length}`);
    for (const e of errors.slice(0, 5)) console.log(`  ${e}`);
    if (errors.length > 5) console.log(`  ...and ${errors.length - 5} more`);
  }

  if (args.dryRun) {
    console.log("Dry-run: no inserts performed.");
    return;
  }

  // Real insert path requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars required for live load."
    );
    process.exit(1);
  }

  // Lazy import so this script runs with --dry-run before deps are installed.
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const chunks = chunk(zipState, 1000);
  for (const c of chunks) {
    const { error } = await sb.from("zip_to_state").upsert(c, { onConflict: "zip5" });
    if (error) throw error;
  }
  for (const c of chunk(zipMetro, 1000)) {
    const { error } = await sb.from("zip_to_metro").upsert(c, { onConflict: "zip5" });
    if (error) throw error;
  }
  console.log("Done.");
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
