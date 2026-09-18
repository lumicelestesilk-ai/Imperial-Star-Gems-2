"use client";

import { useEffect, useRef } from "react";
import { useEventCallback } from "../shared/use-event-callback";

export const LOGO_SELECTOR = '[data-easter-egg="logo"]';

/**
 * Fires when the logo is clicked `count` times inside `withinMs`.
 *
 * The logo is a real link home, and it stays one: a single click always
 * navigates. Only a click that lands within the window of the one before it is
 * swallowed, so ordinary use is untouched and a burst doesn't fling the visitor
 * through seven navigations.
 *
 * The first click of a burst does navigate. That is fine, and deliberate: the
 * provider lives in the root layout, so it survives a client-side navigation
 * with its tally intact, and the remaining clicks land on the logo of whatever
 * page it went to. Starting a burst from a deep page finishes it on the home
 * page rather than failing.
 */
export function useLogoClickBurst(
  onTrigger: () => void,
  enabled = true,
  count = 7,
  withinMs = 2000,
) {
  const fire = useEventCallback(onTrigger);
  const hits = useRef<number[]>([]);

  useEffect(() => {
    if (!enabled) return;

    const onClick = (e: MouseEvent) => {
      if (e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (!target?.closest?.(LOGO_SELECTOR)) return;

      const now = Date.now();
      const previous = hits.current[hits.current.length - 1];
      // Second and later clicks of a rapid run don't navigate.
      if (previous !== undefined && now - previous < withinMs) e.preventDefault();

      hits.current = [...hits.current.filter((t) => now - t < withinMs), now];
      if (hits.current.length >= count) {
        hits.current = [];
        fire();
      }
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [count, enabled, fire, withinMs]);
}
