"use client";

import { useEffect, useRef } from "react";
import { isTypingTarget, useEventCallback } from "../shared/use-event-callback";

/**
 * Fires when a word is typed anywhere on the page with nothing focused.
 *
 * A rolling buffer rather than an index, so the word is found wherever it lands
 * in whatever else was typed — `xxloupe` counts. The buffer is capped at the
 * word's length and cleared after a pause, so it can't accumulate a keylog.
 */
export function useTypedWord(word: string, onTrigger: () => void, enabled = true) {
  const fire = useEventCallback(onTrigger);
  const buffer = useRef("");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!enabled || !word) return;
    const target = word.toLowerCase();

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.length !== 1) return;

      buffer.current = (buffer.current + e.key.toLowerCase()).slice(-target.length);

      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        buffer.current = "";
      }, 1500);

      if (buffer.current === target) {
        buffer.current = "";
        fire();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(timer.current);
    };
  }, [enabled, fire, word]);
}
