"use client";

import { useEffect, useRef } from "react";
import { useEventCallback } from "../shared/use-event-callback";

/**
 * Fires on three clicks inside `selector` within `withinMs`.
 *
 * Listens on the document and tests with `closest`, so it needs no ref into a
 * component it doesn't own — the footer stays an ordinary footer.
 *
 * Clicks that land on a link or button inside the region are ignored: the
 * visitor was using the footer, not playing with it, and hijacking the third
 * click of someone double-checking a link would be a bug, not a surprise.
 */
export function useTripleClick(
  selector: string,
  onTrigger: () => void,
  enabled = true,
  withinMs = 600,
) {
  const fire = useEventCallback(onTrigger);
  const hits = useRef<number[]>([]);

  useEffect(() => {
    if (!enabled) return;

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest?.(selector)) return;
      if (target.closest("a, button, input, select, textarea, label")) return;

      const now = Date.now();
      hits.current = [...hits.current.filter((t) => now - t < withinMs), now];
      if (hits.current.length >= 3) {
        hits.current = [];
        fire();
      }
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [enabled, fire, selector, withinMs]);
}
