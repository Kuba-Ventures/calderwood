import Link from "next/link";

export const metadata = {
  title: "Sign in | Calderwood",
};

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-container px-6 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-md">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-accent">
          Sign in or get started
        </p>
        <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tighter2 text-ink-900 sm:text-4xl">
          Two ways in.
        </h1>

        <div className="mt-10 rounded-xl border border-canvas-border bg-canvas-tint p-6 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-accent">
            First time here
          </p>
          <p className="mt-3 text-base leading-relaxed text-ink-700">
            You don&rsquo;t need an account to get a report. We collect your email at checkout and send the PDF by email within 24 hours.
          </p>
          <Link
            href="/start"
            className="mt-5 inline-flex w-full items-center justify-center rounded-md bg-ink-900 px-6 py-4 text-base font-medium text-white shadow-sm transition hover:bg-ink-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
          >
            Get started
          </Link>
        </div>

        <div className="my-10 flex items-center gap-4">
          <div className="h-px flex-1 bg-canvas-border" />
          <p className="text-xs uppercase tracking-[0.14em] text-ink-400">
            Returning customer
          </p>
          <div className="h-px flex-1 bg-canvas-border" />
        </div>

        <form className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-ink-700"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              disabled
              placeholder="you@practice.com"
              className="mt-1.5 w-full rounded-md border border-canvas-border bg-canvas px-3 py-2.5 text-base text-ink-700 placeholder:text-ink-400 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-ink-700"
              >
                Password
              </label>
              <span className="text-sm text-ink-400">Forgot password?</span>
            </div>
            <input
              type="password"
              id="password"
              disabled
              placeholder="••••••••"
              className="mt-1.5 w-full rounded-md border border-canvas-border bg-canvas px-3 py-2.5 text-base text-ink-700 placeholder:text-ink-400 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
          <button
            type="submit"
            disabled
            className="w-full cursor-not-allowed rounded-md border border-canvas-border bg-canvas px-6 py-3 text-base font-medium text-ink-400"
          >
            Sign in (coming soon)
          </button>
        </form>

        <p className="mt-6 text-sm leading-relaxed text-ink-500">
          The customer dashboard launches with the first batch of reports. If you already paid and need your report resent, email{" "}
          <a
            href="mailto:hello@calderwoodtech.com"
            className="text-accent hover:underline"
          >
            hello@calderwoodtech.com
          </a>
          .
        </p>
      </div>
    </main>
  );
}
