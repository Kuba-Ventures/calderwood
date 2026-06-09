// POST /api/onboard — the fused signup + intake submit.
//
// Creates the auth user (server-side, email pre-confirmed so the fused flow
// completes in one sitting regardless of the project's confirm-email setting),
// upserts the practice, parses the submitted fee schedule, and stores it. It
// does NOT run the heavy compute/PDF step — that happens in /api/generate once
// the client has signed in, so the status tracker can show real progression.
//
// Returns { practiceId, needsGenerate }. The client then signInWithPassword and
// navigates to the reports page, which kicks off generation + polls status.

import { NextResponse } from "next/server";
import { z } from "zod";
import { serviceSupabase } from "@/lib/db/server";
import { insertFeeSchedule, insertFrequencies, upsertPractice } from "@/lib/db/practices";
import { parseUpload } from "@/lib/parser/dispatch";
import type { ProviderBucket } from "@/lib/types/pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const rowsSchema = z
  .array(z.object({ code: z.string(), fee: z.union([z.string(), z.number()]) }))
  .min(1);

// One member per method (single-literal discriminants) so TS narrows cleanly.
const feeSchema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("csv"), csvText: z.string().min(1), filename: z.string().optional() }),
  z.object({ method: z.literal("xlsx"), csvText: z.string().min(1), filename: z.string().optional() }),
  z.object({ method: z.literal("paste"), rows: rowsSchema }),
  z.object({ method: z.literal("manual"), rows: rowsSchema }),
  z.object({ method: z.literal("eob"), eobPath: z.string().min(1), filename: z.string().optional() }),
  // PDF was extracted client-side via /api/parse-pdf; we get code+fee rows plus
  // the real annual volumes pulled from the report's Quantity column.
  z.object({
    method: z.literal("pdf"),
    rows: rowsSchema,
    frequencies: z.record(z.string(), z.number()).optional(),
    providerFees: z.record(z.string(), z.record(z.string(), z.number())).optional(),
    pdfPath: z.string().optional(),
    filename: z.string().optional(),
  }),
]);

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  practiceName: z.string().trim().min(1),
  zip: z.string().regex(/^\d{5}$/),
  providerCount: z.number().int().min(1),
  carriers: z.array(z.string()).min(1),
  fee: feeSchema,
});

function bucketFor(n: number): ProviderBucket {
  if (n <= 1) return "1";
  if (n <= 5) return "2-5";
  return "6+";
}

export async function POST(request: Request) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: "invalid request", detail: err instanceof Error ? err.message : err },
      { status: 400 }
    );
  }

  const sb = serviceSupabase();
  const email = body.email.trim().toLowerCase();

  // 1. Create the auth user (pre-confirmed). Surface "already registered" as 409
  //    so the wizard can route them to sign-in instead.
  const { data: created, error: createErr } = await sb.auth.admin.createUser({
    email,
    password: body.password,
    email_confirm: true,
  });
  if (createErr) {
    const dup = /registered|already exists/i.test(createErr.message);
    return NextResponse.json(
      { error: dup ? "account_exists" : createErr.message },
      { status: dup ? 409 : 500 }
    );
  }
  const userId = created.user?.id;

  // If anything after account creation fails, delete the just-created auth user
  // so the email isn't stranded (createUser succeeded but the practice didn't —
  // a retry would otherwise hit "account_exists" forever).
  async function rollbackAuthUser() {
    if (userId) await sb.auth.admin.deleteUser(userId).catch(() => {});
  }

  const fee = body.fee;
  try {
    // 2. Practice row.
    const practice = await upsertPractice(sb, {
      email,
      practice_name: body.practiceName.trim(),
      zip5: body.zip,
      provider_count_bucket: bucketFor(body.providerCount),
      contracted_carriers: body.carriers,
      recredentialing_dates: null,
      stripe_payment_id: null,
      paid_at: null,
      fee_input_method: fee.method,
      // EOB needs a human to extract fees; everything else is ready to compute.
      status: fee.method === "eob" ? "review_queue" : "awaiting_uploads",
    });

    // 3. Master fee schedule.
    if (fee.method === "eob") {
      await insertFeeSchedule(sb, {
        practice_id: practice.id,
        schedule_type: "master",
        carrier: null,
        raw_file_url: fee.eobPath,
        parsed_data: null,
        parse_confidence: "low",
        parse_notes: "EOB image uploaded; queued for manual extraction.",
      });
      return NextResponse.json({
        ok: true,
        practiceId: practice.id,
        needsGenerate: false,
        eob: true,
      });
    }

    let parsed;
    if (fee.method === "csv" || fee.method === "xlsx") {
      parsed = await parseUpload({ kind: "csv", text: fee.csvText });
    } else {
      parsed = await parseUpload({ kind: "paste", rows: fee.rows });
    }

    if (parsed.entries.length === 0) {
      // Roll back so the user can retry cleanly with a different file/method.
      await sb.from("practices").delete().eq("id", practice.id);
      await rollbackAuthUser();
      return NextResponse.json(
        {
          error: "fee_parse_failed",
          notes: parsed.notes,
          rejected: parsed.rejected.slice(0, 5),
        },
        { status: 422 }
      );
    }

    await insertFeeSchedule(sb, {
      practice_id: practice.id,
      schedule_type: "master",
      carrier: null,
      raw_file_url: fee.method === "pdf" ? fee.pdfPath ?? null : null,
      parsed_data: parsed.entries,
      parse_confidence: parsed.confidence,
      parse_notes: parsed.notes.join("; ") || null,
      provider_fees: fee.method === "pdf" ? fee.providerFees ?? null : null,
    });

    // PDF reports carry the practice's real annual volumes — persist them so
    // generateReport uses actual frequencies instead of the per-provider
    // defaults.
    if (fee.method === "pdf" && fee.frequencies) {
      await insertFrequencies(sb, practice.id, fee.frequencies);
    }

    return NextResponse.json({
      ok: true,
      practiceId: practice.id,
      needsGenerate: true,
      parsedCount: parsed.entries.length,
    });
  } catch (err) {
    await rollbackAuthUser();
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
