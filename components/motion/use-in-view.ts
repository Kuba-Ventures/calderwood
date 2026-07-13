"use client";

import { useEffect, useRef, useState } from "react";

type Options = {
  threshold?: number;
  rootMargin?: string;
  /** Fire once and stop observing (default true). */
  once?: boolean;
};

/**
 * Observe an element and report when it scrolls into view. Trigger-once by
 * default. Falls back to "in view" immediately when IntersectionObserver is
 * unavailable (SSR-safe: nothing runs until mounted on the client).
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  options: Options = {}
) {
  const { threshold = 0.25, rootMargin = "0px", once = true } = options;
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            setInView(false);
          }
        }
      },
      { threshold, rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return { ref, inView } as const;
}
