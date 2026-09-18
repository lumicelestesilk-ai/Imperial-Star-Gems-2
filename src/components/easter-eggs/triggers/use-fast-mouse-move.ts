"use client";

import { useEffect, useRef } from "react";
import { useEventCallback } from "../shared/use-event-callback";

/**
 * Reports pointer positions while the pointer is moving quickly inside
 * `selector`.
 *
 * Velocity is measured against the previous sample rather than a fixed clock,
 * which keeps it honest on a 120 Hz trackpad and on a cheap mouse alike. A gap
 * longer than a couple of frames starts the measurement over, so a pointer that
 * re-enters the region after a pause doesn't register one enormous jump.
 *
 * Mouse only, on purpose: a finger has no cursor to trail, and following touch
 * moves here would fight the page's own scrolling.
 */
export function useFastMouseMove(
  selector: string,
  onFastMove: (x: number, y: number) => void,
  enabled = true,
  /** Pixels per millisecond. ~0.6 is a deliberate flourish, not a drift. */
  threshold = 0.6,
) {
  const fire = useEventCallback(onFastMove);
  const last = useRef<{ x: number; y: number; t: number } | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const onMove = (e: MouseEvent) => {
      const inside = (e.target as HTMLElement | null)?.closest?.(selector);
      if (!inside) {
        last.current = null;
        return;
      }

      const now = performance.now();
      const previous = last.current;
      last.current = { x: e.clientX, y: e.clientY, t: now };
      if (!previous) return;

      const dt = now - previous.t;
      if (dt <= 0 || dt > 120) return;
      const distance = Math.hypot(e.clientX - previous.x, e.clientY - previous.y);
      if (distance / dt >= threshold) fire(e.clientX, e.clientY);
    };

    document.addEventListener("mousemove", onMove, { passive: true });
    return () => document.removeEventListener("mousemove", onMove);
  }, [enabled, fire, selector, threshold]);
}
