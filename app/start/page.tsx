// /start now points at the live onboarding wizard. Kept as a stable entry URL
// (older links / marketing point here) but the intake itself lives at /signup.

import { redirect } from "next/navigation";

export default function StartPage() {
  redirect("/signup");
}
