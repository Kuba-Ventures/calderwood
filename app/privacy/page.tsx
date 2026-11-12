import Link from "next/link";

export const metadata = {
  title: "Privacy | New Fee Schedule",
};

const body = "mt-4 max-w-prose text-base leading-relaxed text-ink-700";
const heading = "mt-10 text-xl font-semibold text-ink-900";
const link = "text-accent underline hover:text-ink-900";

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
        We collect the data you submit through the intake form (zip code, fee schedule, carriers, contact info) and use it solely to produce and deliver your report. We never see patient data and the intake form is built to refuse PHI. We do not sell your data. Our website also uses Google Analytics and the Meta Pixel to measure visits and our ads, as described below.
      </p>

      <h2 className={heading}>Analytics</h2>
      <p className={body}>
        We use Google Analytics, loaded through Google Tag Manager, on every page of this site. It shows us how people find and use the site. It records the pages you view, how you arrived (for example from a search or an ad), your device and browser, and your approximate location based on your IP address.
      </p>

      <h2 className={heading}>Advertising and measurement</h2>
      <p className={body}>
        We use the Meta Pixel on every page to measure our ads on Facebook and Instagram. Google Ads uses the conversions recorded in Google Analytics to measure our Google ads.
      </p>
      <p className={body}>
        When you complete a paid checkout, we send a purchase event to Google Analytics and Meta. It contains the order value, the currency and the Stripe checkout session ID. It does not contain your name, your email address or anything you entered in the intake form.
      </p>

      <h2 className={heading}>Payments</h2>
      <p className={body}>
        Payments are handled by Stripe. Your card details go to Stripe, not to us, and we do not store your card number.
      </p>

      <h2 className={heading}>Cookies</h2>
      <p className={body}>
        Google Analytics, Google Tag Manager and the Meta Pixel use cookies and similar technology in your browser to recognize repeat visits and measure our ads. They load on every page. This site does not show a cookie banner. We also use cookies to keep you signed in to your account. Google and Meta handle the information they receive under their own privacy policies.
      </p>

      <h2 className={heading}>How to opt out</h2>
      <ul className="mt-4 max-w-prose list-disc space-y-2 pl-6 text-base leading-relaxed text-ink-700">
        <li>
          Block or delete cookies in your browser settings. Blocking all cookies will also sign you out.
        </li>
        <li>
          Install the{" "}
          <a href="https://tools.google.com/dlpage/gaoptout" className={link}>
            Google Analytics opt-out browser add-on
          </a>
          .
        </li>
        <li>
          Change your{" "}
          <a href="https://www.facebook.com/adpreferences" className={link}>
            Meta ad preferences
          </a>{" "}
          in your Facebook or Instagram settings.
        </li>
      </ul>

      <p className="mt-10 max-w-prose text-base leading-relaxed text-ink-700">
        Questions: <a href="mailto:sales@newfeeschedule.com" className="text-accent hover:underline">sales@newfeeschedule.com</a>
      </p>
    </main>
  );
}
