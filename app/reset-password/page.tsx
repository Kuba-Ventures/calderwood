// Server component shell so we can opt out of Vercel's edge HTML cache.
// The interactive form lives in reset-password-client.tsx as a "use client"
// module, matching the /login pattern.

import ResetPasswordClient from "./reset-password-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Choose a new password | New Fee Schedule",
};

export default function ResetPasswordPage() {
  return <ResetPasswordClient />;
}
