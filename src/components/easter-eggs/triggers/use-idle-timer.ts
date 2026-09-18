"use client";

import { useEffect, useRef } from "react";
import { useEventCallback } from "../shared/use-event-callback";

const ACTIVITY = [
  "mousemove",
  "mousedown",
  "keydown",
  "wheel",
  "touchstart",
  "touchmove",
  "scroll",
] as const;

/**
 * Fires after `idleMs` with no sign of life, once per idle spell.
 *
 * The timer is only restarted by activity, never by the callback, so walking
 * away from the keyboard for an hour produces one vault and not sixty. Coming
 * back and leaving again arms it afresh.
 *
 * A hidden tab doesn't count as idle attention — there is no point opening
 * something nobody can see — so the timer stands down while the page is hidden
 * and starts over when it returns.
 */
export function useIdleTimer(idleMs: number, onIdle: () => void, enabled = true) {
  const fire = useEventCallback(onIdle);
  const timer = useRef<number | undefined>(undefined);
  const fired = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const arm = () => {
      window.clearTimeout(timer.current);
      if (document.visibilityState === "hidden") return;
      timer.current = window.setTimeout(() => {
        if (fired.current) return;
        fired.current = true;
        fire();
      }, idleMs);
    };

    const onActivity = () => {
      fired.current = false;
      arm();
    };

    ACTIVITY.forEach((type) =>
      window.addEventListener(type, onActivity, { passive: true }),
    );
    document.addEventListener("visibilitychange", onActivity);
    arm();

    return () => {
      ACTIVITY.forEach((type) => window.removeEventListener(type, onActivity));
      document.removeEventListener("visibilitychange", onActivity);
      window.clearTimeout(timer.current);
    };
  }, [enabled, fire, idleMs]);
}
