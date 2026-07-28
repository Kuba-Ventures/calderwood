"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { label: "How It Works", href: "/how-it-works" },
  { label: "Features", href: "/features" },
  { label: "Sample Report", href: "/sample-report" },
  { label: "Pricing", href: "/pricing" },
  { label: "Resources", href: "/resources" },
];

export function LandingNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-[60] border-b border-line bg-white/[0.82] backdrop-blur-[14px]">
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
            const base =
              "rounded-sm text-[15px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand";
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`${base} ${
                  active
                    ? "font-semibold text-brand-deep underline decoration-brand decoration-2 underline-offset-[10px]"
                    : "font-medium text-ink-600 transition hover:text-brand-deep"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-5">
          <Link
            href="/login"
            className="hidden rounded-sm text-[15px] font-semibold text-ink-600 transition hover:text-brand-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand sm:inline"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-[10px] bg-brand-deep px-[18px] py-[10px] text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgba(49,46,129,0.85)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}
