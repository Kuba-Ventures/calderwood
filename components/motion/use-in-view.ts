"use client";

import { useRef, useState } from "react";
import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect";

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
 *
 * Elements already within (or near) the viewport at mount are seeded as
 * in-view synchronously, before paint, so content that starts on screen never
 * flashes hidden.
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  options: Options = {}
) {
  const { threshold = 0.25, rootMargin = "0px", once = true } = options;
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    // Synchronous initial check: if the element is already on (or just below)
    // the screen, mark it in-view now so it never renders hidden. When it is
    // in view and we only fire once, there is nothing left to observe.
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const vw = window.innerWidth || document.documentElement.clientWidth;
    const margin = 100;
    const alreadyInView =
      rect.top < vh + margin &&
      rect.bottom > -margin &&
      rect.left < vw + margin &&
      rect.right > -margin;
    if (alreadyInView) {
      setInView(true);
      if (once) return;
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
