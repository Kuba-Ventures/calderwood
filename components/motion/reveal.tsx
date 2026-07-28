"use client";

import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";
import { useInView } from "./use-in-view";
import { useReducedMotion } from "./use-reduced-motion";
import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect";

/**
 * Fade + rise once in view (opacity 0→1, y 10→0). Renders a single <div> that
 * carries `className`, so it can itself be a grid item. Reserves its own space,
 * so revealing never shifts layout.
 *
 * Accessibility: content is fully visible in SSR and before hydration, so it
 * never depends on JavaScript to be readable — the animation is a progressive
 * enhancement layered on after hydration. Reduced motion → shown immediately.
 * Pass `instant` for above-the-fold content that should appear with no delay.
 */
export function Reveal({
  children,
  delay = 0,
  y = 10,
  className,
  style,
  instant = false,
}: {
  children: ReactNode;
  /** ms delay, e.g. for staggering grid children. */
  delay?: number;
  y?: number;
  className?: string;
  style?: CSSProperties;
  /** Skip the reveal and render fully visible (e.g. the hero). */
  instant?: boolean;
}) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.2 });
  const reduced = useReducedMotion();
  const [hydrated, setHydrated] = useState(false);
  useIsomorphicLayoutEffect(() => setHydrated(true), []);

  // Animate only after hydration and only when motion is allowed. Before
  // hydration (matching the server render) and with JS disabled, `animate` is
  // false, so content renders fully visible.
  const animate = hydrated && !reduced && !instant;
  const shown = !animate || inView;

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : `translateY(${y}px)`,
        transition: animate
          ? `opacity .5s ease ${delay}ms, transform .5s cubic-bezier(.22,1,.36,1) ${delay}ms`
          : "none",
        willChange: animate ? "opacity, transform" : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
