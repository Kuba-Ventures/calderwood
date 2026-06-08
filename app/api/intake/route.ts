// POST /api/intake — re-submission for an already-authed practice. Replaces the
// master fee schedule (and optionally carriers), resets status so /api/generate
// rebuilds the report. Keeps paid_at intact — a returning paid customer isn't
// re-charged for a re-run.
//
// New signups go through /api/onboard; this is the "update my fees" path behind
// the app's Intake nav.

import { NextResponse } from "next/server";
import { z } from "zod";
import { serverSupabase, serviceSupabase } from "@/lib/db/server";
import { getPracticeByEmail, insertFeeSchedule, insertFrequencies } from "@/lib/db/practices";
import { parseUpload } from "@/lib/parser/dispatch";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const rowsSchema = z
  .array(z.object({ code: z.string(), fee: z.union([z.string(), z.number()]) }))
  .min(1);

const feeSchema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("csv"), csvText: z.string().min(1) }),
  z.object({ method: z.literal("xlsx"), csvText: z.string().min(1) }),
  z.object({ method: z.literal("paste"), rows: rowsSchema }),
  z.object({ method: z.literal("manual"), rows: rowsSchema }),
  z.object({ method: z.literal("eob"), eobPath: z.string().min(1) }),
  z.object({
    method: z.literal("pdf"),
    rows: rowsSchema,
    frequencies: z.record(z.string(), z.number()).optional(),
    pdfPath: z.string().optional(),
  }),
]);

const bodySchema = z.object({
  fee: feeSchema,
  carriers: z.array(z.string()).min(1).optional(),
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

  const fee = body.fee;

  // Parse (non-EOB) before mutating anything, so a bad file doesn't wipe the
  // existing schedule.
  let entries: { code: string; fee: number }[] = [];
  let confidence: "high" | "medium" | "low" | "failed" = "low";
  let notes: string[] = [];
  if (fee.method !== "eob") {
    const parsed =
      fee.method === "csv" || fee.method === "xlsx"
        ? await parseUpload({ kind: "csv", text: fee.csvText })
        : await parseUpload({ kind: "paste", rows: fee.rows });
    if (parsed.entries.length === 0) {
      return NextResponse.json(
        { error: "fee_parse_failed", notes: parsed.notes },
        { status: 422 }
      );
    }
    entries = parsed.entries;
    confidence = parsed.confidence;
    notes = parsed.notes;
  }

  // Replace the master schedule (unique one-per-practice).
  await service
    .from("fee_schedules")
    .delete()
    .eq("practice_id", practice.id)
    .eq("schedule_type", "master");

  await insertFeeSchedule(service, {
    practice_id: practice.id,
    schedule_type: "master",
    carrier: null,
    raw_file_url:
      fee.method === "eob"
        ? fee.eobPath
        : fee.method === "pdf"
        ? fee.pdfPath ?? null
        : null,
    parsed_data: fee.method === "eob" ? null : entries,
    parse_confidence: fee.method === "eob" ? "low" : confidence,
    parse_notes:
      fee.method === "eob"
        ? "EOB image uploaded; queued for manual extraction."
        : notes.join("; ") || null,
  });

  // Replace stored frequencies with the report's real volumes on a PDF resubmit.
  if (fee.method === "pdf") {
    await service.from("frequency_data").delete().eq("practice_id", practice.id);
    if (fee.frequencies) {
      await insertFrequencies(service, practice.id, fee.frequencies);
    }
  }

  const update: Record<string, unknown> = {
    fee_input_method: fee.method,
    status: fee.method === "eob" ? "review_queue" : "awaiting_uploads",
  };
  if (body.carriers) update.contracted_carriers = body.carriers;
  await service.from("practices").update(update).eq("id", practice.id);

  return NextResponse.json({
    ok: true,
    needsGenerate: fee.method !== "eob",
  });
}
