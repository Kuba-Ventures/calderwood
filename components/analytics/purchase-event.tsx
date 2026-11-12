"use client";

// Pushes one GA4 ecommerce "purchase" event to the GTM dataLayer, then drops
// session_id from the URL so a reload does not refire. A ref guards against
// re-renders and a per-transaction sessionStorage key guards against reloads
// or back navigation. Renders nothing.

import { useEffect, useRef } from "react";
import type { PurchaseEvent } from "@/lib/analytics/purchase-event";

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

function storageKey(transactionId: string) {
  return `nfs:ga4-purchase:${transactionId}`;
}

function alreadySent(transactionId: string): boolean {
  try {
    return window.sessionStorage.getItem(storageKey(transactionId)) === "1";
  } catch {
    return false;
  }
}

function markSent(transactionId: string) {
  try {
    window.sessionStorage.setItem(storageKey(transactionId), "1");
  } catch {
    // Storage blocked (private mode). The ref and URL cleanup still apply.
  }
}

function dropSessionIdFromUrl() {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("session_id")) return;
    url.searchParams.delete("session_id");
    window.history.replaceState(window.history.state, "", url.toString());
  } catch {
    // Non-critical.
  }
}

export function PurchaseEventPush({ event }: { event: PurchaseEvent }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    const id = event.ecommerce.transaction_id;
    if (!alreadySent(id)) {
      markSent(id);
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ ecommerce: null });
      window.dataLayer.push(event);
    }
    dropSessionIdFromUrl();
  }, [event]);

  return null;
}
