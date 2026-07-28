"use client";

import { useEffect, useLayoutEffect } from "react";

/**
 * useLayoutEffect on the client (runs before paint, so visibility flips happen
 * off-screen with no flash), useEffect on the server (avoids the SSR warning).
 */
export const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;
