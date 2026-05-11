import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Sign in | Calderwood",
};

export default function LoginPage() {
  return (
    <main className="bg-canvas-tint">
      <div className="mx-auto flex min-h-[calc(100vh-65px)] w-full max-w-md flex-col items-center justify-center px-6 py-16 sm:px-8 sm:py-20">
        <Image
          src="/logo.png"
          alt=""
          width={161}
          height={187}
          priority
          className="h-20 w-auto sm:h-24"
        />
        <h1 className="mt-6 text-center text-4xl font-semibold tracking-tighter2 text-ink-900 sm:text-5xl">
          Calderwood
        </h1>
        <p className="mt-3 text-center text-base text-ink-500">
          Get your fee assessment
        </p>

        <div className="mt-10 w-full">
          <Link
            href="/start"
            className="inline-flex w-full items-center justify-center rounded-md bg-ink-900 px-6 py-4 text-base font-medium text-white shadow-sm transition hover:bg-ink-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
          >
            Get started
          </Link>
          <p className="mt-3 text-center text-sm text-ink-500">
            No account needed. Email captured at checkout.
          </p>
        </div>

        <div className="my-10 flex w-full items-center gap-4">
          <div className="h-px flex-1 bg-canvas-border" />
          <p className="text-xs uppercase tracking-[0.14em] text-ink-400">
            Returning customer
          </p>
          <div className="h-px flex-1 bg-canvas-border" />
        </div>

        <form className="w-full space-y-4">
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

        <p className="mt-6 text-center text-sm leading-relaxed text-ink-500">
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
