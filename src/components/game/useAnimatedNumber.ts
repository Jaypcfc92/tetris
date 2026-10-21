"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Smoothly animates toward a target number (used for the score count-up)
 * with a single rAF loop, without pulling in an animation library.
 */
export function useAnimatedNumber(target: number, durationMs = 400): number {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      fromRef.current = target;
      setDisplay(target);
      return;
    }
    const startTime = performance.now();

    const step = (now: number): void => {
      const t = Math.min((now - startTime) / durationMs, 1);
      const eased = 1 - (1 - t) ** 3;
      const value = Math.round(from + (target - from) * eased);
      setDisplay(value);
      if (t < 1) {
        frameRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = target;
        frameRef.current = null;
      }
    };

    frameRef.current = requestAnimationFrame(step);
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      fromRef.current = target;
    };
  }, [target, durationMs]);

  return display;
}
