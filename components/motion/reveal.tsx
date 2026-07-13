"use client";

import type { CSSProperties, ReactNode } from "react";
import { useInView } from "./use-in-view";
import { useReducedMotion } from "./use-reduced-motion";

/**
 * Fade + rise once in view (opacity 0→1, y 24→0). Renders a single <div> that
 * carries `className`, so it can itself be a grid item. Reserves its own space,
 * so revealing never shifts layout. Reduced motion → shown immediately.
 */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
  style,
}: {
  children: ReactNode;
  /** ms delay, e.g. for staggering grid children. */
  delay?: number;
  y?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.2 });
  const reduced = useReducedMotion();
  const shown = reduced || inView;

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : `translateY(${y}px)`,
        transition: reduced
          ? "none"
          : `opacity .7s ease ${delay}ms, transform .7s cubic-bezier(.22,1,.36,1) ${delay}ms`,
        willChange: "opacity, transform",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
