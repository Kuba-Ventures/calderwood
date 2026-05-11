import Link from "next/link";

export const metadata = {
  title: "Privacy | Calderwood",
};

export default function PrivacyStub() {
  return (
    <main className="mx-auto max-w-container px-6 sm:px-8 py-16">
      <Link
        href="/"
        className="text-sm text-ink-500 transition hover:text-ink-900"
      >
        ← Back
      </Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tightish text-ink-900 sm:text-4xl">
        Privacy
      </h1>
      <p className="mt-6 max-w-prose text-base leading-relaxed text-ink-700">
        Placeholder. The full privacy policy is published before payments go live. In short: we collect only the data you submit through the intake form (zip code, fee schedule, carriers, contact info) and use it solely to produce and deliver your report. We never see patient data and the intake form is built to refuse PHI. We do not sell or share your data.
      </p>
      <p className="mt-4 max-w-prose text-base leading-relaxed text-ink-700">
        Questions: <a href="mailto:hello@calderwoodtech.com" className="text-accent hover:underline">hello@calderwoodtech.com</a>
      </p>
    </main>
  );
}
