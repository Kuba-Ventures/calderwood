import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t border-line bg-tint py-11">
      <div className="mx-auto flex max-w-wrap flex-wrap items-start justify-between gap-6 px-7 text-sm text-muted">
        <div>
          <div className="mb-2 flex items-center gap-2.5 font-display text-lg font-bold text-heading">
            <Image
              src="/logo.png"
              alt="New Fee Schedule"
              width={161}
              height={187}
              className="h-6 w-auto"
            />
            New Fee Schedule
          </div>
          <div>
            Built for independent practices ·{" "}
            <a
              href="mailto:support@newfeeschedule.com"
              className="transition hover:text-heading"
            >
              support@newfeeschedule.com
            </a>
          </div>
        </div>
        <div className="flex items-center gap-[22px]">
          <a href="/privacy" className="transition hover:text-heading">
            Privacy
          </a>
          <a href="/terms" className="transition hover:text-heading">
            Terms
          </a>
          <span>© 2026 Calderwood Tech LLC</span>
        </div>
      </div>
    </footer>
  );
}
