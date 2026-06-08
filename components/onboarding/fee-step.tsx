"use client";

// Flexible fee-schedule input — "meet the dentist where it's easiest".
// One unified upload box (drop a CSV, XLSX, PDF report, or EOB image — we
// auto-route by file type) plus two tabs for Paste and the Top-20 grid.
//
// The component is controlled: the parent holds a FeeDraft and passes setDraft.
// Helpers here (emptyFeeDraft / isFeeValid / buildFeePayload) turn the draft
// into the JSON payload /api/onboard expects. uploadedKind records which file
// type landed in the unified box, so the validity/payload helpers know how to
// treat it.

import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import { parseCsv } from "@/lib/parser/csv";
import { browserSupabase, hasSupabaseEnv } from "@/lib/db/client";
import { TOP_CDT } from "@/lib/data/top-cdt";

export type FeeTab = "upload" | "paste" | "manual";
export type FeeMethod = "csv" | "xlsx" | "pdf" | "paste" | "manual" | "eob";
export type UploadedKind = "csv" | "xlsx" | "pdf" | "eob" | null;

export type ManualRow = { code: string; fee: string };

export type FeeDraft = {
  tab: FeeTab;
  // unified upload box: which file type currently occupies it
  uploadedKind: UploadedKind;
  // csv/xlsx
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
    uploadedKind: null,
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
      switch (d.uploadedKind) {
        case "csv":
        case "xlsx":
          return !!d.csvText && (d.previewCount ?? 0) > 0;
        case "pdf":
          return d.pdfStatus === "done" && d.pdfRows.length > 0;
        case "eob":
          return d.eobStatus === "done" && !!d.eobPath;
        default:
          return false;
      }
    case "paste":
      return parsePasteRows(d.pasteText).length > 0;
    case "manual":
      return d.manual.some((r) => r.fee.trim());
  }
}

export function buildFeePayload(d: FeeDraft): FeePayload | null {
  switch (d.tab) {
    case "upload":
      switch (d.uploadedKind) {
        case "csv":
        case "xlsx":
          return d.csvText && d.uploadKind
            ? { method: d.uploadKind, csvText: d.csvText, filename: d.file?.name }
            : null;
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
        case "eob":
          return d.eobPath
            ? { method: "eob", eobPath: d.eobPath, filename: d.eobFile?.name }
            : null;
        default:
          return null;
      }
    case "paste": {
      const rows = parsePasteRows(d.pasteText);
      return rows.length ? { method: "paste", rows } : null;
    }
    case "manual": {
      const rows = d.manual.filter((r) => r.fee.trim());
      return rows.length ? { method: "manual", rows } : null;
    }
  }
}

const TABS: [FeeTab, string][] = [
  ["upload", "Upload a file"],
  ["paste", "Paste"],
  ["manual", "Top 20 codes"],
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
      </div>
    </div>
  );
}

// Staged, time-driven progress for the PDF extract. It's a single long Claude
// call with no sub-progress, so we advance the stage by elapsed time to give
// the dentist reassurance that something is happening rather than a frozen line.
const PDF_STAGES = ["Uploading file", "Reading the report", "Extracting fees", "Matching annual volumes"];

