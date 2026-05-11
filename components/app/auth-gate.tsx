"use client";

// Placeholder gate. Reads cw_auth from localStorage; redirects to /login
// if missing. Replace with Supabase session check when real auth lands.

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth } from "@/lib/storage";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (auth.isSignedIn()) {
      setReady(true);
    } else {
      router.replace("/login");
    }
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas-tint">
        <div className="text-sm text-ink-400">Loading…</div>
      </div>
    );
  }

  return <>{children}</>;
}
