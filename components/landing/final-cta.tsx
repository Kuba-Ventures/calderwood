export function FinalCta() {
  return (
    <section className="bg-ink-900">
      <div className="mx-auto max-w-container px-6 py-24 text-center sm:px-8 sm:py-28">
        <h2 className="mx-auto max-w-[14ch] text-balance text-4xl font-semibold tracking-tighter2 text-white sm:text-[56px] sm:leading-[1.05]">
          Find out in 24 hours.
        </h2>
        <div className="mt-10 flex flex-col items-center gap-4">
          <a
            href="/login"
            className="group inline-flex items-center justify-center rounded-md bg-white px-7 py-4 text-base font-medium text-ink-900 shadow-sm transition hover:bg-canvas-tint focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <span className="border-b-2 border-transparent transition group-hover:border-gain">
              Get started for $199
            </span>
          </a>
          <p className="text-sm text-ink-300">
            $199 flat. No sales call. Report in your inbox in 24 hours.
          </p>
        </div>
      </div>
    </section>
  );
}
