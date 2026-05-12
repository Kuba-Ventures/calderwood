"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  Account,
  CARRIERS,
  Carrier,
  FeeEntry,
  Intake,
  account as accountStore,
  intake as intakeStore,
} from "@/lib/storage";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TOP_CDT: { code: string; label: string }[] = [
  { code: "D0120", label: "Periodic oral evaluation" },
  { code: "D0150", label: "Comprehensive oral evaluation" },
  { code: "D0210", label: "Intraoral, complete series" },
  { code: "D0220", label: "Intraoral periapical, first" },
  { code: "D0274", label: "Bitewings, four films" },
  { code: "D1110", label: "Prophylaxis, adult" },
  { code: "D1206", label: "Topical fluoride varnish" },
  { code: "D2140", label: "Amalgam, one surface" },
  { code: "D2330", label: "Resin, one surface anterior" },
  { code: "D2391", label: "Resin, one surface posterior" },
  { code: "D2392", label: "Resin, two surface posterior" },
  { code: "D2740", label: "Crown, porcelain/ceramic" },
  { code: "D2750", label: "Crown, porcelain fused to metal" },
  { code: "D3220", label: "Therapeutic pulpotomy" },
  { code: "D4341", label: "Perio scaling, 4+ teeth" },
  { code: "D4910", label: "Periodontal maintenance" },
  { code: "D5110", label: "Complete denture, maxillary" },
  { code: "D7140", label: "Extraction, erupted tooth" },
  { code: "D7210", label: "Surgical extraction" },
  { code: "D8080", label: "Comprehensive ortho, adolescent" },
];

type Step = number;
type FeeMethod = "csv" | "paste" | "manual";

