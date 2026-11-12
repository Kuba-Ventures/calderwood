// Server-only: turn a returning ?session_id= into a GA4 purchase event, or
// null. Retrieves the Checkout Session from Stripe and checks it against the
// signed-in user's practice. Any error (no user, Stripe down, bad id) yields
// null so the dashboard renders normally and no event fires.

import "server-only";
import { serverSupabase, serviceSupabase } from "@/lib/db/server";
import { getPracticeByEmail } from "@/lib/db/practices";
import { stripe } from "@/lib/stripe";
import {
  buildPurchaseEvent,
  isCheckoutSessionId,
  type PurchaseEvent,
} from "./purchase-event";

export async function verifiedPurchaseEvent(
  sessionId: unknown
): Promise<PurchaseEvent | null> {
  if (!isCheckoutSessionId(sessionId)) return null;
  try {
    const {
      data: { user },
    } = await serverSupabase().auth.getUser();
    if (!user?.email) return null;
    const practice = await getPracticeByEmail(serviceSupabase(), user.email);
    if (!practice) return null;
    const session = await stripe().checkout.sessions.retrieve(sessionId);
    return buildPurchaseEvent(session, practice.id);
  } catch {
    return null;
  }
}
