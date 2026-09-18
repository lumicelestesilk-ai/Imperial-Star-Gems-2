"use client";

import { useEffect } from "react";
import { useEventCallback } from "../shared/use-event-callback";
import { LOGO_SELECTOR } from "./use-logo-click-burst";

/**
 * Shift+click on the logo.
 *
 * The default is suppressed: browsers treat Shift+click on a link as "open in a
 * new window", and a stray window is a worse surprise than no game at all.
 */
export function useShiftClickLogo(onTrigger: () => void, enabled = true) {
  const fire = useEventCallback(onTrigger);

  useEffect(() => {
    if (!enabled) return;

    const onClick = (e: MouseEvent) => {
      if (!e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (!target?.closest?.(LOGO_SELECTOR)) return;
      e.preventDefault();
      fire();
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [enabled, fire]);
}
