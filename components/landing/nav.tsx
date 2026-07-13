import Image from "next/image";
import Link from "next/link";

export function LandingNav() {
  return (
    <nav className="sticky top-0 z-[60] border-b border-line bg-white/[0.78] backdrop-blur-[14px]">
      <div className="mx-auto flex h-[66px] max-w-wrap items-center justify-between px-7">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
        >
          <Image
            src="/logo.png"
            alt="Calderwood"
            width={161}
            height={187}
            priority
            className="h-[30px] w-auto"
          />
          <span className="font-display text-[20px] font-bold text-heading">
            Calderwood
          </span>
        </Link>
        <div className="flex items-center gap-5">
          <Link
            href="/login"
            className="hidden text-[15px] font-semibold text-muted transition hover:text-heading sm:inline"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="bg-grad-brand rounded-[10px] px-[17px] py-[9px] text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgba(30,47,209,0.8)] transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Get started
          </Link>
        </div>
      </div>
    </nav>
  );
}
