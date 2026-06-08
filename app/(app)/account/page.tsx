"use client";

// Account details, sourced from Supabase (auth user + practices row) via
// /api/account. Email is the sign-in identity (read-only here); practice name
// and phone persist to the DB. Replaces the old localStorage-backed page that
// could show a different account's stale demo identity.

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { browserSupabase, hasSupabaseEnv } from "@/lib/db/client";

export default function AccountPage() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [email, setEmail] = useState("");
  const [practiceName, setPracticeName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/account", { cache: "no-store" });
        const json = await res.json();
        if (cancelled) return;
        if (res.ok) {
          setEmail(json.email ?? "");
          setPracticeName(json.practiceName ?? "");
          setPhone(json.phone ?? "");
        } else {
          setError("Couldn't load your account. Try refreshing.");
        }
      } catch {
        if (!cancelled) setError("Couldn't load your account. Try refreshing.");
      } finally {
        if (!cancelled) setHydrated(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ practiceName: practiceName.trim(), phone: phone.trim() }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error || "Couldn't save. Try again.");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    if (hasSupabaseEnv()) {
      await browserSupabase().auth.signOut();
    }
    router.replace("/login");
  }

  if (!hydrated) {
    return <div className="text-sm text-ink-400">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-xl">
      <form
        onSubmit={onSubmit}
        className="space-y-6 rounded-xl border border-canvas-border bg-canvas px-8 py-10 shadow-sm"
      >
        <div>
          <h2 className="text-xl font-semibold tracking-tightish text-ink-900">
            Practice details
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            Used on your report and any correspondence.
          </p>
        </div>

        <div>
          <label
            htmlFor="primaryEmail"
            className="block text-sm font-medium text-ink-700"
          >
            Sign-in email
          </label>
          <input
            id="primaryEmail"
            type="email"
            value={email}
            readOnly
            className="mt-1.5 w-full cursor-not-allowed rounded-md border border-canvas-border bg-canvas-tint px-3 py-2.5 text-base text-ink-500"
          />
          <p className="mt-1 text-xs text-ink-400">
            This is the account you&rsquo;re signed in as. To change it, email
            hello@calderwoodtech.com.
          </p>
        </div>

        <Field
          id="practiceName"
          label="Practice name"
          value={practiceName}
          onChange={setPracticeName}
          placeholder="Calderwood Dental"
        />

        <Field
          id="phone"
          label="Phone (optional)"
          value={phone}
          onChange={setPhone}
          placeholder="(415) 555-0123"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center rounded-md bg-ink-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-ink-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          {saved && <span className="text-sm text-gain-ink">Saved.</span>}
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
