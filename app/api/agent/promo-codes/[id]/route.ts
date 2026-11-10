// PATCH /api/agent/promo-codes/:id — turn a Stripe promotion code on or off
// (`active` is the only allow-listed field), after Finley approved it.

import { NextResponse } from "next/server";
import { agentKeyRejection, logAgentAction } from "@/lib/agent/guard";
import { isPromoCodeId, parsePromoCodeUpdate } from "@/lib/agent/actions";
import { stripe } from "@/lib/stripe";
import { promoView } from "@/lib/agent/stripe-views";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const denied = agentKeyRejection(request);
  if (denied) return denied;
  if (!isPromoCodeId(params.id)) return NextResponse.json({ error: "Bad promotion code id (promo_...)" }, { status: 400 });
  const parsed = parsePromoCodeUpdate(await request.json().catch(() => null));
  if ("error" in parsed) return NextResponse.json(parsed, { status: 400 });
  try {
    const before = await stripe().promotionCodes.retrieve(params.id).catch(() => null);
    if (!before) return NextResponse.json({ error: "No such promotion code" }, { status: 404 });
    const after = await stripe().promotionCodes.update(params.id, {
      ...parsed.updates,
      metadata: { approval: parsed.approval, reason: parsed.reason.slice(0, 200), source: "agent-key" },
    });
    const changed = Object.fromEntries(
      Object.keys(parsed.updates).map((k) => [k, { from: before[k as "active"], to: after[k as "active"] }])
    );
    logAgentAction({ action: "promo-code.update", promoCodeId: params.id, code: after.code, changed, approval: parsed.approval, reason: parsed.reason });
    return NextResponse.json({ promoCode: promoView(after), changed });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Stripe refused the change" }, { status: 400 });
  }
}
