// Dashboard route. A thin server wrapper around the client dashboard so that,
// when the user returns from Stripe Checkout with ?session_id=, the session can
// be verified server-side and a GA4 purchase event handed to the client. All
// dashboard UI lives in dashboard-client.tsx.

import { PurchaseEventPush } from "@/components/analytics/purchase-event";
import { verifiedPurchaseEvent } from "@/lib/analytics/verified-purchase";
import { DashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const purchase = searchParams.session_id
    ? await verifiedPurchaseEvent(searchParams.session_id)
    : null;
  return (
    <>
      {purchase && <PurchaseEventPush event={purchase} />}
      <DashboardClient />
    </>
  );
}
