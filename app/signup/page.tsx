// Server shell for /signup — opts the route out of edge HTML caching.

import SignupClient from "./signup-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Sign up | New Fee Schedule",
};

export default function SignupPage() {
  return <SignupClient />;
}
