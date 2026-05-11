import Link from "next/link";

export const metadata = {
  title: "Terms — Calderwood",
};

export default function TermsStub() {
  return (
    <main className="mx-auto max-w-container px-6 sm:px-8 py-16">
      <Link
        href="/"
        className="text-sm text-ink-500 transition hover:text-ink-900"
      >
        ← Back
      </Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tightish text-ink-900 sm:text-4xl">
        Terms
      </h1>
      <p className="mt-6 max-w-prose text-base leading-relaxed text-ink-700">
        Placeholder. Full terms of service are published before payments go live.
      </p>
      <p className="mt-4 max-w-prose text-base leading-relaxed text-ink-700">
        Questions: <a href="mailto:hello@calderwoodtech.com" className="text-accent hover:underline">hello@calderwoodtech.com</a>
      </p>
    </main>
  );
}
