// POST /api/reset-data — wipe the signed-in practice's report data so the
// account can re-run intake from scratch. Testing convenience: keeps the auth
// account + practice row, deletes the report, fee schedules (master + carrier),
// and frequencies, and resets the paid/status fields so the paywall re-locks.
// An old share link auto-dies because its report is gone.

import { NextResponse } from "next/server";
import { serverSupabase, serviceSupabase } from "@/lib/db/server";
import { getPracticeByEmail } from "@/lib/db/practices";

export const dynamic = "force-dynamic";

export async function POST() {
  const sb = serverSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const service = serviceSupabase();
  const practice = await getPracticeByEmail(service, user.email);
  if (!practice) {
    return NextResponse.json({ ok: true, note: "no practice to reset" });
  }

  await service.from("reports").delete().eq("practice_id", practice.id);
  await service.from("frequency_data").delete().eq("practice_id", practice.id);
  await service.from("fee_schedules").delete().eq("practice_id", practice.id);

  // Reset only columns guaranteed to exist (0001/0003). Report is gone, so a
  // stale share_token harmlessly resolves to a 404; no need to touch it here.
  const { error } = await service
    .from("practices")
    .update({
      status: "awaiting_uploads",
      paid_at: null,
      stripe_payment_id: null,
      fee_input_method: null,
    })
    .eq("id", practice.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
