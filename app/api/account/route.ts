// GET/POST /api/account — the signed-in practice's account details, sourced
// from Supabase (auth user + practices row), replacing the old localStorage
// Account page that showed stale demo identity. Email is the auth identity
// (read-only here); practice name + phone are editable and persist to the DB.

import { NextResponse } from "next/server";
import { z } from "zod";
import { serverSupabase, serviceSupabase } from "@/lib/db/server";
import { getPracticeByEmail } from "@/lib/db/practices";

export const dynamic = "force-dynamic";

export async function GET() {
  const sb = serverSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const practice = await getPracticeByEmail(serviceSupabase(), user.email);
  return NextResponse.json({
    email: user.email,
    practiceName: practice?.practice_name ?? "",
    phone: practice?.phone ?? "",
    zip: practice?.zip5 ?? "",
    hasPractice: !!practice,
  });
}

const bodySchema = z.object({
  practiceName: z.string().trim().min(1).optional(),
  phone: z.string().trim().optional(),
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
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const service = serviceSupabase();
  const practice = await getPracticeByEmail(service, user.email);
  if (!practice) {
    return NextResponse.json({ error: "no practice found" }, { status: 404 });
  }

  const update: Record<string, unknown> = {};
  if (body.practiceName !== undefined) update.practice_name = body.practiceName;
  if (body.phone !== undefined) update.phone = body.phone || null;
  if (Object.keys(update).length > 0) {
    const { error } = await service
      .from("practices")
      .update(update)
      .eq("id", practice.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
