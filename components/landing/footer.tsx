export function Footer() {
  return (
    <footer className="border-t border-canvas-border bg-canvas">
      <div className="mx-auto max-w-container px-6 sm:px-8 py-14 sm:py-16">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <a
              href="mailto:hello@calderwoodtech.com"
              className="text-base font-medium text-ink-900 transition hover:text-accent"
            >
              hello@calderwoodtech.com
            </a>
            <p className="mt-3 text-sm text-ink-500">Calderwood Tech LLC</p>
            <p className="mt-1 text-sm text-ink-500">© 2026</p>
          </div>
          <nav className="flex gap-6 text-sm text-ink-500">
            <a href="/privacy" className="transition hover:text-ink-900">
              Privacy
            </a>
            <a href="/terms" className="transition hover:text-ink-900">
              Terms
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
