"use client";

// Flexible fee-schedule input: "meet the dentist where it's easiest".
// One upload box that takes several files at once (CSV, XLSX, PDF reports) or a
// single EOB image, plus two tabs for Paste and the Top-20 grid.
//
// The component is controlled: the parent holds a FeeDraft and passes setDraft.
// Helpers here (emptyFeeDraft / isFeeValid / isFeeBusy / buildFeePayload) turn
// the draft into the JSON payload /api/onboard expects. Uploaded files are kept
// as parsed sources and combined with mergeUploads (lib/parser/merge-uploads),
// so adding or removing a file recomputes the schedule without losing the
// dentist's review edits.

import {
  ChangeEvent,
  Dispatch,
  DragEvent,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import { parseCsv } from "@/lib/parser/csv";
import { browserSupabase, hasSupabaseEnv } from "@/lib/db/client";
import { TOP_CDT } from "@/lib/data/top-cdt";
import { providerLabelsFrom } from "@/lib/parser/completeness";
import {
  applyEdits,
  emptyEdits,
  mergeUploads,
  type MergeResult,
  type ReviewEdits,
  type UploadKind,
} from "@/lib/parser/merge-uploads";
import { UploadChecklist } from "@/components/onboarding/upload-checklist";

export type FeeTab = "upload" | "paste" | "manual";
export type FeeMethod = "files" | "paste" | "manual" | "eob";

export type ManualRow = { code: string; fee: string };

/** Most files a practice can add in one go (the PDF reads run in parallel). */
export const MAX_FILES = 10;

export type UploadedFile = {
  id: string;
  name: string;
  kind: UploadKind;
  status: "uploading" | "parsing" | "done" | "error";
  /** When the read started, for the per-file progress timer. */
  startedAt: number;
  message: string | null;
  rows: ManualRow[];
  volumes: Record<string, number>;
  providerFees: Record<string, Record<string, number>>;
  /** Storage path for PDFs (kept as the raw upload). */
  pdfPath: string | null;
  /** PDF that turned out to be the office fee schedule, not a production report. */
  officeSchedule?: boolean;
};

export type FeeDraft = {
  tab: FeeTab;
  // upload box: a list of fee files, or a single EOB image
  uploadedKind: "files" | "eob" | null;
  files: UploadedFile[];
  /** Box-level problem (unsupported type, too many files). */
  uploadError: string | null;
  /** Review-table corrections, applied on top of the merged files. */
  edits: ReviewEdits;
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
  | { method: "paste" | "manual"; rows: ManualRow[] }
  | {
      method: "files";
      rows: ManualRow[];
      frequencies: Record<string, number>;
      providerFees: Record<string, Record<string, number>>;
      kinds: UploadKind[];
      pdfPaths: string[];
      filenames: string[];
    }
  | { method: "eob"; eobPath: string; filename?: string };

export function emptyFeeDraft(): FeeDraft {
  return {
    tab: "upload",
    uploadedKind: null,
    files: [],
    uploadError: null,
    edits: emptyEdits(),
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

const fileBusy = (f: UploadedFile) => f.status === "uploading" || f.status === "parsing";

/** Combined schedule from every successfully read file. */
export function mergeDraftFiles(d: FeeDraft): MergeResult {
  return mergeUploads(d.files.filter((f) => f.status === "done"));
}

/** Final rows + counts: merged files with the review edits applied. */
export function draftSchedule(d: FeeDraft) {
  const merged = mergeDraftFiles(d);
  return { merged, ...applyEdits(merged, d.edits) };
}

/** True while any upload is still being read. */
export function isFeeBusy(d: FeeDraft): boolean {
  if (d.tab !== "upload") return false;
  if (d.uploadedKind === "eob") return d.eobStatus === "uploading";
  return d.files.some(fileBusy);
}

export function isFeeValid(d: FeeDraft): boolean {
  switch (d.tab) {
    case "upload":
      switch (d.uploadedKind) {
        case "files":
          return !isFeeBusy(d) && draftSchedule(d).rows.length > 0;
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
        case "files": {
          const { merged, rows, frequencies } = draftSchedule(d);
          if (!rows.length) return null;
          const used = d.files.filter((f) => f.status === "done" && !merged.duplicateOf[f.id]);
          return {
            method: "files",
            rows,
            frequencies,
            providerFees: merged.providerFees,
            kinds: used.map((f) => f.kind),
            pdfPaths: used.flatMap((f) => (f.pdfPath ? [f.pdfPath] : [])),
            filenames: used.map((f) => f.name),
          };
        }
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
  ["upload", "Upload files"],
  ["paste", "Paste"],
  ["manual", "Top 20 codes"],
];

export function FeeStep({
  draft,
  setDraft,
  providerCount,
}: {
  draft: FeeDraft;
  setDraft: Dispatch<SetStateAction<FeeDraft>>;
  /** Providers at the practice, for the per-provider completeness check. */
  providerCount?: number;
}) {
  // Functional update: the upload handlers below patch the draft several times
  // across awaits, so spreading the render-time draft would clobber the earlier
  // patches (e.g. reset uploadedKind back to null mid-upload).
  const patch = (p: Partial<FeeDraft>) =>
    setDraft((prev) => ({ ...prev, ...p }));

  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tighter2 text-ink-900">
        Send us your fee schedule.
      </h2>
      <p className="mt-2 text-base leading-relaxed text-ink-700">
        Use your full office fees: what you charge a patient with no insurance.
        Not contracted rates, and not averages from a production report. Pick
        whichever method is easiest.
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
        {draft.tab === "upload" && (
          <UploadPane
            draft={draft}
            patch={patch}
            setDraft={setDraft}
            providerCount={providerCount}
          />
        )}
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

// A failed route doesn't always answer in JSON: a crashed API route returns
// Next's HTML 500 page, and res.json() then throws, collapsing a precise
// failure into the generic "Something went wrong" catch below. Read the body
// as text and parse defensively so the real status reaches the dentist.
async function readJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {
      error: `Upload service error (${res.status}). Try again in a moment.`,
    };
  }
}

function kindOf(file: File): UploadKind | "image" | null {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".pdf") || file.type === "application/pdf") return "pdf";
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return "xlsx";
  if (lower.endsWith(".csv") || file.type === "text/csv") return "csv";
  if (file.type.startsWith("image/") || /\.(png|jpe?g|webp|heic)$/.test(lower)) return "image";
  return null;
}

let fileSeq = 0;

// Upload box (option B): drop one or more files, see the combined total first,
// file-by-file detail one click down (opened when a file needs attention).
function UploadPane({
  draft,
  patch,
  setDraft,
  providerCount,
}: {
  draft: FeeDraft;
  patch: (p: Partial<FeeDraft>) => void;
  setDraft: Dispatch<SetStateAction<FeeDraft>>;
  providerCount?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const files = draft.files;
  const filesBusy = files.some(fileBusy);
  const eobBusy = draft.uploadedKind === "eob" && draft.eobStatus === "uploading";

  // One ticking clock drives every in-flight file's progress bar.
  useEffect(() => {
    if (!filesBusy) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [filesBusy]);

  // Async reads finish after other files were added or removed, so per-file
  // updates go through the functional setter and match on id.
  function updateFile(id: string, p: Partial<UploadedFile>) {
    setDraft((prev) => ({
      ...prev,
      files: prev.files.map((f) => (f.id === id ? { ...f, ...p } : f)),
    }));
  }

  async function readSheet(id: string, file: File, isXlsx: boolean) {
    try {
      let text: string;
      if (isXlsx) {
        // Lazy-load SheetJS only when an Excel file is actually dropped.
        const XLSX = await import("xlsx");
        const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
        text = XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]);
      } else {
        text = await file.text();
      }
      const parsed = parseCsv(text);
      if (parsed.valid.length === 0) {
        updateFile(id, {
          status: "error",
          message: "We couldn't find a code and fee column in this file.",
        });
        return;
      }
      updateFile(id, {
        status: "done",
        rows: parsed.valid.map((r) => ({ code: r.code, fee: String(r.fee) })),
        volumes: parsed.volumes,
      });
    } catch {
      updateFile(id, { status: "error", message: "We couldn't open this file." });
    }
  }

  async function readPdf(id: string, file: File) {
    if (!hasSupabaseEnv()) {
      updateFile(id, { status: "error", message: "Uploads aren't configured yet." });
      return;
    }
    try {
      // 1. Signed upload URL → straight to storage (skips Vercel's body cap).
      const urlRes = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name }),
      });
      const urlJson = (await readJson(urlRes)) as {
        bucket?: string;
        path?: string;
        token?: string;
        error?: string;
      };
      if (!urlRes.ok || !urlJson.bucket || !urlJson.path || !urlJson.token) {
        updateFile(id, { status: "error", message: urlJson.error || "Upload failed." });
        return;
      }
      const up = await browserSupabase()
        .storage.from(urlJson.bucket)
        .uploadToSignedUrl(urlJson.path, urlJson.token, file);
      if (up.error) {
        updateFile(id, { status: "error", message: "Upload failed. Try again." });
        return;
      }

      // 2. Extract fees + volumes with Claude.
      updateFile(id, { status: "parsing", pdfPath: urlJson.path });
      const parseRes = await fetch("/api/parse-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: urlJson.path }),
      });
      const parseJson = (await readJson(parseRes)) as {
        rows?: { code: string; fee: number }[];
        frequencies?: Record<string, number>;
        providerFees?: Record<string, Record<string, number>>;
        source?: "report" | "schedule";
        error?: string;
      };
      if (!parseRes.ok || !Array.isArray(parseJson.rows) || parseJson.rows.length === 0) {
        updateFile(id, {
          status: "error",
          message:
            parseJson.error === "no_codes_found"
              ? "We couldn't find any fee rows in this PDF."
              : parseJson.error || "Couldn't read this PDF.",
        });
        return;
      }
      updateFile(id, {
        status: "done",
        rows: parseJson.rows.map((r) => ({ code: r.code, fee: String(r.fee) })),
        volumes: parseJson.frequencies ?? {},
        providerFees: parseJson.providerFees ?? {},
        officeSchedule: parseJson.source === "schedule",
      });
    } catch {
      updateFile(id, { status: "error", message: "Something went wrong. Try again." });
    }
  }

  async function eobUpload(file: File) {
    patch({
      uploadedKind: "eob",
      files: [],
      edits: emptyEdits(),
      uploadError: null,
      eobFile: file,
      eobStatus: "uploading",
      eobMessage: null,
      eobPath: null,
    });
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/eob-ocr", { method: "POST", body: fd });
      const json = (await readJson(res)) as {
        eobPath?: string;
        message?: string;
        error?: string;
      };
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

  function addFiles(list: File[]) {
    if (eobBusy || list.length === 0) return;
    const images = list.filter((f) => kindOf(f) === "image");
    if (images.length > 0) {
      // An EOB photo is read by hand, so it travels alone.
      if (list.length === 1 && files.length === 0) return void eobUpload(images[0]);
      patch({
        uploadError:
          "Add EOB photos on their own. Fee files (CSV, Excel, PDF) can go together.",
      });
      return;
    }
    const unsupported = list.filter((f) => kindOf(f) === null);
    const accepted = list.filter((f) => kindOf(f) !== null);
    const room = MAX_FILES - (draft.uploadedKind === "files" ? files.length : 0);
    const taken = accepted.slice(0, Math.max(0, room));
    const problems: string[] = [];
    if (unsupported.length)
      problems.push(
        `Skipped ${unsupported.map((f) => f.name).join(", ")}: use CSV, Excel, or PDF.`
      );
    if (accepted.length > taken.length)
      problems.push(`You can add up to ${MAX_FILES} files.`);

    const started = Date.now();
    const entries: UploadedFile[] = taken.map((file) => ({
      id: `f${++fileSeq}`,
      name: file.name,
      kind: kindOf(file) as UploadKind,
      status: "uploading",
      startedAt: started,
      message: null,
      rows: [],
      volumes: {},
      providerFees: {},
      pdfPath: null,
    }));
    setDraft((prev) => ({
      ...prev,
      uploadedKind: entries.length || prev.uploadedKind === "files" ? "files" : prev.uploadedKind,
      files: prev.uploadedKind === "files" ? [...prev.files, ...entries] : entries,
      edits: prev.uploadedKind === "files" ? prev.edits : emptyEdits(),
      uploadError: problems.length ? problems.join(" ") : null,
      ...(prev.uploadedKind === "eob" && entries.length
        ? { eobFile: null, eobPath: null, eobStatus: "idle" as const, eobMessage: null }
        : {}),
    }));
    entries.forEach((entry, i) => {
      const file = taken[i];
      if (entry.kind === "pdf") void readPdf(entry.id, file);
      else void readSheet(entry.id, file, entry.kind === "xlsx");
    });
  }

  function removeFile(id: string) {
    setDraft((prev) => {
      const rest = prev.files.filter((f) => f.id !== id);
      return {
        ...prev,
        files: rest,
        uploadedKind: rest.length ? prev.uploadedKind : null,
        edits: rest.length ? prev.edits : emptyEdits(),
        uploadError: null,
      };
    });
  }

  function openPicker() {
    if (eobBusy || !inputRef.current) return;
    inputRef.current.value = "";
    inputRef.current.click();
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    addFiles(Array.from(e.dataTransfer.files ?? []));
  }

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(e.target.files ?? []));
  }

  const isFiles = draft.uploadedKind === "files" && files.length > 0;
  const { merged, rows, frequencies } = draftSchedule(draft);
  const readCount = files.filter((f) => f.status === "done").length;
  const attention = files.filter((f) => f.status === "error" || merged.duplicateOf[f.id]);
  // Forced open while reading or when a file needs attention.
  const forceList = attention.length > 0 || filesBusy;
  const fileList = showFiles || forceList;
  // Once forced open, stay open: removing the problem file shouldn't make the
  // whole list vanish under the dentist's cursor.
  useEffect(() => {
    if (forceList) setShowFiles(true);
  }, [forceList]);
  const fileWord = `${files.length} file${files.length === 1 ? "" : "s"}`;
  const anyPdf = files.some((f) => f.kind === "pdf" && f.status === "done");
  // Only production reports carry a per-provider breakdown.
  const anyReport = files.some(
    (f) => f.kind === "pdf" && f.status === "done" && !f.officeSchedule
  );

  return (
    <div>
      <label className="block text-sm font-medium text-ink-700">
        Upload your fee schedule
      </label>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!eobBusy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={openPicker}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openPicker();
          }
        }}
        className={`mt-1.5 flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed px-6 py-10 text-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-900 ${
          dragging
            ? "border-ink-900 bg-canvas-tint"
            : "border-canvas-border bg-canvas hover:border-ink-200"
        } ${eobBusy ? "cursor-default opacity-60" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".csv,.xlsx,.xls,text/csv,application/pdf,.pdf,image/png,image/jpeg,image/webp"
          onChange={onFile}
          className="hidden"
        />
        <UploadIcon />
        <p className="mt-3 text-base font-medium text-ink-700">
          Drag &amp; drop your files, or click to choose
        </p>
        <p className="mt-1 text-base text-ink-700">
          You can add more than one file at a time.
        </p>
        <p className="mt-2 max-w-readable text-sm text-ink-600">
          Best: a CSV or Excel export of your office fee schedule. Have a
          production report (like a Procedure Summary) too? Add it. We use it for
          how often you do each procedure and keep the fees from your fee schedule.
        </p>
      </div>

      {draft.uploadError && (
        <p role="alert" className="mt-3 text-base text-red-700">
          {draft.uploadError}
        </p>
      )}

      {isFiles && (
        <>
          <div
            role="status"
            className="mt-4 rounded-lg border border-canvas-border bg-canvas-tint px-5 py-4"
          >
            <p className="text-base text-ink-700">
              From your {files.length} file{files.length === 1 ? "" : "s"}
            </p>
            {rows.length > 0 ? (
              <>
                <p className="text-3xl font-semibold text-ink-900">
                  {rows.length} code{rows.length === 1 ? "" : "s"}
                </p>
                <p className="text-lg text-ink-900">
                  {Object.keys(frequencies).length > 0
                    ? `with procedure counts for ${Object.keys(frequencies).length}`
                    : "no procedure counts yet"}
                </p>
              </>
            ) : (
              <p className="text-lg text-ink-900">
                {filesBusy ? "Reading your files…" : "No fees found yet."}
              </p>
            )}
            {filesBusy && rows.length > 0 && (
              <p className="mt-2 text-base text-ink-700">
                Still reading {files.filter(fileBusy).length} file
                {files.filter(fileBusy).length === 1 ? "" : "s"}…
              </p>
            )}
            {attention.length > 0 && (
              <p className="mt-2 flex gap-2 text-base font-medium text-amber-900">
                <span aria-hidden="true">!</span>
                {attention.length} file{attention.length === 1 ? " needs" : "s need"} a look
              </p>
            )}
          </div>

          {forceList ? (
            <p className="mt-4 text-base font-semibold text-ink-900">Your {fileWord}</p>
          ) : (
            <button
              type="button"
              aria-expanded={fileList}
              onClick={() => setShowFiles((s) => !s)}
              className="mt-2 min-h-[44px] py-2 text-base font-medium text-accent underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-900"
            >
              {fileList ? `Hide the ${fileWord}` : `Show the ${fileWord}`}
            </button>
          )}
          {fileList && (
            <ul className="divide-y divide-canvas-border">
              {files.map((f) => (
                <FileRow
                  key={f.id}
                  file={f}
                  now={now}
                  duplicateOf={
                    merged.duplicateOf[f.id]
                      ? files.find((x) => x.id === merged.duplicateOf[f.id])?.name
                      : undefined
                  }
                  onRemove={() => removeFile(f.id)}
                />
              ))}
            </ul>
          )}
          {files.length < MAX_FILES && (
            <button
              type="button"
              onClick={openPicker}
              className="mt-3 min-h-[44px] rounded-md border-2 border-ink-900 bg-canvas px-4 py-2 text-base font-medium text-ink-900 transition hover:bg-canvas-tint focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-900 focus-visible:ring-offset-2"
            >
              + Add another file
            </button>
          )}

          {readCount > 0 && !filesBusy && rows.length > 0 && (
            <>
              {merged.feesFromReportsOnly && (
                <p className="mt-4 rounded-md border border-amber-700 bg-amber-50 px-4 py-3 text-base leading-relaxed text-ink-900">
                  <span className="font-semibold">These fees come from a production report.</span>{" "}
                  A production report shows average charges after insurance
                  discounts, which makes your fees look lower than they are. Add
                  your office fee schedule file for accurate fees.
                </p>
              )}
              <UploadChecklist
                codeCount={rows.length}
                volumeCount={Object.keys(frequencies).length}
                providerLabels={providerLabelsFrom(merged.providerFees)}
                // Only PDF production reports carry a per-provider breakdown;
                // CSV/Excel and fee-schedule PDFs read one fee per code, so the
                // check would always fire there.
                providerCount={anyReport ? providerCount : undefined}
                actionLabel="Add another file"
                onAction={openPicker}
              />
              {anyPdf && <ScheduleReview draft={draft} patch={patch} />}
            </>
          )}
        </>
      )}

      {/* EOB result */}
      {draft.uploadedKind === "eob" && (
        <>
          {draft.eobStatus === "uploading" && (
            <p className="mt-2 text-base text-ink-600">
              Uploading {draft.eobFile?.name}…
            </p>
          )}
          {draft.eobStatus === "done" && (
            <p className="mt-2 text-base text-gain-ink">
              {draft.eobMessage ?? "EOB received."}
            </p>
          )}
          {draft.eobStatus === "error" && (
            <p className="mt-2 text-base text-red-700">{draft.eobMessage}</p>
          )}
        </>
      )}

      <p className="mt-3 text-xs text-ink-400">
        Master fees, not contracted rates. EOB photos are read by hand and go on
        their own. Or switch to Paste / Top 20.
      </p>
    </div>
  );
}

function FileRow({
  file,
  now,
  duplicateOf,
  onRemove,
}: {
  file: UploadedFile;
  now: number;
  duplicateOf?: string;
  onRemove: () => void;
}) {
  const counts = Object.keys(file.volumes).length;
  const elapsed = Math.max(0, Math.floor((now - file.startedAt) / 1000));
  const needsLook = file.status === "error" || !!duplicateOf;
  return (
    <li className={`py-3 ${needsLook ? "-mx-3 rounded-md bg-amber-50 px-3" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-base font-medium text-ink-900">{file.name}</p>
          {file.status === "done" && (
            <p className="text-base text-ink-700">
              {file.rows.length} code{file.rows.length === 1 ? "" : "s"},{" "}
              {counts > 0 ? `counts for ${counts}` : "no counts"}
            </p>
          )}
          {file.status === "uploading" && file.kind !== "pdf" && (
            <p className="text-base text-ink-700">Reading…</p>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${file.name}`}
          className="min-h-[44px] shrink-0 rounded-md border border-canvas-border bg-canvas px-4 py-2 text-base font-medium text-ink-700 transition hover:bg-canvas-tint focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-900"
        >
          Remove
        </button>
      </div>
      {file.kind === "pdf" && (file.status === "uploading" || file.status === "parsing") && (
        <ExtractionProgress status={file.status} elapsed={elapsed} />
      )}
      {file.status === "error" && (
        <p className="mt-2 flex gap-2 text-base font-medium text-amber-900">
          <span aria-hidden="true">!</span>
          {file.message} Remove it, or try a different file.
        </p>
      )}
      {duplicateOf && (
        <p className="mt-2 flex gap-2 text-base font-medium text-amber-900">
          <span aria-hidden="true">!</span>
          This is the same as {duplicateOf}, so we left it out. Nothing is counted
          twice. You can remove it.
        </p>
      )}
    </li>
  );
}

// Review of the combined schedule: the dentist eyeballs what we pulled and can
// edit a fee/volume, remove a wrong row, or add a code we missed. Edits are
// stored apart from the files (draft.edits) so they survive adding a file.
function ScheduleReview({
  draft,
  patch,
}: {
  draft: FeeDraft;
  patch: (p: Partial<FeeDraft>) => void;
}) {
  const [newCode, setNewCode] = useState("");
  const [newFee, setNewFee] = useState("");
  const [newVol, setNewVol] = useState("");
  const { rows, frequencies } = draftSchedule(draft);
  const edits = draft.edits;

  function setFee(code: string, val: string) {
    patch({ edits: { ...edits, fees: { ...edits.fees, [code]: val.replace(/[^\d.]/g, "") } } });
  }
  function setVolume(code: string, val: string) {
    const n = parseInt(val.replace(/[^\d]/g, ""), 10);
    patch({
      edits: {
        ...edits,
        volumes: { ...edits.volumes, [code]: Number.isFinite(n) && n > 0 ? n : null },
      },
    });
  }
  function removeRow(code: string) {
    patch({ edits: { ...edits, removed: [...edits.removed, code] } });
  }
  function addRow() {
    const code = newCode.trim().toUpperCase();
    if (!/^D\d{4}$/.test(code) || rows.some((r) => r.code === code)) return;
    const n = parseInt(newVol.replace(/[^\d]/g, ""), 10);
    patch({
      edits: {
        ...edits,
        removed: edits.removed.filter((c) => c !== code),
        added: [...edits.added, { code, fee: newFee.replace(/[^\d.]/g, "") }],
        // A re-added code that a file already lists keeps the typed fee.
        fees: { ...edits.fees, [code]: newFee.replace(/[^\d.]/g, "") },
        volumes: Number.isFinite(n) && n > 0 ? { ...edits.volumes, [code]: n } : edits.volumes,
      },
    });
    setNewCode("");
    setNewFee("");
    setNewVol("");
  }

  const canAdd = /^D\d{4}$/.test(newCode.trim().toUpperCase()) && !!newFee.trim();
  const cellInput =
    "rounded border border-canvas-border bg-canvas px-2 py-1 text-sm text-ink-900 focus:border-ink-900 focus:outline-none focus:ring-1 focus:ring-ink-900";

  return (
    <div className="mt-4">
      <p className="text-base text-ink-700">
        Review what we pulled from your files. Edit a fee or volume, remove a row,
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
            {rows.map((row) => (
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
                      aria-label={`Fee for ${row.code}`}
                      onChange={(e) => setFee(row.code, e.target.value)}
                      className={`w-20 text-right ${cellInput}`}
                    />
                  </div>
                </td>
                <td className="px-3 py-1.5 text-right">
                  <input
                    value={frequencies[row.code]?.toString() ?? ""}
                    inputMode="numeric"
                    aria-label={`Annual volume for ${row.code}`}
                    onChange={(e) => setVolume(row.code, e.target.value)}
                    className={`w-24 text-right ${cellInput}`}
                  />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <button
                    type="button"
                    onClick={() => removeRow(row.code)}
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
