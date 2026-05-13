// Server component shell so we can opt out of Vercel's edge HTML cache.
// The interactive form lives in login-client.tsx as a "use client" module.

import LoginClient from "./login-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Sign in | Calderwood",
};

export default function LoginPage() {
  return <LoginClient />;
}
