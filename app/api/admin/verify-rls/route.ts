// Admin endpoint: verify RLS by signing in as multiple demo users
// programmatically (via admin.generateLink + verifyOtp) and querying
// their practice + report through the anon-key client. Returns the actual
// JSON each user sees so we can confirm the SELECT policies behave.
//
// Gated by ADMIN_PASSWORD via Authorization: Bearer <password>.
//
// Usage:
//   curl -X POST https://calderwood.vercel.app/api/admin/verify-rls \
//     -H "Authorization: Bearer $ADMIN_PASSWORD"

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TARGET_EMAILS = ["finley@qsbsrollover.com", "allen@calderwood.com"];

export async function POST(request: Request) {
  const admin = process.env.ADMIN_PASSWORD;
  if (!admin) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD not configured" },
      { status: 500 }
    );
  }
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : auth;
  if (token !== admin) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) {
    return NextResponse.json(
      { error: "supabase env missing" },
      { status: 500 }
    );
  }

  const adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const results: Record<string, unknown> = {};

  for (const email of TARGET_EMAILS) {
    try {
      results[email] = await verifyOne(url, anonKey, adminClient, email);
    } catch (err) {
      results[email] = {
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return NextResponse.json({ ok: true, results });
}

async function verifyOne(
  url: string,
  anonKey: string,
  adminClient: any,
  email: string
) {
  // 1. Look up the auth user.
  const { data: list, error: listErr } = await adminClient.auth.admin.listUsers(
    { perPage: 200 }
  );
  if (listErr) throw new Error(`listUsers: ${listErr.message}`);
  const user = list.users.find((u: { email?: string }) => u.email === email);
  if (!user) {
    return { error: `auth user not found for ${email}` };
  }

  // 2. Generate a magic link token for that user.
  const { data: linkData, error: linkErr } =
    await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
  if (linkErr) throw new Error(`generateLink: ${linkErr.message}`);
  const hashedToken =
    (linkData as { properties?: { hashed_token?: string } })?.properties
      ?.hashed_token;
  if (!hashedToken) throw new Error("generateLink returned no hashed_token");

  // 3. Exchange the token for a session via verifyOtp on a fresh anon client.
  const userClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: otpData, error: otpErr } = await userClient.auth.verifyOtp({
    type: "magiclink",
    token_hash: hashedToken,
  });
  if (otpErr) throw new Error(`verifyOtp: ${otpErr.message}`);
  if (!otpData.session) throw new Error("verifyOtp returned no session");

  // 4. Now query practices + reports through the authenticated session.
  const { data: practices, error: prErr } = await userClient
    .from("practices")
    .select("*")
    .eq("email", email);
  if (prErr) throw new Error(`practices select: ${prErr.message}`);

  const practiceIds = (practices ?? []).map((p: { id: string }) => p.id);
  const { data: reports, error: rpErr } =
    practiceIds.length > 0
      ? await userClient
          .from("reports")
          .select("id, practice_id, pdf_url, delivered_at, computation_output")
          .in("practice_id", practiceIds)
      : { data: [], error: null };
  if (rpErr) throw new Error(`reports select: ${rpErr.message}`);

  // Trim computation_output for response size — keep just the headline numbers.
  type Row = {
    id: string;
    practice_id: string;
    pdf_url: string | null;
    delivered_at: string | null;
    computation_output: {
      executiveSummary?: unknown;
      flags?: unknown;
    } | null;
  };
  const trimmedReports = (reports as Row[] | null)?.map((r) => ({
    id: r.id,
    practice_id: r.practice_id,
    pdf_url: r.pdf_url,
    delivered_at: r.delivered_at,
    executiveSummary: r.computation_output?.executiveSummary ?? null,
    flagCount: Array.isArray(r.computation_output?.flags)
      ? (r.computation_output!.flags as unknown[]).length
      : 0,
  }));

  return {
    authUid: user.id,
    practicesCount: practices?.length ?? 0,
    reportsCount: trimmedReports?.length ?? 0,
    practices,
    reports: trimmedReports,
  };
}
