"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Account, account as accountStore, auth } from "@/lib/storage";

export default function AccountPage() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [practiceName, setPracticeName] = useState("");
  const [primaryEmail, setPrimaryEmail] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [billingMatchesPrimary, setBillingMatchesPrimary] = useState(true);
  const [phone, setPhone] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const a = accountStore.get();
    if (a) {
      setFirstName(a.firstName ?? "");
      setPracticeName(a.practiceName);
      setPrimaryEmail(a.primaryEmail);
      setBillingEmail(a.billingEmail);
      setBillingMatchesPrimary(a.billingEmail === a.primaryEmail);
      setPhone(a.phone ?? "");
    }
    setHydrated(true);
  }, []);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const payload: Account = {
      firstName: firstName.trim() || undefined,
      practiceName: practiceName.trim(),
      primaryEmail: primaryEmail.trim(),
      billingEmail: (billingMatchesPrimary ? primaryEmail : billingEmail).trim(),
      phone: phone.trim() || undefined,
    };
    accountStore.set(payload);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function signOut() {
    auth.signOut();
    router.replace("/login");
  }

  if (!hydrated) {
    return <div className="text-sm text-ink-400">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-xl">
      <form onSubmit={onSubmit} className="space-y-6 rounded-xl border border-canvas-border bg-canvas px-8 py-10 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold tracking-tightish text-ink-900">
            Practice details
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            Used on your report and any correspondence.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            id="firstName"
            label="First name"
            value={firstName}
            onChange={setFirstName}
            placeholder="Finley"
          />
          <Field
            id="practiceName"
            label="Practice name"
            value={practiceName}
            onChange={setPracticeName}
            placeholder="Calderwood Dental"
          />
        </div>
        <Field
          id="primaryEmail"
          label="Primary email"
          type="email"
          value={primaryEmail}
          onChange={setPrimaryEmail}
          placeholder="owner@practice.com"
        />

        <div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={billingMatchesPrimary}
              onChange={(e) => setBillingMatchesPrimary(e.target.checked)}
              className="h-4 w-4 rounded border-canvas-border text-ink-900 focus:ring-ink-900"
            />
            Billing email matches primary
          </label>
          {!billingMatchesPrimary && (
            <div className="mt-3">
              <Field
                id="billingEmail"
                label="Billing email"
                type="email"
                value={billingEmail}
                onChange={setBillingEmail}
                placeholder="billing@practice.com"
              />
            </div>
          )}
        </div>

        <Field
          id="phone"
          label="Phone (optional)"
          value={phone}
          onChange={setPhone}
          placeholder="(415) 555-0123"
        />

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md bg-ink-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-ink-700"
          >
            Save changes
          </button>
          {saved && (
            <span className="text-sm text-gain-ink">Saved.</span>
          )}
        </div>
      </form>

      <div className="mt-6 rounded-xl border border-dashed border-canvas-border bg-canvas px-8 py-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-ink-900">
              Business profile
            </h3>
            <p className="mt-1 text-xs text-ink-500">
              Tax ID, NPI, mailing address, additional locations.
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-canvas-tint2 px-2.5 py-0.5 text-xs font-medium text-ink-500">
            Coming soon
          </span>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-canvas-border bg-canvas px-8 py-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-ink-900">Sign out</h3>
            <p className="text-xs text-ink-500">
              End this session on this browser.
            </p>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="inline-flex items-center justify-center rounded-md border border-canvas-border bg-canvas px-4 py-2 text-sm font-medium text-ink-700 hover:bg-canvas-tint"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink-700">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-md border border-canvas-border bg-canvas px-3 py-2.5 text-base text-ink-900 placeholder:text-ink-400 focus:border-ink-900 focus:outline-none focus:ring-1 focus:ring-ink-900"
      />
    </div>
  );
}