export default function IntakePage() {
  const router = useRouter();
  const params = useSearchParams();
  const viewMode = params.get("view") === "1";

  const [hydrated, setHydrated] = useState(false);
  const [existing, setExisting] = useState<Intake | null>(null);

  const [step, setStep] = useState<Step>(0);
  const [firstName, setFirstName] = useState("");
  const [practiceName, setPracticeName] = useState("");
  const [primaryEmail, setPrimaryEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [zip, setZip] = useState("");
  const [providerCount, setProviderCount] = useState<number>(1);
  const [feeMethod, setFeeMethod] = useState<FeeMethod>("manual");
  const [feeFile, setFeeFile] = useState<File | null>(null);
  const [feePaste, setFeePaste] = useState("");
  const [feeManual, setFeeManual] = useState<FeeEntry[]>(
    TOP_CDT.map((c) => ({ code: c.code, fee: "" }))
  );
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Prefill identity from any existing account record so the user only
    // edits what's missing.
    const a = accountStore.get();
    if (a) {
      setFirstName(a.firstName ?? "");
      setPracticeName(a.practiceName ?? "");
      setPrimaryEmail(a.primaryEmail ?? "");
      setPhone(a.phone ?? "");
    }
    const e = intakeStore.get();
    setExisting(e);
    if (e && viewMode) {
      // Hydrate fields for read-only display.
      setZip(e.zip);
      setProviderCount(e.providerCount);
      setFeeMethod(e.feeMethod);
      setFeePaste(e.feePaste || "");
      if (e.feeManual) setFeeManual(e.feeManual);
      setCarriers(e.carriers);
    }
    setHydrated(true);
  }, [viewMode]);

  const filledManualCount = useMemo(
    () => feeManual.filter((r) => r.fee.trim()).length,
    [feeManual]
  );

  if (!hydrated) {
    return <div className="text-sm text-ink-400">Loading…</div>;
  }

  if (viewMode && existing) {
    return <SubmittedView intake={existing} />;
  }

  if (existing && !viewMode) {
    return (
      <AlreadySubmitted
        onView={() => router.push("/intake?view=1")}
        onResubmit={() => {
          if (
            window.confirm(
              "Replace your previous intake? Your in-progress report will be reset."
            )
          ) {
            intakeStore.clear();
            setExisting(null);
          }
        }}
      />
    );
  }

  function next() {
    setError(null);
    if (step === 0) {
      if (!firstName.trim()) {
        setError("Enter your first name.");
        return;
      }
      if (!practiceName.trim()) {
        setError("Enter your practice name.");
        return;
      }
      if (!EMAIL_RE.test(primaryEmail.trim())) {
        setError("Enter a valid email address.");
        return;
      }
      if (!/^\d{5}$/.test(zip.trim())) {
        setError("Enter a 5-digit ZIP code.");
        return;
      }
      if (!Number.isFinite(providerCount) || providerCount < 1) {
        setError("Provider count must be at least 1.");
        return;
      }
    }
    if (step === 1) {
      if (feeMethod === "csv" && !feeFile) {
        setError("Choose a CSV file or switch input method.");
        return;
      }
      if (feeMethod === "paste" && !feePaste.trim()) {
        setError("Paste your fee schedule or switch input method.");
        return;
      }
      if (feeMethod === "manual" && filledManualCount === 0) {
        setError("Enter at least one fee or switch input method.");
        return;
      }
    }
    if (step === 2) {
      if (carriers.length === 0) {
        setError("Select at least one carrier.");
        return;
      }
    }
    setStep((s) => Math.min(3, s + 1));
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  }

  function submit() {
    const payload: Intake = {
      zip: zip.trim(),
      providerCount,
      feeMethod,
      feeFilename: feeFile?.name,
      feePaste: feeMethod === "paste" ? feePaste : undefined,
      feeManual:
        feeMethod === "manual"
          ? feeManual.filter((r) => r.fee.trim())
          : undefined,
      carriers,
      submittedAt: new Date().toISOString(),
    };
    intakeStore.set(payload);

    // Intake doubles as account onboarding. Persist identity to cw_account so
    // the topbar, dashboard email banner, and report wording all reflect it
    // without forcing the user to also visit /account.
    const existingAccount = accountStore.get();
    const accountPayload: Account = {
      firstName: firstName.trim() || undefined,
      practiceName: practiceName.trim(),
      primaryEmail: primaryEmail.trim(),
      billingEmail: existingAccount?.billingEmail || primaryEmail.trim(),
      phone: phone.trim() || existingAccount?.phone || undefined,
    };
    accountStore.set(accountPayload);

    router.push("/dashboard");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Stepper current={step} />
      <div className="mt-8 rounded-xl border border-canvas-border bg-canvas px-8 py-10 shadow-sm sm:px-12">
        {step === 0 && (
          <StepPracticeDetails
            firstName={firstName}
            setFirstName={setFirstName}
            practiceName={practiceName}
            setPracticeName={setPracticeName}
            primaryEmail={primaryEmail}
            setPrimaryEmail={setPrimaryEmail}
            phone={phone}
            setPhone={setPhone}
            zip={zip}
            setZip={setZip}
            providerCount={providerCount}
            setProviderCount={setProviderCount}
          />
        )}
        {step === 1 && (
          <StepFees
            feeMethod={feeMethod}
            setFeeMethod={setFeeMethod}
            feeFile={feeFile}
            setFeeFile={setFeeFile}
            feePaste={feePaste}
            setFeePaste={setFeePaste}
            feeManual={feeManual}
            setFeeManual={setFeeManual}
          />
        )}
        {step === 2 && (
          <StepCarriers carriers={carriers} setCarriers={setCarriers} />
        )}
        {step === 3 && (
          <StepReview
            firstName={firstName}
            practiceName={practiceName}
            primaryEmail={primaryEmail}
            phone={phone}
            zip={zip}
            providerCount={providerCount}
            feeMethod={feeMethod}
            feeFile={feeFile}
            feePaste={feePaste}
            feeManual={feeManual}
            carriers={carriers}
          />
        )}

        {error && (
          <p className="mt-6 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={back}
            disabled={step === 0}
            className="inline-flex items-center justify-center rounded-md border border-canvas-border bg-canvas px-5 py-2.5 text-sm font-medium text-ink-700 transition hover:bg-canvas-tint disabled:cursor-not-allowed disabled:opacity-40"
          >
            Back
          </button>
          {step < 3 ? (
            <button
              type="button"
              onClick={next}
              className="inline-flex items-center justify-center rounded-md bg-ink-900 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-ink-700"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              className="inline-flex items-center justify-center rounded-md bg-ink-900 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-ink-700"
            >
              Submit intake
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const STEP_LABELS = ["Practice", "Fee schedule", "Carriers", "Review"];

function Stepper({ current }: { current: Step }) {
  return (
    <ol className="flex items-center gap-2 text-xs">
      {STEP_LABELS.map((label, i) => {
        const state =
          i < current ? "done" : i === current ? "active" : "pending";
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                state === "done"
                  ? "bg-gain text-white"
                  : state === "active"
                  ? "bg-ink-900 text-white"
                  : "bg-canvas-tint2 text-ink-400"
              }`}
            >
              {state === "done" ? "✓" : i + 1}
            </span>
            <span
              className={`hidden sm:inline ${
                state === "active"
                  ? "font-medium text-ink-900"
                  : "text-ink-400"
              }`}
            >
              {label}
            </span>
            {i < STEP_LABELS.length - 1 && (
              <span className="mx-1 h-px w-6 bg-canvas-border sm:w-8" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function StepPracticeDetails({
  firstName,
  setFirstName,
  practiceName,
  setPracticeName,
  primaryEmail,
  setPrimaryEmail,
  phone,
  setPhone,
  zip,
  setZip,
  providerCount,
  setProviderCount,
}: {
  firstName: string;
  setFirstName: (v: string) => void;
  practiceName: string;
  setPracticeName: (v: string) => void;
  primaryEmail: string;
  setPrimaryEmail: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  zip: string;
  setZip: (v: string) => void;
  providerCount: number;
  setProviderCount: (n: number) => void;
}) {
  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tighter2 text-ink-900">
        Tell us about your practice.
      </h2>
      <p className="mt-2 text-sm text-ink-500">
        How to label your report and where to send it.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          id="firstName"
          label="Your first name"
          value={firstName}
          onChange={setFirstName}
          placeholder="Finley"
          autoComplete="given-name"
        />
        <Field
          id="practiceName"
          label="Practice name"
          value={practiceName}
          onChange={setPracticeName}
          placeholder="Calderwood Dental"
          autoComplete="organization"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          id="primaryEmail"
          label="Email for the report"
          type="email"
          value={primaryEmail}
          onChange={setPrimaryEmail}
          placeholder="owner@practice.com"
          autoComplete="email"
        />
        <Field
          id="phone"
          label="Phone (optional)"
          value={phone}
          onChange={setPhone}
          placeholder="(415) 555-0123"
          autoComplete="tel"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="zip" className="block text-sm font-medium text-ink-700">
            Practice ZIP
          </label>
          <input
            id="zip"
            type="text"
            inputMode="numeric"
            maxLength={5}
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, ""))}
            placeholder="94110"
            autoComplete="postal-code"
            className="mt-1.5 w-full rounded-md border border-canvas-border bg-canvas px-3 py-2.5 text-base text-ink-900 placeholder:text-ink-400 focus:border-ink-900 focus:outline-none focus:ring-1 focus:ring-ink-900"
          />
          <p className="mt-1.5 text-xs text-ink-400">
            UCR is benchmarked locally. Use your office address, not billing.
          </p>
        </div>
        <div>
          <label
            htmlFor="providerCount"
            className="block text-sm font-medium text-ink-700"
          >
            Providers billing under your TIN
          </label>
          <input
            id="providerCount"
            type="number"
            min={1}
            value={providerCount}
            onChange={(e) =>
              setProviderCount(parseInt(e.target.value || "1", 10))
            }
            className="mt-1.5 w-full rounded-md border border-canvas-border bg-canvas px-3 py-2.5 text-base text-ink-900 focus:border-ink-900 focus:outline-none focus:ring-1 focus:ring-ink-900"
          />
          <p className="mt-1.5 text-xs text-ink-400">
            Owners, associates, hygienists who bill independently.
          </p>
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
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
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
        autoComplete={autoComplete}
        className="mt-1.5 w-full rounded-md border border-canvas-border bg-canvas px-3 py-2.5 text-base text-ink-900 placeholder:text-ink-400 focus:border-ink-900 focus:outline-none focus:ring-1 focus:ring-ink-900"
      />
    </div>
  );
}

function StepFees({
  feeMethod,
  setFeeMethod,
  feeFile,
  setFeeFile,
  feePaste,
  setFeePaste,
  feeManual,
  setFeeManual,
}: {
  feeMethod: FeeMethod;
  setFeeMethod: (m: FeeMethod) => void;
  feeFile: File | null;
  setFeeFile: (f: File | null) => void;
  feePaste: string;
  setFeePaste: (v: string) => void;
  feeManual: FeeEntry[];
  setFeeManual: (v: FeeEntry[]) => void;
}) {
  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFeeFile(f);
  }

  function setManualFee(idx: number, value: string) {
    const next = feeManual.slice();
    next[idx] = { ...next[idx], fee: value };
    setFeeManual(next);
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tighter2 text-ink-900">
        Send us your fee schedule.
      </h2>
      <p className="mt-2 text-sm text-ink-500">
        Your master fees, not contracted rates. Pick whichever method is
        easiest.
      </p>

      <div className="mt-6 inline-flex rounded-md border border-canvas-border bg-canvas-tint p-0.5 text-sm">
        {([
          ["manual", "Top 20 codes"],
          ["csv", "Upload CSV"],
          ["paste", "Paste"],
        ] as [FeeMethod, string][]).map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => setFeeMethod(m)}
            className={`rounded-[6px] px-3 py-1.5 transition ${
              feeMethod === m
                ? "bg-canvas text-ink-900 shadow-sm"
                : "text-ink-500 hover:text-ink-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {feeMethod === "csv" && (
          <div>
            <label className="block text-sm font-medium text-ink-700">
              CSV file
            </label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={onFile}
              className="mt-1.5 block w-full text-sm text-ink-700 file:mr-4 file:rounded-md file:border-0 file:bg-ink-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-ink-700"
            />
            {feeFile && (
              <p className="mt-2 text-xs text-ink-500">
                Selected: {feeFile.name} ({Math.round(feeFile.size / 1024)} KB)
              </p>
            )}
            <p className="mt-3 text-xs text-ink-400">
              Two columns: CDT code, fee. We&rsquo;ll handle most exports from
              Dentrix, Eaglesoft, Open Dental, etc.
            </p>
          </div>
        )}
        {feeMethod === "paste" && (
          <div>
            <label className="block text-sm font-medium text-ink-700">
              Paste fee list
            </label>
            <textarea
              value={feePaste}
              onChange={(e) => setFeePaste(e.target.value)}
              rows={10}
              placeholder={"D0120  65\nD0150  102\nD1110  118\n…"}
              className="mt-1.5 w-full rounded-md border border-canvas-border bg-canvas px-3 py-2 font-mono text-sm text-ink-900 placeholder:text-ink-400 focus:border-ink-900 focus:outline-none focus:ring-1 focus:ring-ink-900"
            />
          </div>
        )}
        {feeMethod === "manual" && (
          <div>
            <p className="text-xs text-ink-500">
              Fill what you can. Blank rows are skipped.
            </p>
            <div className="mt-3 max-h-96 overflow-y-auto rounded-md border border-canvas-border">
              <table className="w-full text-sm">
                <thead className="bg-canvas-tint text-left text-xs uppercase tracking-wide text-ink-400">
                  <tr>
                    <th className="w-20 px-3 py-2">Code</th>
                    <th className="px-3 py-2">Procedure</th>
                    <th className="w-28 px-3 py-2">Your fee</th>
                  </tr>
                </thead>
                <tbody>
                  {TOP_CDT.map((c, i) => (
                    <tr key={c.code} className="border-t border-canvas-border">
                      <td className="px-3 py-1.5 font-mono text-xs text-ink-700">
                        {c.code}
                      </td>
                      <td className="px-3 py-1.5 text-ink-700">{c.label}</td>
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-1">
                          <span className="text-ink-400">$</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={feeManual[i]?.fee ?? ""}
                            onChange={(e) =>
                              setManualFee(
                                i,
                                e.target.value.replace(/[^\d.]/g, "")
                              )
                            }
                            className="w-20 rounded border border-canvas-border bg-canvas px-2 py-1 text-sm text-ink-900 focus:border-ink-900 focus:outline-none focus:ring-1 focus:ring-ink-900"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepCarriers({
  carriers,
  setCarriers,
}: {
  carriers: Carrier[];
  setCarriers: (v: Carrier[]) => void;
}) {
  function toggle(c: Carrier) {
    if (carriers.includes(c)) {
      setCarriers(carriers.filter((x) => x !== c));
    } else {
      setCarriers([...carriers, c]);
    }
  }
  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tighter2 text-ink-900">
        Which carriers do you currently contract with?
      </h2>
      <p className="mt-2 text-sm text-ink-500">
        Pick every PPO contract that pays you. We&rsquo;ll rank them lowest to
        highest in your report.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {CARRIERS.map((c) => {
          const on = carriers.includes(c);
          return (
            <label
              key={c}
              className={`flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-sm transition ${
                on
                  ? "border-ink-900 bg-canvas text-ink-900"
                  : "border-canvas-border bg-canvas text-ink-700 hover:border-ink-200"
              }`}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => toggle(c)}
                className="h-4 w-4 rounded border-canvas-border text-ink-900 focus:ring-ink-900"
              />
              <span className={on ? "font-medium" : ""}>{c}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function StepReview({
  firstName,
  practiceName,
  primaryEmail,
  phone,
  zip,
  providerCount,
  feeMethod,
  feeFile,
  feePaste,
  feeManual,
  carriers,
}: {
  firstName: string;
  practiceName: string;
  primaryEmail: string;
  phone: string;
  zip: string;
  providerCount: number;
  feeMethod: FeeMethod;
  feeFile: File | null;
  feePaste: string;
  feeManual: FeeEntry[];
  carriers: Carrier[];
}) {
  const filledManual = feeManual.filter((r) => r.fee.trim());
  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tighter2 text-ink-900">
        Review and submit.
      </h2>
      <p className="mt-2 text-sm text-ink-500">
        Double-check the ZIP and email. Wrong values waste your 24-hour
        turnaround.
      </p>
      <dl className="mt-6 divide-y divide-canvas-border rounded-md border border-canvas-border bg-canvas-tint">
        <Row label="Your name" value={firstName || "(not set)"} />
        <Row label="Practice" value={practiceName || "(not set)"} />
        <Row label="Report email" value={primaryEmail || "(not set)"} />
        {phone && <Row label="Phone" value={phone} />}
        <Row label="ZIP code" value={zip} />
        <Row
          label="Providers"
          value={`${providerCount} ${providerCount === 1 ? "provider" : "providers"}`}
        />
        <Row
          label="Fee schedule"
          value={
            feeMethod === "csv"
              ? feeFile
                ? `CSV: ${feeFile.name}`
                : "CSV (no file selected)"
              : feeMethod === "paste"
              ? `Pasted (${feePaste.split("\n").filter(Boolean).length} lines)`
              : `${filledManual.length} of ${TOP_CDT.length} top codes filled`
          }
        />
        <Row
          label="Carriers"
          value={carriers.length ? carriers.join(", ") : "None"}
        />
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
      <dt className="text-ink-500">{label}</dt>
      <dd className="text-right font-medium text-ink-900">{value}</dd>
    </div>
  );
}

function SubmittedView({ intake }: { intake: Intake }) {
  const a = accountStore.get();
  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/dashboard"
        className="text-sm text-ink-500 hover:text-ink-900"
      >
        ← Back to dashboard
      </Link>
      <div className="mt-4 rounded-xl border border-canvas-border bg-canvas px-8 py-10 shadow-sm">
        <h2 className="text-2xl font-semibold tracking-tighter2 text-ink-900">
          Submitted intake
        </h2>
        <p className="mt-1 text-sm text-ink-500">
          Submitted {new Date(intake.submittedAt).toLocaleString()}
        </p>
        <dl className="mt-6 divide-y divide-canvas-border rounded-md border border-canvas-border bg-canvas-tint">
          {a?.firstName && <Row label="Your name" value={a.firstName} />}
          {a?.practiceName && <Row label="Practice" value={a.practiceName} />}
          {a?.primaryEmail && (
            <Row label="Report email" value={a.primaryEmail} />
          )}
          {a?.phone && <Row label="Phone" value={a.phone} />}
          <Row label="ZIP code" value={intake.zip} />
          <Row
            label="Providers"
            value={`${intake.providerCount} ${
              intake.providerCount === 1 ? "provider" : "providers"
            }`}
          />
          <Row
            label="Fee schedule"
            value={
              intake.feeMethod === "csv"
                ? `CSV: ${intake.feeFilename ?? "(file)"}`
                : intake.feeMethod === "paste"
                ? `Pasted (${(intake.feePaste ?? "").split("\n").filter(Boolean).length} lines)`
                : `${intake.feeManual?.length ?? 0} codes provided`
            }
          />
          <Row
            label="Carriers"
            value={intake.carriers.length ? intake.carriers.join(", ") : "None"}
          />
        </dl>
        <p className="mt-6 text-sm text-ink-500">
          See something wrong?{" "}
          <a
            href="mailto:hello@calderwoodtech.com?subject=Correction%20to%20my%20intake"
            className="text-accent hover:underline"
          >
            Email us
          </a>{" "}
          before the 24-hour window closes.
        </p>
      </div>
    </div>
  );
}

function AlreadySubmitted({
  onView,
  onResubmit,
}: {
  onView: () => void;
  onResubmit: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl rounded-xl border border-canvas-border bg-canvas px-8 py-10 text-center shadow-sm">
      <h2 className="text-2xl font-semibold tracking-tighter2 text-ink-900">
        You&rsquo;ve already submitted intake.
      </h2>
      <p className="mt-2 text-sm text-ink-500">
        We&rsquo;re working on your report. If something needs to change, view
        what you sent or contact us.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={onView}
          className="inline-flex items-center justify-center rounded-md bg-ink-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-ink-700"
        >
          View submitted intake
        </button>
        <button
          type="button"
          onClick={onResubmit}
          className="inline-flex items-center justify-center rounded-md border border-canvas-border bg-canvas px-5 py-2.5 text-sm font-medium text-ink-700 hover:bg-canvas-tint"
        >
          Start over
        </button>
      </div>
    </div>
  );
}
