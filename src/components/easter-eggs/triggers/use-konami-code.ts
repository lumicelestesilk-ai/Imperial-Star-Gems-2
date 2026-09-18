"use client";

import { useEffect, useRef } from "react";
import { isTypingTarget, useEventCallback } from "../shared/use-event-callback";

const KONAMI = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

/**
 * The code, anywhere on the site.
 *
 * The progress index only resets to zero on a wrong key if that key isn't
 * itself the start of the sequence — so ↑↑↑↑↓↓… still works, which is what
 * anyone mashing the arrows expects.
 */
export function useKonamiCode(onTrigger: () => void, enabled = true) {
  const fire = useEventCallback(onTrigger);
  const index = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

      if (key === KONAMI[index.current]) {
        index.current += 1;
        if (index.current === KONAMI.length) {
          index.current = 0;
          fire();
        }
        return;
      }
      index.current = key === KONAMI[0] ? 1 : 0;
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [enabled, fire]);
}
