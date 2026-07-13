"use client";

import { useInView } from "@/components/motion/use-in-view";
import { useReducedMotion } from "@/components/motion/use-reduced-motion";

/**
 * A single code's fee position: a brand-gradient fill animates to `pct`, with a
 * static gold marker line at the 75th percentile. `label` (e.g. "62nd") carries
 * the value for screen readers.
 */
export function PercentileBar({
  code,
  pct,
  label,
}: {
  code: string;
  pct: number;
  label: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.2 });
  const reduced = useReducedMotion();
  const width = reduced || inView ? `${pct}%` : "0%";

  return (
    <div
      ref={ref}
      className="mb-[14px] grid grid-cols-[56px_1fr_42px] items-center gap-3"
    >
      <span className="font-data text-[13px] text-heading">{code}</span>
      <div className="relative h-[10px] overflow-hidden rounded-md bg-[#EDEFFA]">
        <div
          className="bg-grad-brand absolute inset-y-0 left-0 rounded-md"
          style={{
            width,
            transition: reduced
              ? "none"
              : "width 1.3s cubic-bezier(.22,1,.36,1)",
          }}
        />
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-3/4 w-[2px] bg-gold opacity-75"
        />
      </div>
      <span className="text-right font-data text-[13px] font-medium text-brand">
        {label}
      </span>
    </div>
  );
}
