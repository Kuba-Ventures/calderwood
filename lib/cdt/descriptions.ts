// Code labels for report rendering.
//
// Three sources, in order of preference for any one code:
//
//   1. lib/seed/cdt-codes.ts -- ~50 hand-written short labels covering the
//      highest-volume codes. Written to fit a table column ("Crown,
//      porcelain/ceramic"), so they beat the official wording on the codes
//      that dominate most reports.
//   2. the cdt_codes table -- full ADA nomenclature for every code the fee
//      source ships, which is the only thing that covers the long tail.
//   3. the bare code, if a practice bills something neither source knows.
//
// Without step 2 a report showed "D7210" with no words next to a dollar
// figure, which is exactly the opposite of what this audience needs.

import type { SupabaseClient } from "@supabase/supabase-js";
import { CDT_BY_CODE } from "@/lib/seed/cdt-codes";

export type DescribeCode = (code: string) => string;

// PostgREST caps a response at 1000 rows, so page explicitly rather than
// assuming one request returns the whole table.
const PAGE_SIZE = 1000;

/** ADA nomenclature ships all-lowercase; sentence case reads better in a report. */
export function sentenceCase(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  return trimmed[0].toUpperCase() + trimmed.slice(1);
}

/**
 * Read every cdt_codes row once and return a synchronous lookup. Fetching up
 * front keeps compute() free of per-code I/O: it stays a pure function of its
 * inputs plus the two things injected into it.
 */
export async function loadCdtDescriptions(
  sb: SupabaseClient
): Promise<DescribeCode> {
  const fromDb = new Map<string, string>();

  for (let page = 0; ; page++) {
    const { data, error } = await sb
      .from("cdt_codes")
      .select("code, description")
      .order("code")
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) throw error;
    const rows = (data ?? []) as { code: string; description: string | null }[];
    for (const row of rows) {
      if (row.description) fromDb.set(row.code, sentenceCase(row.description));
    }
    if (rows.length < PAGE_SIZE) break;
  }

  return describeWith(fromDb);
}

/** The lookup itself, separated from the fetch so it can be tested directly. */
export function describeWith(fromDb: Map<string, string>): DescribeCode {
  return (code: string) =>
    CDT_BY_CODE[code]?.description ?? fromDb.get(code) ?? code;
}
