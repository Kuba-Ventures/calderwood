"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "./use-in-view";
import { useReducedMotion } from "./use-reduced-motion";

/**
 * Eased 0→value count when scrolled into view. The accessible value is always
 * the final number (via aria-label); the animated text is aria-hidden.
 */
export function CountUp({
  value,
  prefix = "",
  suffix = "",
  duration = 1700,
  className,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLSpanElement>({ threshold: 0.5 });
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;
    if (reduced) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduced, value, duration]);

  const full = `${prefix}${value.toLocaleString()}${suffix}`;

  return (
    <span ref={ref} className={className} aria-label={full}>
      <span aria-hidden="true">
        {prefix}
        {display.toLocaleString()}
        {suffix}
      </span>
    </span>
  );
}
