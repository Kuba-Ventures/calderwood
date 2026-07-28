"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { label: "How It Works", href: "/how-it-works" },
  { label: "Features", href: "/features" },
  { label: "Sample Report", href: "/sample-report" },
  { label: "Pricing", href: "/pricing" },
  { label: "Resources", href: "/resources" },
];

export function LandingNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const closeMenu = () => setOpen(false);

  return (
    <nav
      className="sticky top-0 z-[60] border-b border-line bg-white/[0.82] backdrop-blur-[14px]"
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) setOpen(false);
      }}
    >
      <div className="mx-auto flex h-[72px] max-w-wrap items-center justify-between px-7">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
        >
          <Image
            src="/logo.png"
            alt="New Fee Schedule"
            width={161}
            height={187}
            priority
            className="h-[30px] w-auto"
          />
          <span className="font-display text-[20px] font-bold text-brand-deep">
            New Fee Schedule
          </span>
        </Link>

        <div className="hidden items-center gap-8 lg:flex">
          {LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "text-[15px] font-semibold text-brand-deep underline decoration-brand decoration-2 underline-offset-[10px]"
                    : "text-[15px] font-medium text-ink-600 transition hover:text-brand-deep"
                }
              >
                {l.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-5">
          <Link
            href="/login"
            className="hidden text-[15px] font-semibold text-ink-600 transition hover:text-brand-deep sm:inline"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-[10px] bg-brand-deep px-[18px] py-[10px] text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgba(49,46,129,0.85)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Get Started
          </Link>

          {/* Mobile menu toggle — shown only below the lg breakpoint */}
          <button
            type="button"
            aria-label={open ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={open}
            aria-controls="mobile-nav-menu"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] border border-line text-brand-deep transition hover:bg-brand/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand lg:hidden"
          >
            <span className="sr-only">{open ? "Close menu" : "Menu"}</span>
            {open ? (
              <svg
                aria-hidden="true"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg
                aria-hidden="true"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile navigation panel — conditionally rendered (no motion) and hidden at lg+ */}
      {open && (
        <div
          id="mobile-nav-menu"
          className="border-t border-line bg-white/95 backdrop-blur-[14px] lg:hidden"
        >
          <div className="mx-auto flex max-w-wrap flex-col gap-1 px-7 py-4">
            {LINKS.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  onClick={closeMenu}
                  className={
                    active
                      ? "flex min-h-[44px] items-center rounded-[10px] px-3 text-[16px] font-semibold text-brand-deep underline decoration-brand decoration-2 underline-offset-[10px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                      : "flex min-h-[44px] items-center rounded-[10px] px-3 text-[16px] font-medium text-ink-600 transition hover:bg-brand/[0.06] hover:text-brand-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  }
                >
                  {l.label}
                </Link>
              );
            })}

            <div className="mt-2 flex flex-col gap-2 border-t border-line pt-3">
              <Link
                href="/login"
                onClick={closeMenu}
                aria-current={pathname === "/login" ? "page" : undefined}
                className="flex min-h-[44px] items-center rounded-[10px] px-3 text-[16px] font-semibold text-ink-600 transition hover:bg-brand/[0.06] hover:text-brand-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                onClick={closeMenu}
                className="flex min-h-[44px] items-center justify-center rounded-[10px] bg-brand-deep px-4 text-[16px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(49,46,129,0.85)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
