"use client";

// Flexible fee-schedule input — "meet the dentist where it's easiest".
// Four methods sharing one segmented control: Upload (CSV/XLSX, default,
// drag-and-drop, auto column-mapping), Paste, Top 20 grid, EOB image (OCR stub).
//
// The component is controlled: the parent holds a FeeDraft and passes setDraft.
// Helpers here (emptyFeeDraft / isFeeValid / buildFeePayload) turn the draft
// into the JSON payload /api/onboard expects. Styling mirrors the existing
// intake fee step exactly — no new tokens.

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { parseCsv } from "@/lib/parser/csv";
import { browserSupabase, hasSupabaseEnv } from "@/lib/db/client";
import { TOP_CDT } from "@/lib/data/top-cdt";

export type FeeTab = "upload" | "pdf" | "paste" | "manual" | "eob";
export type FeeMethod = "csv" | "xlsx" | "pdf" | "paste" | "manual" | "eob";

export type ManualRow = { code: string; fee: string };

export type FeeDraft = {
  tab: FeeTab;
  // upload
  file: File | null;
  uploadKind: "csv" | "xlsx" | null;
  csvText: string | null;
  uploadError: string | null;
  previewCount: number | null;
  // pdf (PM "Procedure Summary" report — extracted via Claude)
  pdfFile: File | null;
  pdfStatus: "idle" | "uploading" | "parsing" | "done" | "error";
  pdfPath: string | null;
  pdfRows: ManualRow[];
  pdfFrequencies: Record<string, number>;
  pdfCount: number | null;
  pdfMessage: string | null;
  // paste
  pasteText: string;
  // manual
  manual: ManualRow[];
  // eob
  eobFile: File | null;
  eobPath: string | null;
  eobStatus: "idle" | "uploading" | "done" | "error";
  eobMessage: string | null;
};

export type FeePayload =
  | { method: "csv" | "xlsx"; csvText: string; filename?: string }
  | { method: "paste" | "manual"; rows: ManualRow[] }
  | {
      method: "pdf";
      rows: ManualRow[];
      frequencies: Record<string, number>;
      pdfPath?: string;
      filename?: string;
    }
  | { method: "eob"; eobPath: string; filename?: string };

export function emptyFeeDraft(): FeeDraft {
  return {
    tab: "upload",
    file: null,
    uploadKind: null,
    csvText: null,
    uploadError: null,
    previewCount: null,
    pdfFile: null,
    pdfStatus: "idle",
    pdfPath: null,
    pdfRows: [],
    pdfFrequencies: {},
    pdfCount: null,
    pdfMessage: null,
    pasteText: "",
    manual: TOP_CDT.map((c) => ({ code: c.code, fee: "" })),
    eobFile: null,
    eobPath: null,
    eobStatus: "idle",
    eobMessage: null,
  };
}

/** Parse "D0120  65" / "D0120,65" lines into rows. Server re-validates. */
export function parsePasteRows(text: string): ManualRow[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/[,\t ]+/).filter(Boolean);
      const code = parts[0] ?? "";
      const fee = parts[parts.length - 1] ?? "";
      return { code, fee };
    })
    .filter((r) => r.code);
}

export function isFeeValid(d: FeeDraft): boolean {
  switch (d.tab) {
    case "upload":
      return !!d.csvText && (d.previewCount ?? 0) > 0;
    case "pdf":
      return d.pdfStatus === "done" && d.pdfRows.length > 0;
    case "paste":
      return parsePasteRows(d.pasteText).length > 0;
    case "manual":
      return d.manual.some((r) => r.fee.trim());
    case "eob":
      return d.eobStatus === "done" && !!d.eobPath;
  }
}

export function buildFeePayload(d: FeeDraft): FeePayload | null {
  switch (d.tab) {
    case "upload":
      if (!d.csvText || !d.uploadKind) return null;
      return { method: d.uploadKind, csvText: d.csvText, filename: d.file?.name };
    case "pdf":
      return d.pdfRows.length
        ? {
            method: "pdf",
            rows: d.pdfRows,
            frequencies: d.pdfFrequencies,
            pdfPath: d.pdfPath ?? undefined,
            filename: d.pdfFile?.name,
          }
        : null;
    case "paste": {
      const rows = parsePasteRows(d.pasteText);
      return rows.length ? { method: "paste", rows } : null;
    }
    case "manual": {
      const rows = d.manual.filter((r) => r.fee.trim());
      return rows.length ? { method: "manual", rows } : null;
    }
    case "eob":
      return d.eobPath ? { method: "eob", eobPath: d.eobPath, filename: d.eobFile?.name } : null;
  }
}

