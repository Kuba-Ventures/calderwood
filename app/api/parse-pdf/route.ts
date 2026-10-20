// POST /api/parse-pdf — extract fees + annual volumes from an uploaded PM
// Procedure Summary PDF, or (fallback) fees alone from an office fee schedule
// PDF. Takes the storage `path` (from /api/upload-url),
// downloads the bytes with the service role, and runs Claude's native-PDF
// extractor. Returns the parsed rows for the wizard to preview and submit.
//
// Pre-auth (onboarding). Heavy: a 14-page report can take 20-40s, so this runs
// with the extended duration and is NOT done inside /api/onboard.

import { NextResponse } from "next/server";
import { serviceSupabase } from "@/lib/db/server";
import { parsePdfSummary, type PdfSummaryResult } from "@/lib/parser/pdf-summary";
import { parsePdfSchedule } from "@/lib/parser/pdf-schedule";

export const dynamic = "force-dynamic";
// Streamed Opus extraction of a 14-page report can run past a minute; give the
// function real headroom (capped by the Vercel plan).
export const maxDuration = 300;

const BUCKET = "uploads";
const MAX_BYTES = 32 * 1024 * 1024; // Anthropic native-PDF ceiling.

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const path = typeof body?.path === "string" ? body.path : "";
  // Only allow paths we mint in /api/upload-url.
  if (!path.startsWith("pdf/") || path.includes("..")) {
    return NextResponse.json({ error: "invalid path" }, { status: 400 });
  }

  const sb = serviceSupabase();
  const { data: blob, error } = await sb.storage.from(BUCKET).download(path);
  if (error || !blob) {
    return NextResponse.json(
      { error: error?.message ?? "file not found" },
      { status: 404 }
    );
  }
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (bytes.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "file too large" }, { status: 413 });
  }

  const pdfBase64 = Buffer.from(bytes).toString("base64");

  let result: PdfSummaryResult;
  // "report": production report (fees are post-discount averages, has counts).
  // "schedule": the office fee schedule itself (full fees, no counts).
  let source: "report" | "schedule" = "report";
  try {
    result = await parsePdfSummary({ pdfBase64 });
    // A production report always carries procedure counts. No counts on any
    // row means this is most likely the office fee schedule itself (the file
    // we ask dentists for), whether the report reader refused it or read fees
    // off it anyway (it does both, run to run). Re-read it with the
    // fee-schedule reader, which reliably picks the full, non-member fee
    // column when there are several.
    if (!result.entries.some((e) => e.annualVolume > 0)) {
      source = "schedule";
      const schedule = await parsePdfSchedule({ pdfBase64, want: "office" });
      if (schedule.entries.length > 0) {
        result = {
          entries: schedule.entries.map((e) => ({ ...e, annualVolume: 0 })),
          notes: ["Read as an office fee schedule (no procedure counts).", ...schedule.notes],
          confidence: schedule.confidence,
        };
      }
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "extraction failed" },
      { status: 500 }
    );
  }

  if (result.entries.length === 0) {
    return NextResponse.json(
      { error: "no_codes_found", notes: result.notes },
      { status: 422 }
    );
  }

  // Split into the shapes onboard/intake expect: code+fee rows, plus a
  // code -> annual-volume frequency map (only codes with a real volume).
  const rows = result.entries.map((e) => ({ code: e.code, fee: e.fee }));
  const frequencies: Record<string, number> = {};
  const providerFees: Record<string, Record<string, number>> = {};
  for (const e of result.entries) {
    if (e.annualVolume > 0) frequencies[e.code] = e.annualVolume;
    if (e.providerFees && Object.keys(e.providerFees).length > 1) {
      providerFees[e.code] = e.providerFees;
    }
  }

  return NextResponse.json({
    ok: true,
    source,
    count: rows.length,
    rows,
    frequencies,
    providerFees,
    notes: result.notes,
    confidence: result.confidence,
  });
}
