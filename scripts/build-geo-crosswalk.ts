#!/usr/bin/env tsx
//
// Build the ZIP -> state and ZIP -> metro (CBSA) crosswalks that
// scripts/load-zcta.ts loads into Supabase, from public government sources
// only. Nothing here comes from a licensed data vendor.
//
// Sources:
//   Census 2020 ZCTA-to-County relationship file  (ZCTA5 -> county GEOID)
//   OMB/Census CBSA delineation list 1, July 2023 (county -> CBSA code)
//
// A ZIP's state comes from the first two digits of its county GEOID (the
// state FIPS code). A ZIP's metro comes from its county's CBSA, keeping only
// Metropolitan Statistical Areas -- Micropolitan areas are rural by
// definition and are better served by the state level of the cascade.
//
// A ZCTA can straddle counties. The county contributing the most land area
// to the ZCTA wins, which is the standard tie-break for this file.
//
// Usage:
//   npm run geo:build -- --download --outdir ./data
//   npm run geo:build -- --zcta ./data/zcta_county.txt --cbsa ./data/list1.xlsx --outdir ./data
//
// Then load with:
//   npm run load:zcta -- --zips ./data/zcta.csv --metros ./data/cbsa.csv

import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";

const ZCTA_URL =
  "https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt";
const CBSA_URL =
  "https://www2.census.gov/programs-surveys/metro-micro/geographies/reference-files/2023/delineation-files/list1_2023.xlsx";

// FIPS state code -> USPS abbreviation. Stable public reference data.
const FIPS_TO_USPS: Record<string, string> = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO",
  "09": "CT", "10": "DE", "11": "DC", "12": "FL", "13": "GA", "15": "HI",
  "16": "ID", "17": "IL", "18": "IN", "19": "IA", "20": "KS", "21": "KY",
  "22": "LA", "23": "ME", "24": "MD", "25": "MA", "26": "MI", "27": "MN",
  "28": "MS", "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH",
  "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND", "39": "OH",
  "40": "OK", "41": "OR", "42": "PA", "44": "RI", "45": "SC", "46": "SD",
  "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA",
  "54": "WV", "55": "WI", "56": "WY", "60": "AS", "66": "GU", "69": "MP",
  "72": "PR", "78": "VI",
};

type Args = { zcta?: string; cbsa?: string; outdir: string; download: boolean };

function parseArgs(argv: string[]): Args {
  const out: Args = { outdir: "./data", download: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--zcta") out.zcta = argv[++i];
    else if (a === "--cbsa") out.cbsa = argv[++i];
    else if (a === "--outdir") out.outdir = argv[++i];
    else if (a === "--download") out.download = true;
  }
  return out;
}

async function download(url: string, dest: string) {
  console.log(`Downloading ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  console.log(`  -> ${dest}`);
}

/** county GEOID -> CBSA code, Metropolitan Statistical Areas only. */
function readCountyToCbsa(file: string) {
  const wb = XLSX.readFile(file);
  const rows = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[wb.SheetNames[0]], {
    header: 1,
    raw: false,
  });

  // Row 3 (0-indexed 2) carries the column headers; data starts after it.
  const header = rows.findIndex((r) => (r ?? []).includes("CBSA Code"));
  if (header < 0) throw new Error("Could not find the header row in the CBSA file");
  const col = (name: string) => rows[header].indexOf(name);

  const cCbsa = col("CBSA Code");
  const cType = col("Metropolitan/Micropolitan Statistical Area");
  const cStateFips = col("FIPS State Code");
  const cCountyFips = col("FIPS County Code");

  const map = new Map<string, string>();
  for (let i = header + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    const cbsa = (r[cCbsa] ?? "").trim();
    const type = (r[cType] ?? "").trim();
    const sf = (r[cStateFips] ?? "").trim().padStart(2, "0");
    const cf = (r[cCountyFips] ?? "").trim().padStart(3, "0");
    if (!/^\d{5}$/.test(cbsa)) continue;
    if (!type.startsWith("Metropolitan")) continue; // drop Micropolitan
    if (!/^\d{2}$/.test(sf) || !/^\d{3}$/.test(cf)) continue;
    map.set(sf + cf, cbsa);
  }
  return map;
}

/** ZCTA5 -> best county GEOID, chosen by shared land area. */
function readZctaToCounty(file: string) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  const header = (lines[0] ?? "").replace(/^﻿/, "").split("|");
  const iZcta = header.indexOf("GEOID_ZCTA5_20");
  const iCounty = header.indexOf("GEOID_COUNTY_20");
  const iArea = header.indexOf("AREALAND_PART");
  if (iZcta < 0 || iCounty < 0) {
    throw new Error("Unexpected column layout in the ZCTA relationship file");
  }

  const best = new Map<string, { county: string; area: number }>();
  for (let i = 1; i < lines.length; i++) {
    const f = lines[i].split("|");
    const zcta = (f[iZcta] ?? "").trim();
    const county = (f[iCounty] ?? "").trim();
    if (!/^\d{5}$/.test(zcta) || !/^\d{5}$/.test(county)) continue;
    const area = Number(f[iArea] ?? 0) || 0;
    const prev = best.get(zcta);
    if (!prev || area > prev.area) best.set(zcta, { county, area });
  }
  return best;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outdir = path.resolve(args.outdir);
  fs.mkdirSync(outdir, { recursive: true });

  let zctaFile = args.zcta;
  let cbsaFile = args.cbsa;

  if (args.download) {
    zctaFile = path.join(outdir, "zcta_county.txt");
    cbsaFile = path.join(outdir, "cbsa_list1.xlsx");
    await download(ZCTA_URL, zctaFile);
    await download(CBSA_URL, cbsaFile);
  }

  if (!zctaFile || !cbsaFile) {
    console.error(
      "Usage: build-geo-crosswalk --download --outdir ./data\n" +
        "   or: build-geo-crosswalk --zcta <file> --cbsa <file> --outdir ./data"
    );
    process.exit(1);
  }

  const zctaToCounty = readZctaToCounty(path.resolve(zctaFile));
  const countyToCbsa = readCountyToCbsa(path.resolve(cbsaFile));
  console.log(`ZCTAs: ${zctaToCounty.size}`);
  console.log(`Counties in a Metropolitan Statistical Area: ${countyToCbsa.size}`);

  const stateRows = ["zip5,state_code"];
  const metroRows = ["zip5,cbsa"];
  const unmappedFips = new Set<string>();

  for (const [zip, { county }] of [...zctaToCounty].sort()) {
    const usps = FIPS_TO_USPS[county.slice(0, 2)];
    if (!usps) {
      unmappedFips.add(county.slice(0, 2));
      continue;
    }
    stateRows.push(`${zip},${usps}`);
    const cbsa = countyToCbsa.get(county);
    if (cbsa) metroRows.push(`${zip},${cbsa}`);
  }

  if (unmappedFips.size) {
    console.log(`Unrecognized state FIPS codes skipped: ${[...unmappedFips].join(", ")}`);
  }

  const zipPath = path.join(outdir, "zcta.csv");
  const metroPath = path.join(outdir, "cbsa.csv");
  fs.writeFileSync(zipPath, stateRows.join("\n") + "\n", "utf8");
  fs.writeFileSync(metroPath, metroRows.join("\n") + "\n", "utf8");

  console.log(`\nWrote ${stateRows.length - 1} zip->state rows to ${zipPath}`);
  console.log(`Wrote ${metroRows.length - 1} zip->metro rows to ${metroPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
