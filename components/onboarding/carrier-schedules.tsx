"use client";

// Per-carrier fee-schedule capture. Master fees give a market-based report;
// adding each carrier's contracted rates upgrades it to a carrier-based one and
// unlocks the carrier ranking. One row per contracted carrier — drop a CSV /
// Excel / PDF, or paste a code+fee list. Each successful add recomputes the
// report server-side (/api/carrier-schedule), then we refresh.

import { ChangeEvent, useRef, useState } from "react";
import { browserSupabase, hasSupabaseEnv } from "@/lib/db/client";
import { parsePasteRows } from "@/components/onboarding/fee-step";

type RowStatus = "idle" | "working" | "done" | "error";

export function CarrierSchedules({
  carriers,
  haveData,
  onUpdated,
}: {
  carriers: string[];
  /** Carriers that already have a stored schedule (show as done). */
  haveData?: string[];
  /** Called after a successful add so the parent can refresh the report. */
  onUpdated?: () => void;
}) {
  if (carriers.length === 0) return null;
  const done = new Set(haveData ?? []);
  return (
    <div className="rounded-xl border border-canvas-border bg-canvas px-6 py-6 shadow-sm">
      <h3 className="text-base font-semibold text-ink-900">
        Per-carrier fee schedules
      </h3>
      <p className="mt-1 max-w-2xl text-sm text-ink-500">
        Optional, but this is what powers the carrier ranking. Add each plan&rsquo;s
        contracted rates (a CSV/Excel export, a PDF fee schedule, or pasted
        code+fee lines) and we&rsquo;ll show which carrier underpays you most. Your
        headline number becomes carrier-based once any are added.
      </p>
      <ul className="mt-4 divide-y divide-canvas-border">
        {carriers.map((c) => (
          <CarrierRow
            key={c}
            carrier={c}
            initiallyDone={done.has(c)}
            onUpdated={onUpdated}
          />
        ))}
      </ul>
    </div>
  );
}

function CarrierRow({
  carrier,
  initiallyDone,
  onUpdated,
}: {
  carrier: string;
  initiallyDone: boolean;
  onUpdated?: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<RowStatus>(initiallyDone ? "done" : "idle");
  const [message, setMessage] = useState<string | null>(
    initiallyDone ? "Schedule on file." : null
  );
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");

  async function post(body: Record<string, unknown>) {
    setStatus("working");
    setMessage(null);
    try {
      const res = await fetch("/api/carrier-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setStatus("error");
        setMessage(
          json.error === "no_codes_found"
            ? "Couldn't find code+fee rows in that. Try another file or paste."
            : json.error || "Something went wrong."
        );
        return;
      }
      setStatus("done");
      setMessage(`${json.count} rate${json.count === 1 ? "" : "s"} added.`);
      onUpdated?.();
    } catch {
      setStatus("error");
      setMessage("Upload failed. Try again.");
    }
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const lower = file.name.toLowerCase();
    const isPdf = lower.endsWith(".pdf") || file.type === "application/pdf";
    const isXlsx = lower.endsWith(".xlsx") || lower.endsWith(".xls");
    const isCsv = lower.endsWith(".csv") || file.type === "text/csv";

    if (isPdf) {
      if (!hasSupabaseEnv()) {
        setStatus("error");
        setMessage("Uploads aren't configured yet.");
        return;
      }
      setStatus("working");
      setMessage(null);
      try {
        const urlRes = await fetch("/api/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name }),
        });
        const urlJson = await urlRes.json();
        if (!urlRes.ok || !urlJson.token) {
          setStatus("error");
          setMessage(urlJson.error || "Upload failed.");
          return;
        }
        const up = await browserSupabase()
          .storage.from(urlJson.bucket)
          .uploadToSignedUrl(urlJson.path, urlJson.token, file);
        if (up.error) {
          setStatus("error");
          setMessage("Upload failed. Try again.");
          return;
        }
        await post({ carrier, fee: { method: "pdf", pdfPath: urlJson.path } });
      } catch {
        setStatus("error");
        setMessage("Upload failed. Try again.");
      }
      return;
    }

    if (isCsv || isXlsx) {
      try {
        let text: string;
        if (isXlsx) {
          const XLSX = await import("xlsx");
          const buf = await file.arrayBuffer();
          const wb = XLSX.read(buf, { type: "array" });
          text = XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]);
        } else {
          text = await file.text();
        }
        await post({
          carrier,
          fee: { method: isXlsx ? "xlsx" : "csv", csvText: text },
        });
      } catch {
        setStatus("error");
        setMessage("Couldn't read that file.");
      }
      return;
    }

    setStatus("error");
    setMessage("Use a CSV, Excel, or PDF — or paste the rates.");
  }

  async function submitPaste() {
    const rows = parsePasteRows(pasteText);
    if (rows.length === 0) {
      setStatus("error");
      setMessage("Add some CODE fee lines first.");
      return;
    }
    await post({ carrier, fee: { method: "paste", rows } });
    setPasteOpen(false);
    setPasteText("");
  }

  const busy = status === "working";

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-ink-900">{carrier}</span>
          {status === "done" && (
            <span className="text-xs font-medium text-gain-ink">✓ {message}</span>
          )}
          {status === "working" && (
            <span className="text-xs text-ink-500">Adding &amp; rebuilding…</span>
          )}
          {status === "error" && (
            <span className="text-xs text-red-600">{message}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/pdf,.pdf"
            onChange={onFile}
            className="hidden"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="rounded-md border border-canvas-border bg-canvas px-3 py-1 text-xs font-medium text-ink-700 transition hover:bg-canvas-tint disabled:opacity-50"
          >
            {status === "done" ? "Replace file" : "Upload file/PDF"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setPasteOpen((o) => !o)}
            className="text-xs font-medium text-accent hover:underline disabled:opacity-50"
          >
            {pasteOpen ? "Cancel" : "Paste"}
          </button>
        </div>
      </div>
      {pasteOpen && (
        <div className="mt-2">
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={5}
            placeholder={"D0120  52\nD1110  95\n…"}
            className="w-full rounded-md border border-canvas-border bg-canvas px-3 py-2 font-mono text-xs text-ink-900 placeholder:text-ink-400 focus:border-ink-900 focus:outline-none focus:ring-1 focus:ring-ink-900"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              disabled={busy}
              onClick={submitPaste}
              className="rounded-md bg-ink-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-ink-700 disabled:opacity-50"
            >
              Add {carrier} rates
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
