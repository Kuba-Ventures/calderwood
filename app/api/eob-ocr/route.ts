// POST /api/eob-ocr — EOB image intake (STUB).
//
// Real OCR isn't built yet. This endpoint accepts the uploaded EOB image,
// stores it via the service role, and returns a storage path the onboard flow
// records as the master schedule's raw_file_url. A human extracts the fees from
// the queued image. When OCR lands, replace the body of this handler with the
// extraction call and return parsed entries instead of `queued: true`.
//
// Accepts multipart/form-data with a single `file` field. Pre-auth (the account
// doesn't exist yet during onboarding); fine for sandbox. Add rate limiting +
// size/type hardening before paid traffic.

import { NextResponse } from "next/server";
import { serviceSupabase } from "@/lib/db/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const BUCKET = "uploads";
const MAX_BYTES = 15 * 1024 * 1024; // 15 MB
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "application/pdf"];

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "file too large" }, { status: 413 });
  }
  if (file.type && !ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "unsupported file type" }, { status: 415 });
  }

  const sb = serviceSupabase();
  // Ensure a private bucket exists for raw uploads.
  const { data: buckets } = await sb.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) {
    await sb.storage.createBucket(BUCKET, { public: false });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `eob/${crypto.randomUUID()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await sb.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    eobPath: `${BUCKET}/${path}`,
    queued: true,
    message: "EOB received. Our team will extract your fees shortly.",
  });
}
