"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { account, auth, clearAll } from "@/lib/storage";
import { browserSupabase, hasSupabaseEnv } from "@/lib/db/client";

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/intake": "Intake",
  "/reports": "Reports",
  "/account": "Account",
};

export function Topbar() {
  const pathname = usePathname() ?? "/dashboard";
  const router = useRouter();
  const [identity, setIdentity] = useState<{
    firstName: string;
    practiceName: string;
    initial: string;
  }>({ firstName: "", practiceName: "", initial: "?" });
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (hasSupabaseEnv()) {
        const sb = browserSupabase();
        const { data: { user } } = await sb.auth.getUser();
        if (user) {
          const { data: practice } = await sb
            .from("practices")
            .select("practice_name, email")
            .eq("email", user.email ?? "")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (cancelled) return;
          const practiceName = (practice?.practice_name ?? "").trim();
          const firstName = (user.email ?? "").split("@")[0] ?? "";
          const initial = (firstName || practiceName || "?").charAt(0).toUpperCase();
          setIdentity({ firstName, practiceName, initial });
          return;
        }
      }
      // Local fallback
      const a = account.get();
      if (cancelled) return;
      const firstName = a?.firstName?.trim() ?? "";
      const practiceName = a?.practiceName?.trim() ?? "";
      const initial = (firstName || practiceName || "?").charAt(0).toUpperCase();
      setIdentity({ firstName, practiceName, initial });
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function signOut() {
    if (hasSupabaseEnv()) {
      const sb = browserSupabase();
      await sb.auth.signOut();
    }
    auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  function resetEverything() {
    if (
      window.confirm(
        "Reset all local data? This clears intake, account, and report state in this browser."
      )
    ) {
      clearAll();
      router.replace("/login");
    }
  }

  const title = TITLES[pathname] ?? "";

  return (
    <header className="border-b border-canvas-border bg-canvas">
      <div className="flex items-center justify-between px-6 py-4 sm:px-8">
        <h1 className="text-base font-semibold tracking-tightish text-ink-900 md:text-lg">
          {title}
        </h1>
        <div className="flex items-center gap-3">
          <Link
            href="/account"
            className="group hidden text-sm sm:inline"
          >
            {identity.firstName || identity.practiceName ? (
              <>
                {identity.firstName && (
                  <span className="font-medium text-accent group-hover:text-accent-ink">
                    {identity.firstName}
                  </span>
                )}
                {identity.firstName && identity.practiceName && (
                  <span className="text-ink-400"> at </span>
                )}
                {identity.practiceName && (
                  <span className="font-medium text-accent group-hover:text-accent-ink">
                    {identity.practiceName}
                  </span>
                )}
              </>
            ) : (
              <span className="text-ink-500 group-hover:text-ink-900">
                Your practice
              </span>
            )}
          </Link>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-canvas-border bg-canvas-tint text-sm font-medium text-ink-700 transition hover:border-ink-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
              aria-haspopup="menu"
              aria-expanded={open}
            >
              {identity.initial}
            </button>
            {open && (
              <div
                role="menu"
                className="absolute right-0 z-10 mt-2 w-56 overflow-hidden rounded-md border border-canvas-border bg-canvas shadow-lg"
              >
                <Link
                  href="/account"
                  onClick={() => setOpen(false)}
                  className="block px-4 py-2.5 text-sm text-ink-700 hover:bg-canvas-tint"
                >
                  Account settings
                </Link>
                <button
                  type="button"
                  onClick={resetEverything}
                  className="block w-full px-4 py-2.5 text-left text-sm text-ink-500 hover:bg-canvas-tint"
                >
                  Reset local data
                </button>
                <div className="border-t border-canvas-border" />
                <button
                  type="button"
                  onClick={signOut}
                  className="block w-full px-4 py-2.5 text-left text-sm text-ink-700 hover:bg-canvas-tint"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <MobileNav pathname={pathname} />
    </header>
  );
}

function MobileNav({ pathname }: { pathname: string }) {
  const items = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/intake", label: "Intake" },
    { href: "/reports", label: "Reports" },
    { href: "/account", label: "Account" },
  ];
  return (
    <nav className="flex gap-1 overflow-x-auto border-t border-canvas-border px-3 py-2 md:hidden">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition ${
              active
                ? "bg-canvas-tint text-ink-900"
                : "text-ink-500 hover:text-ink-900"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
