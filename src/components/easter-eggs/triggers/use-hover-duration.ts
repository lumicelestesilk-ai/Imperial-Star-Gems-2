"use client";

import { useEffect, useRef } from "react";
import { useEventCallback } from "../shared/use-event-callback";

/**
 * Fires when the pointer rests on an element matching `selector` for `ms`, or
 * when a finger holds it for the same time.
 *
 * The matched ancestor is handed to the caller, because the games that use this
 * need to read something off the element — which product it was. Moving between
 * children of the same card doesn't restart the clock; moving to a different
 * card does.
 *
 * A long press is cancelled by a scroll, so reading a page by dragging it past
 * a product photo never trips it.
 */
export function useHoverDuration(
  selector: string,
  ms: number,
  onTrigger: (element: HTMLElement) => void,
  enabled = true,
  /**
   * Long press only, ignoring the mouse. For targets a pointer legitimately
   * rests on — the logo, which people park the cursor over before clicking —
   * where a hover timer would fire on ordinary use.
   */
  touchOnly = false,
) {
  const fire = useEventCallback(onTrigger);
  const timer = useRef<number | undefined>(undefined);
  const held = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const cancel = () => {
      window.clearTimeout(timer.current);
      held.current = null;
    };

    const start = (element: HTMLElement) => {
      if (held.current === element) return;
      window.clearTimeout(timer.current);
      held.current = element;
      timer.current = window.setTimeout(() => {
        if (held.current === element) fire(element);
      }, ms);
    };

    const onOver = (e: MouseEvent) => {
      const match = (e.target as HTMLElement | null)?.closest?.(selector);
      if (match instanceof HTMLElement) start(match);
      else cancel();
    };

    const onTouchStart = (e: TouchEvent) => {
      const match = (e.target as HTMLElement | null)?.closest?.(selector);
      if (match instanceof HTMLElement) start(match);
    };

    if (!touchOnly) document.addEventListener("mouseover", onOver);
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", cancel);
    document.addEventListener("touchcancel", cancel);
    document.addEventListener("touchmove", cancel, { passive: true });
    window.addEventListener("scroll", cancel, { passive: true });
    window.addEventListener("blur", cancel);

    return () => {
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", cancel);
      document.removeEventListener("touchcancel", cancel);
      document.removeEventListener("touchmove", cancel);
      window.removeEventListener("scroll", cancel);
      window.removeEventListener("blur", cancel);
      window.clearTimeout(timer.current);
    };
  }, [enabled, fire, ms, selector, touchOnly]);
}
