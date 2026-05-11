import Image from "next/image";
import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-canvas-border bg-canvas">
      <div className="mx-auto flex max-w-container items-center justify-between gap-4 px-6 py-4 sm:px-8 sm:py-5">
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
            Calderwood
          </span>
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-md border border-canvas-border bg-canvas px-4 py-2 text-sm font-medium text-ink-900 transition hover:bg-canvas-tint focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
        >
          Log in
        </Link>
      </div>
    </header>
  );
}
