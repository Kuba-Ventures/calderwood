import Link from "next/link";

export const metadata = {
  title: "Log in | Calderwood",
};

export default function LoginPlaceholder() {
  return (
    <main className="mx-auto flex max-w-container flex-col px-6 py-20 sm:px-8 sm:py-28">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-accent">
        Customer login
      </p>
      <h1 className="mt-5 max-w-2xl text-balance text-4xl font-semibold tracking-tighter2 text-ink-900 sm:text-5xl">
        Login is coming once the first reports ship.
      </h1>
      <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-700">
        For now, your report arrives by email and you don&rsquo;t need an account to receive it. Once the customer dashboard ships, this page will be the way back in.
      </p>
      <div className="mt-10">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-md bg-ink-900 px-6 py-4 text-base font-medium text-white shadow-sm transition hover:bg-ink-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
        >
          Back to the home page
        </Link>
      </div>
    </main>
  );
}
