"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: <DashboardIcon /> },
  { href: "/intake", label: "Intake", icon: <IntakeIcon /> },
  { href: "/reports", label: "Reports", icon: <ReportsIcon /> },
  { href: "/account", label: "Account", icon: <AccountIcon /> },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 border-r border-canvas-border bg-canvas md:flex md:flex-col">
      <Link
        href="/dashboard"
        className="flex items-center gap-2.5 px-6 py-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
      >
        <Image
          src="/logo.png"
          alt=""
          width={161}
          height={187}
          priority
          className="h-7 w-auto"
        />
        <span className="text-base font-semibold tracking-tightish text-ink-900">
          Calderwood
        </span>
      </Link>
      <nav className="flex-1 px-3 py-2">
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-canvas-tint text-ink-900"
                      : "text-ink-500 hover:bg-canvas-tint hover:text-ink-900"
                  }`}
                >
                  <span
                    className={active ? "text-ink-900" : "text-ink-400"}
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-canvas-border px-6 py-4">
        <p className="text-xs text-ink-400">
          Questions?{" "}
          <a
            href="mailto:hello@calderwoodtech.com"
            className="text-ink-700 hover:text-ink-900"
          >
            hello@calderwoodtech.com
          </a>
        </p>
      </div>
    </aside>
  );
}

function DashboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2.5 2.5h4v4h-4v-4ZM9.5 2.5h4v4h-4v-4ZM2.5 9.5h4v4h-4v-4ZM9.5 9.5h4v4h-4v-4Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function IntakeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3 2.5h7l3 3V13.5H3v-11Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M9.5 2.5v3h3" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M5.5 8.5h5M5.5 11h3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ReportsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2.5 3.5h11M2.5 8h11M2.5 12.5h11"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AccountIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M3 13.5c.8-2.2 2.7-3.5 5-3.5s4.2 1.3 5 3.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
