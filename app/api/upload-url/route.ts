// POST /api/upload-url — mint a one-time signed upload URL into the private
// `uploads` bucket so the browser can PUT a large PDF straight to Supabase
// Storage, bypassing Vercel's ~4.5 MB request-body limit (these PM reports run
// 8 MB+). Pre-auth: onboarding hasn't created the account yet. The client
// uploads via storage.uploadToSignedUrl(path, token, file), then hands the
// returned path to /api/parse-pdf.

import { NextResponse } from "next/server";
import { serviceSupabase } from "@/lib/db/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const BUCKET = "uploads";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const filename = typeof body?.filename === "string" ? body.filename : "";
  const lower = filename.toLowerCase();
  if (!lower.endsWith(".pdf")) {
    return NextResponse.json({ error: "PDF only" }, { status: 415 });
  }

  const sb = serviceSupabase();
  const { data: buckets } = await sb.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) {
    await sb.storage.createBucket(BUCKET, { public: false });
  }

  const path = `pdf/${crypto.randomUUID()}.pdf`;
  const { data, error } = await sb.storage
    .from(BUCKET)
    .createSignedUploadUrl(path);
  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "could not create upload url" },
      { status: 500 }
    );
  }

  return NextResponse.json({ bucket: BUCKET, path: data.path, token: data.token });
}
