// POST/DELETE /api/share — mint or revoke a view-only share link for the
// signed-in practice's report. POST ensures a secret token exists and returns
// the public /r/<token> URL; DELETE revokes it. The link is unguessable and
// grants read-only access to the report only (no settings, billing, or auth).

import { NextResponse } from "next/server";
import { serverSupabase, serviceSupabase } from "@/lib/db/server";
import { getPracticeByEmail } from "@/lib/db/practices";

export const dynamic = "force-dynamic";

function originFrom(request: Request): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, "");
  const host = request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

async function authedPractice(request: Request) {
  const sb = serverSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.email) return { error: "unauthorized" as const, status: 401 };
  const service = serviceSupabase();
  const practice = await getPracticeByEmail(service, user.email);
  if (!practice) return { error: "no practice found" as const, status: 404 };
  return { service, practice };
}

export async function POST(request: Request) {
  const ctx = await authedPractice(request);
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }
  const { service, practice } = ctx;

  let token = practice.share_token ?? null;
  if (!token) {
    token = crypto.randomUUID();
    const { error } = await service
      .from("practices")
      .update({ share_token: token })
      .eq("id", practice.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
  return NextResponse.json({ url: `${originFrom(request)}/r/${token}`, token });
}

export async function DELETE(request: Request) {
  const ctx = await authedPractice(request);
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }
  const { service, practice } = ctx;
  const { error } = await service
    .from("practices")
    .update({ share_token: null })
    .eq("id", practice.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
