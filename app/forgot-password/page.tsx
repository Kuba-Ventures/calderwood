// Server component shell so we can opt out of Vercel's edge HTML cache.
// The interactive form lives in forgot-password-client.tsx as a "use client"
// module, matching the /login pattern.

import ForgotPasswordClient from "./forgot-password-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Reset your password | New Fee Schedule",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordClient />;
}
