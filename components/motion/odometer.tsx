"use client";

import { useInView } from "./use-in-view";
import { useReducedMotion } from "./use-reduced-motion";

/**
 * Rolling-digit odometer. Each digit is a 0–9 reel that translateY-animates to
 * its target with a per-digit stagger; commas and $/% render static. The whole
 * value is exposed to screen readers as plain text (role="img" + aria-label);
 * the reels are decorative. Reduced motion → reels jump to final position.
 */
export function Odometer({
  value,
  prefix = "",
  suffix = "",
  className,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLSpanElement>({ threshold: 0.5 });
  const reduced = useReducedMotion();

  const full = `${prefix}${value.toLocaleString()}${suffix}`;
  const chars = full.split("");
  let digitIndex = -1;

  return (
    <span
      ref={ref}
      role="img"
      aria-label={full}
      className={`inline-flex items-start overflow-hidden leading-none ${className ?? ""}`}
    >
      {chars.map((ch, i) => {
        if (!/\d/.test(ch)) {
          return (
            <span key={i} aria-hidden="true" className="inline-block">
              {ch}
            </span>
          );
        }
        digitIndex += 1;
        const target = Number(ch);
        const rolled = reduced || inView;
        return (
          <span
            key={i}
            aria-hidden="true"
            className="inline-block h-[1em] overflow-hidden"
          >
            <span
              className="flex flex-col"
              style={{
                transform: rolled
                  ? `translateY(-${target}em)`
                  : "translateY(0)",
                transition: reduced
                  ? "none"
                  : `transform 1.7s cubic-bezier(.22,1,.36,1) ${digitIndex * 90}ms`,
                willChange: "transform",
              }}
            >
              {Array.from({ length: 10 }, (_, n) => (
                <span key={n} className="block h-[1em] text-center leading-none">
                  {n}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}
