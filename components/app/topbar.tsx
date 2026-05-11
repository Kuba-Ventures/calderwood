"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { account, auth, clearAll } from "@/lib/storage";

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/intake": "Intake",
  "/reports": "Reports",
  "/account": "Account",
};

export function Topbar() {
  const pathname = usePathname() ?? "/dashboard";
  const router = useRouter();
  const [practiceName, setPracticeName] = useState<string>("");
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const a = account.get();
    setPracticeName(a?.practiceName?.trim() || "Your practice");
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

  function signOut() {
    auth.signOut();
    router.replace("/login");
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
            className="hidden text-sm text-ink-500 hover:text-ink-900 sm:inline"
          >
            {practiceName}
          </Link>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-canvas-border bg-canvas-tint text-sm font-medium text-ink-700 transition hover:border-ink-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
              aria-haspopup="menu"
              aria-expanded={open}
            >
              {(practiceName || "?").charAt(0).toUpperCase()}
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
