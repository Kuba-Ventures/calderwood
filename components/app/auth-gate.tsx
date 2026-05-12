"use client";

// Client-side gate. Middleware handles auth-redirect for Supabase users;
// this component additionally honors the legacy localStorage flag so the
// app keeps working during the Supabase rollout when env vars are absent.

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth } from "@/lib/storage";
import { browserSupabase, hasSupabaseEnv } from "@/lib/db/client";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (hasSupabaseEnv()) {
        const sb = browserSupabase();
        const { data } = await sb.auth.getUser();
        if (cancelled) return;
        if (!data.user) {
          router.replace("/login");
        } else {
          setReady(true);
        }
        return;
      }
      // Fallback while Supabase env vars aren't set yet.
      if (auth.isSignedIn()) {
        setReady(true);
      } else {
        router.replace("/login");
      }
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas-tint">
        <div className="text-sm text-ink-400">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}
