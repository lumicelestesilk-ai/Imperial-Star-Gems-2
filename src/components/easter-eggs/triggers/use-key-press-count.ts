"use client";

import { useEffect, useRef } from "react";
import { isTypingTarget, useEventCallback } from "../shared/use-event-callback";

/**
 * Fires when a key is pressed `count` times inside `withinMs`.
 *
 * Timestamps in a sliding window rather than a counter on a timer: pressing C
 * slowly, then three times quickly, should fire on the third quick press, not
 * be spoiled by the slow one.
 *
 * Auto-repeat is ignored — holding the key down is not three presses.
 */
export function useKeyPressCount(
  key: string,
  count: number,
  withinMs: number,
  onTrigger: () => void,
  enabled = true,
) {
  const fire = useEventCallback(onTrigger);
  const hits = useRef<number[]>([]);

  useEffect(() => {
    if (!enabled) return;
    const wanted = key.toLowerCase();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.toLowerCase() !== wanted) return;

      const now = Date.now();
      hits.current = [...hits.current.filter((t) => now - t < withinMs), now];
      if (hits.current.length >= count) {
        hits.current = [];
        fire();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [count, enabled, fire, key, withinMs]);
}
