import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t border-canvas-border bg-canvas">
      <div className="mx-auto max-w-container px-6 py-12 sm:px-8 sm:py-14">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <Image
                src="/logo.png"
                alt=""
                width={161}
                height={187}
                className="h-7 w-auto"
              />
              <span className="text-base font-semibold tracking-tightish text-ink-900">
                Calderwood
              </span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-ink-500">
              Built for independent practices.
            </p>
          </div>
          <div className="flex flex-col gap-2 text-sm text-ink-500 sm:items-end">
            <a
              href="mailto:hello@calderwoodtech.com"
              className="font-medium text-ink-900 transition hover:text-accent"
            >
              hello@calderwoodtech.com
            </a>
            <p>© 2026 Calderwood Tech LLC</p>
            <div className="flex gap-4 pt-2 text-xs">
              <a href="/privacy" className="transition hover:text-ink-900">
                Privacy
              </a>
              <a href="/terms" className="transition hover:text-ink-900">
                Terms
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