const TABS: [FeeTab, string][] = [
  ["upload", "Upload CSV/XLSX"],
  ["pdf", "PDF report"],
  ["paste", "Paste"],
  ["manual", "Top 20 codes"],
  ["eob", "EOB image"],
];

export function FeeStep({
  draft,
  setDraft,
}: {
  draft: FeeDraft;
  setDraft: (d: FeeDraft) => void;
}) {
  const patch = (p: Partial<FeeDraft>) => setDraft({ ...draft, ...p });

  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tighter2 text-ink-900">
        Send us your fee schedule.
      </h2>
      <p className="mt-2 text-sm text-ink-500">
        Your master fees, not contracted rates. Pick whichever method is easiest.
      </p>

      <div className="mt-6 inline-flex flex-wrap rounded-md border border-canvas-border bg-canvas-tint p-0.5 text-sm">
        {TABS.map(([t, label]) => (
          <button
            key={t}
            type="button"
            onClick={() => patch({ tab: t })}
            className={`rounded-[6px] px-3 py-1.5 transition ${
              draft.tab === t
                ? "bg-canvas text-ink-900 shadow-sm"
                : "text-ink-500 hover:text-ink-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {draft.tab === "upload" && <UploadPane draft={draft} patch={patch} />}
        {draft.tab === "pdf" && <PdfPane draft={draft} patch={patch} />}
        {draft.tab === "paste" && (
          <PastePane
            value={draft.pasteText}
            onChange={(v) => patch({ pasteText: v })}
          />
        )}
        {draft.tab === "manual" && (
          <ManualPane
            rows={draft.manual}
            onChange={(rows) => patch({ manual: rows })}
          />
        )}
        {draft.tab === "eob" && <EobPane draft={draft} patch={patch} />}
      </div>
    </div>
  );
}

function UploadPane({
  draft,
  patch,
}: {
  draft: FeeDraft;
  patch: (p: Partial<FeeDraft>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  async function ingest(file: File) {
    const lower = file.name.toLowerCase();
    const isXlsx = lower.endsWith(".xlsx") || lower.endsWith(".xls");
    const isCsv = lower.endsWith(".csv") || file.type === "text/csv";
    if (!isXlsx && !isCsv) {
      patch({
        file,
        uploadError: "Use a .csv or .xlsx file, or switch to Paste.",
        csvText: null,
        previewCount: null,
        uploadKind: null,
      });
      return;
    }
    try {
      let text: string;
      if (isXlsx) {
        // Lazy-load SheetJS only when an Excel file is actually dropped.
        const XLSX = await import("xlsx");
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        text = XLSX.utils.sheet_to_csv(sheet);
      } else {
        text = await file.text();
      }
      const preview = parseCsv(text);
      patch({
        file,
        uploadKind: isXlsx ? "xlsx" : "csv",
        csvText: text,
        previewCount: preview.valid.length,
        uploadError:
          preview.valid.length === 0
            ? "We couldn't find a code + fee column. Check the file or switch methods."
            : null,
      });
    } catch {
      patch({
        file,
        uploadError: "Couldn't read that file. Try CSV, or switch methods.",
        csvText: null,
        previewCount: null,
        uploadKind: null,
      });
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void ingest(f);
  }

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) void ingest(f);
  }

  return (
    <div>
      <label className="block text-sm font-medium text-ink-700">
        Fee schedule file
      </label>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className={`mt-1.5 flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed px-6 py-10 text-center transition ${
          dragging
            ? "border-ink-900 bg-canvas-tint"
            : "border-canvas-border bg-canvas hover:border-ink-200"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls,text/csv"
          onChange={onFile}
          className="hidden"
        />
        <UploadIcon />
        <p className="mt-3 text-sm font-medium text-ink-700">
          Drag &amp; drop your CSV or Excel file
        </p>
        <p className="mt-1 text-xs text-ink-400">or click to browse</p>
      </div>

      {draft.file && !draft.uploadError && draft.previewCount !== null && (
        <p className="mt-2 text-xs text-gain-ink">
          {draft.file.name}: {draft.previewCount} fee
          {draft.previewCount === 1 ? "" : "s"} detected.
        </p>
      )}
      {draft.uploadError && (
        <p className="mt-2 text-xs text-red-600">{draft.uploadError}</p>
      )}
      <p className="mt-3 text-xs text-ink-400">
        Two columns: CDT code and fee. We auto-detect the columns and handle most
        exports from Dentrix, Eaglesoft, Open Dental, etc.
      </p>
    </div>
  );
}

function PastePane({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const count = parsePasteRows(value).length;
  return (
    <div>
      <label className="block text-sm font-medium text-ink-700">
        Paste fee list
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={10}
        placeholder={"D0120  65\nD0150  102\nD1110  118\n…"}
        className="mt-1.5 w-full rounded-md border border-canvas-border bg-canvas px-3 py-2 font-mono text-sm text-ink-900 placeholder:text-ink-400 focus:border-ink-900 focus:outline-none focus:ring-1 focus:ring-ink-900"
      />
      {count > 0 && (
        <p className="mt-2 text-xs text-ink-500">
          {count} line{count === 1 ? "" : "s"} detected. One{" "}
          <span className="font-mono">CODE fee</span> per line.
        </p>
      )}
    </div>
  );
}

function ManualPane({
  rows,
  onChange,
}: {
  rows: ManualRow[];
  onChange: (rows: ManualRow[]) => void;
}) {
  function setFee(idx: number, value: string) {
    const next = rows.slice();
    next[idx] = { ...next[idx], fee: value };
    onChange(next);
  }
  return (
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
                      value={rows[i]?.fee ?? ""}
                      onChange={(e) =>
                        setFee(i, e.target.value.replace(/[^\d.]/g, ""))
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
  );
}

function EobPane({
  draft,
  patch,
}: {
  draft: FeeDraft;
  patch: (p: Partial<FeeDraft>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  async function upload(file: File) {
    patch({ eobFile: file, eobStatus: "uploading", eobMessage: null, eobPath: null });
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/eob-ocr", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.eobPath) {
        patch({
          eobStatus: "error",
          eobMessage: json.error || "Upload failed. Try a clearer photo.",
        });
        return;
      }
      patch({ eobStatus: "done", eobPath: json.eobPath, eobMessage: json.message });
    } catch {
      patch({ eobStatus: "error", eobMessage: "Upload failed. Try again." });
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-ink-700">
        EOB image
      </label>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void upload(f);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className={`mt-1.5 flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed px-6 py-10 text-center transition ${
          dragging
            ? "border-ink-900 bg-canvas-tint"
            : "border-canvas-border bg-canvas hover:border-ink-200"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
          }}
          className="hidden"
        />
        <UploadIcon />
        <p className="mt-3 text-sm font-medium text-ink-700">
          Drop a photo or scan of a recent EOB
        </p>
        <p className="mt-1 text-xs text-ink-400">PNG, JPG, or PDF</p>
      </div>

      {draft.eobStatus === "uploading" && (
        <p className="mt-2 text-xs text-ink-500">Uploading {draft.eobFile?.name}…</p>
      )}
      {draft.eobStatus === "done" && (
        <p className="mt-2 text-xs text-gain-ink">
          {draft.eobMessage ?? "EOB received."}
        </p>
      )}
      {draft.eobStatus === "error" && (
        <p className="mt-2 text-xs text-red-600">{draft.eobMessage}</p>
      )}
      <p className="mt-3 text-xs text-ink-400">
        We&rsquo;ll read your fees off the EOB by hand for now. Your report
        follows once we&rsquo;ve extracted them.
      </p>
    </div>
  );
}

function PdfPane({
  draft,
  patch,
}: {
  draft: FeeDraft;
  patch: (p: Partial<FeeDraft>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  async function ingest(file: File) {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      patch({ pdfStatus: "error", pdfMessage: "Please upload a PDF.", pdfFile: file });
      return;
    }
    if (!hasSupabaseEnv()) {
      patch({ pdfStatus: "error", pdfMessage: "Uploads aren't configured yet." });
      return;
    }
    patch({
      pdfFile: file,
      pdfStatus: "uploading",
      pdfMessage: null,
      pdfRows: [],
      pdfFrequencies: {},
      pdfCount: null,
      pdfPath: null,
    });
    try {
      // 1. Signed upload URL → upload straight to storage (skips Vercel's body cap).
      const urlRes = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name }),
      });
      const urlJson = await urlRes.json();
      if (!urlRes.ok || !urlJson.token) {
        patch({ pdfStatus: "error", pdfMessage: urlJson.error || "Upload failed." });
        return;
      }
      const sb = browserSupabase();
      const up = await sb.storage
        .from(urlJson.bucket)
        .uploadToSignedUrl(urlJson.path, urlJson.token, file);
      if (up.error) {
        patch({ pdfStatus: "error", pdfMessage: "Upload failed. Try again." });
        return;
      }

      // 2. Extract fees + volumes with Claude.
      patch({ pdfStatus: "parsing", pdfPath: urlJson.path });
      const parseRes = await fetch("/api/parse-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: urlJson.path }),
      });
      const parseJson = await parseRes.json();
      if (!parseRes.ok || !Array.isArray(parseJson.rows) || parseJson.rows.length === 0) {
        patch({
          pdfStatus: "error",
          pdfMessage:
            parseJson.error === "no_codes_found"
              ? "We couldn't find any fee rows in that PDF. Try a Procedure Summary / production report, or another method."
              : parseJson.error || "Couldn't read that PDF.",
        });
        return;
      }
      const rows: ManualRow[] = parseJson.rows.map(
        (r: { code: string; fee: number }) => ({ code: r.code, fee: String(r.fee) })
      );
      const freqCount = Object.keys(parseJson.frequencies ?? {}).length;
      patch({
        pdfStatus: "done",
        pdfRows: rows,
        pdfFrequencies: parseJson.frequencies ?? {},
        pdfCount: parseJson.count ?? rows.length,
        pdfMessage:
          `${rows.length} code${rows.length === 1 ? "" : "s"} found` +
          (freqCount > 0 ? `, with real annual volumes for ${freqCount}.` : "."),
      });
    } catch {
      patch({ pdfStatus: "error", pdfMessage: "Something went wrong. Try again." });
    }
  }

  const busy = draft.pdfStatus === "uploading" || draft.pdfStatus === "parsing";

  return (
    <div>
      <label className="block text-sm font-medium text-ink-700">
        Procedure summary / production report (PDF)
      </label>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (busy) return;
          const f = e.dataTransfer.files?.[0];
          if (f) void ingest(f);
        }}
        onClick={() => !busy && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (!busy && (e.key === "Enter" || e.key === " ")) inputRef.current?.click();
        }}
        className={`mt-1.5 flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed px-6 py-10 text-center transition ${
          dragging
            ? "border-ink-900 bg-canvas-tint"
            : "border-canvas-border bg-canvas hover:border-ink-200"
        } ${busy ? "opacity-60" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void ingest(f);
          }}
          className="hidden"
        />
        <UploadIcon />
        <p className="mt-3 text-sm font-medium text-ink-700">
          Drag &amp; drop your fee/production report PDF
        </p>
        <p className="mt-1 text-xs text-ink-400">or click to browse</p>
      </div>

      {draft.pdfStatus === "uploading" && (
        <p className="mt-2 text-xs text-ink-500">Uploading {draft.pdfFile?.name}…</p>
      )}
      {draft.pdfStatus === "parsing" && (
        <p className="mt-2 text-xs text-ink-500">
          Reading your fees and volumes. This can take up to a minute…
        </p>
      )}
      {draft.pdfStatus === "done" && (
        <p className="mt-2 text-xs text-gain-ink">{draft.pdfMessage}</p>
      )}
      {draft.pdfStatus === "error" && (
        <p className="mt-2 text-xs text-red-600">{draft.pdfMessage}</p>
      )}
      <p className="mt-3 text-xs text-ink-400">
        Upload a Procedure Summary / production report straight from your practice
        software (Dentrix, Eaglesoft, Open Dental). We read each code&rsquo;s
        average fee and annual volume automatically.
      </p>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="text-ink-300"
    >
      <path
        d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 14v3a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
