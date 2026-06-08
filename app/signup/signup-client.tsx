"use client";

// /signup now hosts the fused onboarding wizard (account + fee intake in one
// flow). The previous standalone email/password form is retired — intake is
// part of signup so the dentist reaches the fee step in a single click.

import OnboardingWizard from "@/components/onboarding/wizard";

export default function SignupClient() {
  return <OnboardingWizard />;
}