function ExtractionProgress({
  status,
  elapsed,
}: {
  status: "uploading" | "parsing";
  elapsed: number;
}) {
  const stage =
    status === "uploading" ? 0 : elapsed < 8 ? 1 : elapsed < 25 ? 2 : 3;
  // Indeterminate-ish bar that eases toward (not to) 100% as time passes.
  const pct = Math.min(95, 10 + elapsed * 3);
  return (
    <div className="mt-3 rounded-md border border-accent/20 bg-accent/5 px-4 py-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-accent-ink">
          {PDF_STAGES[stage]}…
        </span>
        <span className="tabular-nums text-ink-400">{elapsed}s</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-canvas-tint2">
        <div
          className="h-full rounded-full bg-accent transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {PDF_STAGES.map((label, i) => (
          <span
            key={label}
            className={`text-[11px] ${
              i < stage
                ? "text-ink-400 line-through"
                : i === stage
                  ? "font-medium text-accent-ink"
                  : "text-ink-300"
            }`}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// One box that accepts CSV / XLSX / PDF / EOB image and routes by file type.
function UploadPane({
  draft,
  patch,
}: {
  draft: FeeDraft;
  patch: (p: Partial<FeeDraft>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const pdfBusy =
    draft.uploadedKind === "pdf" &&
    (draft.pdfStatus === "uploading" || draft.pdfStatus === "parsing");
  const eobBusy = draft.uploadedKind === "eob" && draft.eobStatus === "uploading";
  const busy = pdfBusy || eobBusy;

  useEffect(() => {
    if (!busy) {
      setElapsed(0);
      return;
    }
    const start = Date.now();
    const id = setInterval(
      () => setElapsed(Math.floor((Date.now() - start) / 1000)),
      500
    );
    return () => clearInterval(id);
  }, [busy]);

  async function csvIngest(file: File, isXlsx: boolean) {
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
        uploadedKind: isXlsx ? "xlsx" : "csv",
        file,
        uploadKind: isXlsx ? "xlsx" : "csv",
        csvText: text,
        previewCount: preview.valid.length,
        uploadError:
          preview.valid.length === 0
            ? "We couldn't find a code + fee column. Check the file or switch to Paste."
            : null,
      });
    } catch {
      patch({
        uploadedKind: isXlsx ? "xlsx" : "csv",
        file,
        uploadKind: null,
        csvText: null,
        previewCount: null,
        uploadError: "Couldn't read that file. Try CSV, or switch methods.",
      });
    }
  }

  async function pdfIngest(file: File) {
    if (!hasSupabaseEnv()) {
      patch({
        uploadedKind: "pdf",
        pdfFile: file,
        pdfStatus: "error",
        pdfMessage: "Uploads aren't configured yet.",
      });
      return;
    }
    patch({
      uploadedKind: "pdf",
      pdfFile: file,
      pdfStatus: "uploading",
      pdfMessage: null,
      pdfRows: [],
      pdfFrequencies: {},
      pdfCount: null,
      pdfPath: null,
    });
    try {
      // 1. Signed upload URL → straight to storage (skips Vercel's body cap).
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
      if (
        !parseRes.ok ||
        !Array.isArray(parseJson.rows) ||
        parseJson.rows.length === 0
      ) {
        patch({
          pdfStatus: "error",
          pdfMessage:
            parseJson.error === "no_codes_found"
              ? "We couldn't find any fee rows in that PDF. Try a Procedure Summary / production report, or another method."
              : parseJson.error || "Couldn't read that PDF.",
        });
        return;
      }
      const rows: ManualRow[] = parseJson.rows
        .map((r: { code: string; fee: number }) => ({
          code: r.code,
          fee: String(r.fee),
        }))
        .sort((a: ManualRow, b: ManualRow) => a.code.localeCompare(b.code));
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

  async function eobUpload(file: File) {
    patch({
      uploadedKind: "eob",
      eobFile: file,
      eobStatus: "uploading",
      eobMessage: null,
      eobPath: null,
    });
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

  function dispatch(file: File) {
    if (busy) return;
    const lower = file.name.toLowerCase();
    const isPdf = lower.endsWith(".pdf") || file.type === "application/pdf";
    const isXlsx = lower.endsWith(".xlsx") || lower.endsWith(".xls");
    const isCsv = lower.endsWith(".csv") || file.type === "text/csv";
    const isImage =
      file.type.startsWith("image/") || /\.(png|jpe?g|webp|heic)$/.test(lower);
    if (isPdf) return void pdfIngest(file);
    if (isCsv || isXlsx) return void csvIngest(file, isXlsx);
    if (isImage) return void eobUpload(file);
    patch({
      uploadedKind: "csv",
      file,
      uploadKind: null,
      csvText: null,
      previewCount: null,
      uploadError:
        "Unsupported file. Upload a CSV, Excel, PDF, or image — or use the Paste / Top 20 tabs.",
    });
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) dispatch(f);
  }

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) dispatch(f);
  }

  const k = draft.uploadedKind;

  return (
    <div>
      <label className="block text-sm font-medium text-ink-700">
        Upload your fee schedule
      </label>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !busy && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (!busy && (e.key === "Enter" || e.key === " "))
            inputRef.current?.click();
        }}
        className={`mt-1.5 flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed px-6 py-10 text-center transition ${
          dragging
            ? "border-ink-900 bg-canvas-tint"
            : "border-canvas-border bg-canvas hover:border-ink-200"
        } ${busy ? "cursor-default opacity-60" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls,text/csv,application/pdf,.pdf,image/png,image/jpeg,image/webp"
          onChange={onFile}
          className="hidden"
        />
        <UploadIcon />
        <p className="mt-3 text-sm font-medium text-ink-700">
          Drag &amp; drop your fee schedule
        </p>
        <p className="mt-1 text-xs text-ink-400">
          CSV, Excel, a PDF production report, or a photo of an EOB
        </p>
      </div>

      {/* CSV / XLSX result */}
      {(k === "csv" || k === "xlsx") && (
        <>
          {draft.file && !draft.uploadError && draft.previewCount !== null && (
            <p className="mt-2 text-xs text-gain-ink">
              {draft.file.name}: {draft.previewCount} fee
              {draft.previewCount === 1 ? "" : "s"} detected.
            </p>
          )}
          {draft.uploadError && (
            <p className="mt-2 text-xs text-red-600">{draft.uploadError}</p>
          )}
        </>
      )}

      {/* PDF result */}
      {k === "pdf" && (
        <>
          {(draft.pdfStatus === "uploading" || draft.pdfStatus === "parsing") && (
            <ExtractionProgress status={draft.pdfStatus} elapsed={elapsed} />
          )}
          {draft.pdfStatus === "done" && (
            <PdfReview draft={draft} patch={patch} />
          )}
          {draft.pdfStatus === "error" && (
            <p className="mt-2 text-xs text-red-600">{draft.pdfMessage}</p>
          )}
        </>
      )}

      {/* EOB result */}
      {k === "eob" && (
        <>
          {draft.eobStatus === "uploading" && (
            <p className="mt-2 text-xs text-ink-500">
              Uploading {draft.eobFile?.name}…
            </p>
          )}
          {draft.eobStatus === "done" && (
            <p className="mt-2 text-xs text-gain-ink">
              {draft.eobMessage ?? "EOB received."}
            </p>
          )}
          {draft.eobStatus === "error" && (
            <p className="mt-2 text-xs text-red-600">{draft.eobMessage}</p>
          )}
        </>
      )}

      <p className="mt-3 text-xs text-ink-400">
        Master fees, not contracted rates. A PDF production report (Dentrix,
        Eaglesoft, Open Dental) also gives us your real annual volumes. EOB photos
        are read by hand. Or switch to Paste / Top 20.
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

// Post-extraction review: the dentist eyeballs what we pulled and can edit a
// fee/volume, remove a wrong row, or add a code we missed — before generating.
function PdfReview({
  draft,
  patch,
}: {
  draft: FeeDraft;
  patch: (p: Partial<FeeDraft>) => void;
}) {
  const [newCode, setNewCode] = useState("");
  const [newFee, setNewFee] = useState("");
  const [newVol, setNewVol] = useState("");

  function setFee(i: number, val: string) {
    const rows = draft.pdfRows.slice();
    rows[i] = { ...rows[i], fee: val.replace(/[^\d.]/g, "") };
    patch({ pdfRows: rows });
  }
  function setVolume(code: string, val: string) {
    const n = parseInt(val.replace(/[^\d]/g, ""), 10);
    const freq = { ...draft.pdfFrequencies };
    if (Number.isFinite(n) && n > 0) freq[code] = n;
    else delete freq[code];
    patch({ pdfFrequencies: freq });
  }
  function removeRow(i: number) {
    const code = draft.pdfRows[i].code;
    const freq = { ...draft.pdfFrequencies };
    delete freq[code];
    const rows = draft.pdfRows.filter((_, idx) => idx !== i);
    patch({ pdfRows: rows, pdfFrequencies: freq, pdfCount: rows.length });
  }
  function addRow() {
    const code = newCode.trim().toUpperCase();
    if (!/^D\d{4}$/.test(code) || draft.pdfRows.some((r) => r.code === code)) return;
    const rows = [...draft.pdfRows, { code, fee: newFee.replace(/[^\d.]/g, "") }].sort(
      (a, b) => a.code.localeCompare(b.code)
    );
    const freq = { ...draft.pdfFrequencies };
    const n = parseInt(newVol.replace(/[^\d]/g, ""), 10);
    if (Number.isFinite(n) && n > 0) freq[code] = n;
    patch({ pdfRows: rows, pdfFrequencies: freq, pdfCount: rows.length });
    setNewCode("");
    setNewFee("");
    setNewVol("");
  }
  function reset() {
    patch({
      uploadedKind: null,
      pdfFile: null,
      pdfStatus: "idle",
      pdfRows: [],
      pdfFrequencies: {},
      pdfCount: null,
      pdfMessage: null,
      pdfPath: null,
    });
  }

  const canAdd = /^D\d{4}$/.test(newCode.trim().toUpperCase()) && !!newFee.trim();
  const cellInput =
    "rounded border border-canvas-border bg-canvas px-2 py-1 text-sm text-ink-900 focus:border-ink-900 focus:outline-none focus:ring-1 focus:ring-ink-900";

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-gain-ink">{draft.pdfMessage}</p>
        <button
          type="button"
          onClick={reset}
          className="shrink-0 text-xs font-medium text-accent hover:underline"
        >
          Upload a different file
        </button>
      </div>
      <p className="mt-1 text-xs text-ink-500">
        Review what we pulled from your report. Edit a fee or volume, remove a row,
        or add a code we missed. This is what your report is built from.
      </p>
      <div className="mt-2 max-h-80 overflow-auto rounded-md border border-canvas-border">
        <table className="w-full min-w-[20rem] text-sm">
          <thead className="sticky top-0 bg-canvas-tint text-left text-[11px] uppercase tracking-wide text-ink-400">
            <tr>
              <th className="px-3 py-2 font-medium">Code</th>
              <th className="px-3 py-2 text-right font-medium">Fee</th>
              <th className="px-3 py-2 text-right font-medium">Annual volume</th>
              <th className="w-8 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {draft.pdfRows.map((row, i) => (
              <tr key={row.code} className="border-t border-canvas-border">
                <td className="px-3 py-1.5 font-mono text-xs text-ink-700">
                  {row.code}
                </td>
                <td className="px-3 py-1.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-ink-400">$</span>
                    <input
                      value={row.fee}
                      inputMode="decimal"
                      onChange={(e) => setFee(i, e.target.value)}
                      className={`w-20 text-right ${cellInput}`}
                    />
                  </div>
                </td>
                <td className="px-3 py-1.5 text-right">
                  <input
                    value={draft.pdfFrequencies[row.code]?.toString() ?? ""}
                    inputMode="numeric"
                    onChange={(e) => setVolume(row.code, e.target.value)}
                    className={`w-24 text-right ${cellInput}`}
                  />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    aria-label={`Remove ${row.code}`}
                    className="text-base leading-none text-ink-300 transition hover:text-red-600"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-ink-400">Add a missing code:</span>
        <input
          value={newCode}
          onChange={(e) => setNewCode(e.target.value.toUpperCase())}
          placeholder="D0120"
          className={`w-24 font-mono text-xs ${cellInput}`}
        />
        <input
          value={newFee}
          onChange={(e) => setNewFee(e.target.value)}
          placeholder="Fee"
          inputMode="decimal"
          className={`w-20 ${cellInput}`}
        />
        <input
          value={newVol}
          onChange={(e) => setNewVol(e.target.value)}
          placeholder="Volume"
          inputMode="numeric"
          className={`w-24 ${cellInput}`}
        />
        <button
          type="button"
          disabled={!canAdd}
          onClick={addRow}
          className="rounded-md border border-canvas-border bg-canvas px-3 py-1 text-xs font-medium text-ink-700 transition hover:bg-canvas-tint disabled:opacity-50"
        >
          Add code
        </button>
      </div>
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
