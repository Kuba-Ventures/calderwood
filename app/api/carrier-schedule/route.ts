// POST /api/carrier-schedule — add (or replace) one carrier's contracted fee
// schedule for the signed-in practice, then recompute the report so the carrier
// ranking + carrier-based headline populate. Accepts csv/xlsx (text), paste
// (rows), or pdf (storage path from /api/upload-url, parsed with the carrier
// fee-schedule extractor).
//
// Master fees give a market-based report; per-carrier schedules upgrade it to a
// carrier-based one (what each plan actually contracts vs UCR). Idempotent per
// carrier: re-uploading replaces that carrier's schedule.

import { NextResponse } from "next/server";
import { z } from "zod";
import { serverSupabase, serviceSupabase } from "@/lib/db/server";
import { getPracticeByEmail, insertFeeSchedule } from "@/lib/db/practices";
import { parseUpload } from "@/lib/parser/dispatch";
import { parsePdfSchedule } from "@/lib/parser/pdf-schedule";
import { generateReport } from "@/lib/report/generate";
import type { FeeEntry } from "@/lib/types/pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const UPLOADS_BUCKET = "uploads";

const rowsSchema = z
  .array(z.object({ code: z.string(), fee: z.union([z.string(), z.number()]) }))
  .min(1);

const feeSchema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("csv"), csvText: z.string().min(1) }),
  z.object({ method: z.literal("xlsx"), csvText: z.string().min(1) }),
  z.object({ method: z.literal("paste"), rows: rowsSchema }),
  z.object({ method: z.literal("pdf"), pdfPath: z.string().min(1) }),
]);

const bodySchema = z.object({
  carrier: z.string().trim().min(1),
  fee: feeSchema,
});

export async function POST(request: Request) {
  const sb = serverSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: "invalid request", detail: err instanceof Error ? err.message : err },
      { status: 400 }
    );
  }

  const service = serviceSupabase();
  const practice = await getPracticeByEmail(service, user.email);
  if (!practice) {
    return NextResponse.json({ error: "no practice found" }, { status: 404 });
  }
  if (!practice.contracted_carriers.includes(body.carrier)) {
    return NextResponse.json({ error: "carrier not contracted" }, { status: 400 });
  }

  // 1. Parse the carrier schedule into code -> fee entries.
  let entries: FeeEntry[] = [];
  let confidence: "high" | "medium" | "low" | "failed" = "low";
  let notes: string[] = [];
  const fee = body.fee;
  try {
    if (fee.method === "csv" || fee.method === "xlsx") {
      const parsed = await parseUpload({ kind: "csv", text: fee.csvText });
      entries = parsed.entries;
      confidence = parsed.confidence;
      notes = parsed.notes;
    } else if (fee.method === "paste") {
      const parsed = await parseUpload({ kind: "paste", rows: fee.rows });
      entries = parsed.entries;
      confidence = parsed.confidence;
      notes = parsed.notes;
    } else {
      // pdf: download from storage, extract with the carrier-schedule parser.
      if (!fee.pdfPath.startsWith("pdf/") || fee.pdfPath.includes("..")) {
        return NextResponse.json({ error: "invalid path" }, { status: 400 });
      }
      const { data: blob, error } = await service.storage
        .from(UPLOADS_BUCKET)
        .download(fee.pdfPath);
      if (error || !blob) {
        return NextResponse.json({ error: "file not found" }, { status: 404 });
      }
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const result = await parsePdfSchedule({
        pdfBase64: Buffer.from(bytes).toString("base64"),
      });
      entries = result.entries;
      confidence = result.confidence;
      notes = result.notes;
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "parse failed" },
      { status: 500 }
    );
  }

  if (entries.length === 0) {
    return NextResponse.json({ error: "no_codes_found", notes }, { status: 422 });
  }

  // 2. Replace this carrier's schedule (one per practice+carrier).
  await service
    .from("fee_schedules")
    .delete()
    .eq("practice_id", practice.id)
    .eq("schedule_type", "carrier")
    .eq("carrier", body.carrier);

  await insertFeeSchedule(service, {
    practice_id: practice.id,
    schedule_type: "carrier",
    carrier: body.carrier,
    raw_file_url: fee.method === "pdf" ? fee.pdfPath : null,
    parsed_data: entries,
    parse_confidence: confidence,
    parse_notes: notes.join("; ") || null,
  });

  // 3. Recompute so the carrier ranking + carrier-based headline populate.
  //    Preserve a paid practice's unlocked/delivered state (generateReport
  //    ends at report_ready; paid_at already unlocks the numbers either way).
  try {
    await generateReport(service, practice);
    if (practice.paid_at) {
      await service
        .from("practices")
        .update({ status: "delivered" })
        .eq("id", practice.id);
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "recompute failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    carrier: body.carrier,
    count: entries.length,
    confidence,
  });
}
