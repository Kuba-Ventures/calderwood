"use client";

import { useInView } from "@/components/motion/use-in-view";
import { useReducedMotion } from "@/components/motion/use-reduced-motion";

/**
 * The signature "what you collect vs the 75th-percentile target" bar. A gold
 * hatched track is the recoverable target; a brand-gradient fill animates to
 * `collectPct`; the exposed gold is the gap.
 */
export function GapBar({
  collectPct,
  gapLabel,
  leftLabel = "What you collect today",
  rightLabel = "75th percentile UCR",
}: {
  collectPct: number;
  gapLabel: string;
  leftLabel?: string;
  rightLabel?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.2 });
  const reduced = useReducedMotion();
  const width = reduced || inView ? `${collectPct}%` : "0%";

  return (
    <div ref={ref} className="mt-5 rounded-2xl border border-line p-[18px]">
      <div className="mb-[9px] flex justify-between font-data text-[11px] uppercase tracking-[0.06em] text-muted">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
      <div className="gap-track relative h-[22px] overflow-hidden rounded-lg">
        <div
          className="bg-grad-brand absolute inset-y-0 left-0 border-r-2 border-gold-soft"
          style={{
            width,
            transition: reduced
              ? "none"
              : "width 1.5s cubic-bezier(.22,1,.36,1)",
          }}
        />
      </div>
      <div className="mt-[9px] flex justify-end">
        <span className="rounded-full border border-[#F0DEB2] bg-[#FCF3DF] px-[10px] py-[3px] font-data text-xs text-gold-deep">
          {gapLabel}
        </span>
      </div>
    </div>
  );
}
