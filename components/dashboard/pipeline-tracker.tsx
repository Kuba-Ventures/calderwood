"use client";

// Horizontal pipeline tracker. Preferred mode is status-driven: the `status`
// prop reflects real practices.status writes from the generation job, so the
// stages advance with actual work (no fake timer). A legacy timer mode
// (submittedAt only) is kept for the pre-Supabase localStorage path.

import { useEffect, useMemo, useState } from "react";
import { expectedDelivery, formatDateTime } from "@/lib/storage";
import type { PracticeStatus } from "@/lib/types/pipeline";

const PIPELINE_STAGES = [
  { label: "Intake received", short: "Received" },
  { label: "Crunching benchmarks", short: "Benchmark" },
  { label: "Scoring carriers", short: "Scoring" },
  { label: "Report ready", short: "Ready" },
] as const;

// Real status -> furthest-reached stage. report_ready/delivered = all done.
const STATUS_INDEX: Record<PracticeStatus, number> = {
  awaiting_uploads: 0,
  parsing: 1,
  review_queue: 2,
  report_ready: PIPELINE_STAGES.length,
  delivered: PIPELINE_STAGES.length,
};

export function PipelineTracker({
  submittedAt,
  status,
}: {
  submittedAt?: string;
  status?: PracticeStatus | null;
}) {
  if (status) {
    return <StatusTracker status={status} />;
  }
  return <TimerTracker submittedAt={submittedAt ?? new Date(0).toISOString()} />;
}

function StatusTracker({ status }: { status: PracticeStatus }) {
  const activeIndex = STATUS_INDEX[status] ?? 0;
  const done = activeIndex >= PIPELINE_STAGES.length;
  const progress = done
    ? 1
    : (activeIndex + 0.5) / PIPELINE_STAGES.length;
  const caption = done
    ? "Your report is ready."
    : "Crunching your benchmarks — this usually takes under a minute.";
  return (
    <div>
      <p className="text-base text-ink-500">{caption}</p>
      <div className="mt-10">
        <TrackerBar activeIndex={activeIndex} progress={progress} />
      </div>
    </div>
  );
}

function TimerTracker({ submittedAt }: { submittedAt: string }) {
  const eta = useMemo(() => expectedDelivery(submittedAt), [submittedAt]);
  const totalMs = useMemo(
    () => eta.getTime() - new Date(submittedAt).getTime(),
    [eta, submittedAt]
  );

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const elapsed = Math.max(0, now - new Date(submittedAt).getTime());
  const BASE = 1 / PIPELINE_STAGES.length;
  const progress = Math.min(0.99, BASE + (1 - BASE) * (elapsed / totalMs));
  const activeIndex = Math.min(
    PIPELINE_STAGES.length - 1,
    Math.floor(progress * PIPELINE_STAGES.length)
  );
  const remainingMs = Math.max(0, totalMs - elapsed);
  const etaLabel = formatRemaining(remainingMs);

  return (
    <div>
      <p className="text-base text-ink-500">
        Submitted {formatDateTime(submittedAt)}. Expected delivery{" "}
        {formatDateTime(eta.toISOString())}
        {remainingMs > 0 ? ` (${etaLabel})` : ""}.
      </p>

      <div className="mt-10">
        <TrackerBar activeIndex={activeIndex} progress={progress} />
      </div>
    </div>
  );
}

function TrackerBar({
  activeIndex,
  progress,
}: {
  activeIndex: number;
  progress: number;
}) {
  return (
    <>
        <div className="relative px-3 sm:px-5">
          <div className="absolute left-3 right-3 top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full bg-canvas-tint2 sm:left-5 sm:right-5" />
          <div
            className="absolute left-3 top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full bg-accent transition-[width] duration-1000 ease-out sm:left-5"
            style={{ width: `calc((100% - 1.5rem) * ${progress})` }}
          />
          <ol className="relative flex items-center justify-between">
            {PIPELINE_STAGES.map((stage, i) => {
              const state =
                i < activeIndex
                  ? "done"
                  : i === activeIndex
                  ? "active"
                  : "pending";
              return (
                <li key={stage.label} className="flex flex-col items-center">
                  <span
                    className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold shadow-sm transition ${
                      state === "done"
                        ? "border-accent bg-accent text-white"
                        : state === "active"
                        ? "border-accent bg-canvas text-accent"
                        : "border-canvas-border bg-canvas text-ink-300"
                    }`}
                  >
                    {state === "done" ? (
                      <CheckIcon />
                    ) : (
                      <StageIcon index={i} muted={state === "pending"} />
                    )}
                    {state === "active" && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 animate-ping rounded-full border-2 border-accent opacity-50"
                      />
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
        <ol className="mt-3 grid grid-cols-4 text-center">
          {PIPELINE_STAGES.map((stage, i) => {
            const state =
              i < activeIndex ? "done" : i === activeIndex ? "active" : "pending";
            return (
              <li key={stage.label}>
                <p
                  className={`text-xs sm:text-sm ${
                    state === "active"
                      ? "font-semibold text-accent-ink"
                      : state === "done"
                      ? "font-medium text-ink-700"
                      : "text-ink-400"
                  }`}
                >
                  <span className="hidden sm:inline">{stage.label}</span>
                  <span className="sm:hidden">{stage.short}</span>
                </p>
                {state === "active" && (
                  <p className="mt-0.5 text-[11px] uppercase tracking-wide text-accent">
                    In progress
                  </p>
                )}
                {state === "done" && (
                  <p className="mt-0.5 text-[11px] uppercase tracking-wide text-ink-400">
                    Done
                  </p>
                )}
              </li>
            );
          })}
        </ol>
    </>
  );
}

function StageIcon({ index, muted }: { index: number; muted: boolean }) {
  const cls = muted ? "stroke-ink-300" : "stroke-accent";
  switch (index) {
    case 0:
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="3.5" y="2.5" width="9" height="11" rx="1" className={cls} strokeWidth="1.5" />
          <path d="M5.5 2.5h5v2h-5z" className={cls} strokeWidth="1.5" />
          <path d="M5.5 8h5M5.5 10.5h3" className={cls} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 1:
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3 13.5v-4M7 13.5v-7M11 13.5v-9" className={cls} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M2 13.5h12" className={cls} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 2:
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="7" cy="7" r="3.5" className={cls} strokeWidth="1.5" />
          <path d="M9.8 9.8l3.2 3.2" className={cls} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 3:
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3.5 2.5h6l3 3v8h-9z" className={cls} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M9.5 2.5v3h3" className={cls} strokeWidth="1.5" />
        </svg>
      );
    default:
      return null;
  }
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M3 7.5l2.5 2.5L11 4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return "any minute";
  const totalMin = Math.round(ms / 1000 / 60);
  if (totalMin < 60) return `~${totalMin} min left`;
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours >= 24) return "less than 24 hr left";
  if (mins === 0) return `~${hours} hr left`;
  return `~${hours} hr ${mins} min left`;
}
