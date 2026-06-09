// POST /api/parse-pdf — extract fees + annual volumes from an uploaded PM
// Procedure Summary PDF. Takes the storage `path` (from /api/upload-url),
// downloads the bytes with the service role, and runs Claude's native-PDF
// extractor. Returns the parsed rows for the wizard to preview and submit.
//
// Pre-auth (onboarding). Heavy: a 14-page report can take 20-40s, so this runs
// with the extended duration and is NOT done inside /api/onboard.

import { NextResponse } from "next/server";
import { serviceSupabase } from "@/lib/db/server";
import { parsePdfSummary } from "@/lib/parser/pdf-summary";

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

  let result;
  try {
    result = await parsePdfSummary({ pdfBase64 });
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
  for (const e of result.entries) {
    if (e.annualVolume > 0) frequencies[e.code] = e.annualVolume;
  }

  return NextResponse.json({
    ok: true,
    count: rows.length,
    rows,
    frequencies,
    notes: result.notes,
    confidence: result.confidence,
  });
}
