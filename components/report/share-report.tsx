"use client";

// "Share" control on the report. Mints a view-only link (/api/share), shows it
// with copy-to-clipboard, and lets the owner revoke it. Anyone with the link
// sees a read-only report — no login.

import { useState } from "react";

export function ShareReport() {
  const [url, setUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ensure() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/share", { method: "POST" });
      const json = await res.json();
      if (res.ok && json.url) {
        setUrl(json.url);
        setOpen(true);
      } else {
        setError(json.error || "Couldn't create a link.");
        setOpen(true);
      }
    } catch {
      setError("Couldn't create a link.");
      setOpen(true);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be unavailable; the input is selectable as fallback */
    }
  }

  async function revoke() {
    setBusy(true);
    try {
      await fetch("/api/share", { method: "DELETE" });
      setUrl(null);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        disabled={busy}
        onClick={() => (url ? setOpen((o) => !o) : ensure())}
        className="inline-flex items-center justify-center gap-1.5 rounded-md border border-canvas-border bg-canvas px-4 py-2.5 text-sm font-medium text-ink-700 shadow-sm transition hover:bg-canvas-tint disabled:opacity-60"
      >
        {busy ? "Working…" : "Share"}
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-2 w-80 rounded-md border border-canvas-border bg-canvas p-4 text-left shadow-lg">
          {error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : (
            <>
              <p className="text-xs text-ink-500">
                Anyone with this link can view a read-only copy of your report.
                No login needed.
              </p>
              <div className="mt-2 flex gap-2">
                <input
                  readOnly
                  value={url ?? ""}
                  onFocus={(e) => e.currentTarget.select()}
                  className="w-full rounded-md border border-canvas-border bg-canvas-tint px-2 py-1.5 text-xs text-ink-700 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={copy}
                  className="shrink-0 rounded-md bg-ink-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-ink-700"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <button
                type="button"
                onClick={revoke}
                disabled={busy}
                className="mt-3 text-xs font-medium text-red-600 hover:underline disabled:opacity-60"
              >
                Stop sharing
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
