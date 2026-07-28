"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const APP_PREFIXES = ["/dashboard", "/intake", "/reports", "/account"];

export function Header() {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login";
  const isAppPage = APP_PREFIXES.some(
    (p) => pathname === p || pathname?.startsWith(p + "/")
  );

  if (isAppPage) return null;
  // The landing page ("/") renders its own <LandingNav>.
  if (pathname === "/") return null;

  return (
    <header className="border-b border-canvas-border bg-canvas">
      <div className="mx-auto flex max-w-container items-center justify-between gap-4 px-6 py-4 sm:px-8 sm:py-5">
        {isAuthPage ? (
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-sm text-sm font-medium text-ink-500 transition hover:text-ink-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-900"
          >
            <BackArrow />
            <span>Back to home</span>
          </Link>
        ) : (
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-900"
          >
            <Image
              src="/logo.png"
              alt=""
              width={161}
              height={187}
              priority
              className="h-7 w-auto sm:h-8"
            />
            <span className="text-base font-semibold tracking-tightish text-ink-900 sm:text-lg">
              New Fee Schedule
            </span>
          </Link>
        )}
        {!isAuthPage && (
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md border border-canvas-border bg-canvas px-4 py-2 text-sm font-medium text-ink-900 transition hover:bg-canvas-tint focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
          >
            Log in
          </Link>
        )}
      </div>
    </header>
  );
}

function BackArrow() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M11.5 7H2.5M2.5 7L7 2.5M2.5 7L7 11.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
