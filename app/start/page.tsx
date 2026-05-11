import Link from "next/link";

export const metadata = {
  title: "Start your assessment — Calderwood",
};

export default function StartPlaceholder() {
  return (
    <main className="mx-auto flex min-h-screen max-w-container flex-col px-6 sm:px-8">
      <div className="pt-10">
        <Link
          href="/"
          className="text-sm text-ink-500 transition hover:text-ink-900"
        >
          ← Back
        </Link>
      </div>
      <div className="flex flex-1 flex-col justify-center py-20">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-accent">
          Intake — coming next
        </p>
        <h1 className="mt-5 max-w-2xl text-balance text-4xl font-semibold tracking-tighter2 text-ink-900 sm:text-5xl">
          The intake form ships in the next checkpoint.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-700">
          We&rsquo;re building this in checkpoints. To be the first one we run an assessment for, send a one-line email and we&rsquo;ll reply within the day.
        </p>
        <div className="mt-10">
          <a
            href="mailto:hello@calderwoodtech.com?subject=I%20want%20a%20Calderwood%20fee%20assessment"
            className="inline-flex items-center justify-center rounded-md bg-ink-900 px-6 py-4 text-base font-medium text-white shadow-sm transition hover:bg-ink-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
          >
            Email hello@calderwoodtech.com
          </a>
        </div>
      </div>
    </main>
  );
}
