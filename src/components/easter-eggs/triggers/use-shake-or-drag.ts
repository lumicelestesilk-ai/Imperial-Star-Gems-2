"use client";

import { useEffect, useRef } from "react";
import { useEventCallback } from "../shared/use-event-callback";

type MotionCtor = typeof DeviceMotionEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

/**
 * Fires when the device is shaken, or when the pointer is scrubbed back and
 * forth as though shaking something.
 *
 * **Permission.** iOS Safari gates `devicemotion` behind a prompt that may only
 * be raised from a user gesture. Raising one unprompted — on a jewellery page,
 * for a game nobody has asked for yet — would be worse than the feature is
 * worth, so where permission is required this hook simply doesn't ask and
 * leaves the scrub gesture to carry it. The scrub works with a finger as well
 * as a mouse, so nothing is out of reach on those devices.
 *
 * **The scrub.** Direction reversals are counted while the pointer is down. Four
 * changes of direction inside a second and a half is a shake; one is a drag,
 * and two is somebody changing their mind about a link.
 */
export function useShakeOrDrag(onTrigger: () => void, enabled = true) {
  const fire = useEventCallback(onTrigger);
  const armed = useRef(true);

  useEffect(() => {
    if (!enabled) return;
    armed.current = true;

    /** One shake per few seconds, however it arrived. */
    const trigger = () => {
      if (!armed.current) return;
      armed.current = false;
      window.setTimeout(() => {
        armed.current = true;
      }, 4000);
      fire();
    };

    /* ------------------------------------------------ device motion */

    let stopMotion: (() => void) | undefined;
    const Motion = (typeof window !== "undefined" ? window.DeviceMotionEvent : undefined) as
      | MotionCtor
      | undefined;

    if (Motion && typeof Motion.requestPermission !== "function") {
      let peak = 0;
      let decay = 0;
      const onMotion = (e: DeviceMotionEvent) => {
        const a = e.accelerationIncludingGravity;
        if (!a) return;
        const force = Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0);
        // Gravity alone reads about 9.8; a deliberate shake runs well past 25.
        if (force > 25) {
          peak += 1;
          window.clearTimeout(decay);
          decay = window.setTimeout(() => {
            peak = 0;
          }, 1200);
          if (peak >= 3) {
            peak = 0;
            trigger();
          }
        }
      };
      window.addEventListener("devicemotion", onMotion);
      stopMotion = () => {
        window.removeEventListener("devicemotion", onMotion);
        window.clearTimeout(decay);
      };
    }

    /* ------------------------------------------------ pointer scrub */

    let down = false;
    let lastX = 0;
    let direction = 0;
    let reversals: number[] = [];

    const onDown = (e: PointerEvent) => {
      down = true;
      lastX = e.clientX;
      direction = 0;
      reversals = [];
    };

    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - lastX;
      if (Math.abs(dx) < 18) return;
      const next = Math.sign(dx);
      lastX = e.clientX;
      if (direction !== 0 && next !== direction) {
        const now = Date.now();
        reversals = [...reversals.filter((t) => now - t < 1500), now];
        if (reversals.length >= 4) {
          reversals = [];
          trigger();
        }
      }
      direction = next;
    };

    const onUp = () => {
      down = false;
      reversals = [];
    };

    document.addEventListener("pointerdown", onDown, { passive: true });
    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerup", onUp, { passive: true });
    document.addEventListener("pointercancel", onUp, { passive: true });

    return () => {
      stopMotion?.();
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
    };
  }, [enabled, fire]);
}
