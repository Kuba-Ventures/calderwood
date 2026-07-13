"use client";

import { useInView } from "@/components/motion/use-in-view";
import { useReducedMotion } from "@/components/motion/use-reduced-motion";

/** A carrier's recoverable revenue: a gold fill animates to `pct`. */
export function CarrierBar({
  name,
  value,
  pct,
}: {
  name: string;
  value: string;
  pct: number;
}) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.2 });
  const reduced = useReducedMotion();
  const width = reduced || inView ? `${pct}%` : "0%";

  return (
    <div ref={ref} className="mb-4">
      <div className="mb-[7px] flex justify-between text-[13px]">
        <span className="font-medium text-heading">{name}</span>
        <span className="font-data font-semibold text-gold-deep">{value}</span>
      </div>
      <div className="h-[11px] overflow-hidden rounded-md bg-[#EDEFFA]">
        <div
          className="h-full rounded-md"
          style={{
            width,
            background: "linear-gradient(90deg, var(--gold), var(--gold-soft))",
            transition: reduced
              ? "none"
              : "width 1.3s cubic-bezier(.22,1,.36,1)",
          }}
        />
      </div>
    </div>
  );
}
