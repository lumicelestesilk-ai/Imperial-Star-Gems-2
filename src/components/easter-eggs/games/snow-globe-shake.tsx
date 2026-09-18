"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { GameProps } from "../shared/context";

/**
 * Shake the page and it snows diamonds, inside a globe, for four seconds.
 *
 * No skill and no score: the gem is for finding it. That makes reduced motion
 * easy to honour honestly — the globe still appears, the gem is still awarded,
 * and the fall is simply replaced by a settled scene, rather than the visitor
 * being locked out of a collectable for having a preference about animation.
 *
 * The flakes are a CSS animation on plain elements, so the browser can run them
 * off the main thread while the rest of the page carries on behind.
 */

const LIFE_MS = 4200;
const FLAKES = 46;

export function SnowGlobeShake({ onClose, onWin, reducedMotion }: GameProps) {
  const [mounted, setMounted] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const awarded = useRef(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (awarded.current) return;
    awarded.current = true;
    onWin();
  }, [onWin]);

  useEffect(() => {
    if (!mounted) return;
    const fade = window.setTimeout(() => setLeaving(true), LIFE_MS - 500);
    const done = window.setTimeout(onClose, LIFE_MS);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(fade);
      window.clearTimeout(done);
      document.removeEventListener("keydown", onKey);
    };
  }, [mounted, onClose]);

  const flakes = useMemo(
    () =>
      Array.from({ length: FLAKES }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 4 + Math.random() * 7,
        delay: Math.random() * (reducedMotion ? 0 : 2600),
        duration: 2400 + Math.random() * 2200,
        drift: (Math.random() - 0.5) * 30,
        // Where a settled flake comes to rest, for the reduced-motion scene.
        settled: 62 + Math.random() * 30,
      })),
    [reducedMotion],
  );

  if (!mounted) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[80] flex items-center justify-center p-6 transition-opacity duration-500 ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
    >
      <button
        type="button"
        aria-label="Close the snow globe"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-ink/40 backdrop-blur-[2px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="A snow globe of falling diamonds"
        className="relative flex flex-col items-center"
      >
        <div className="relative aspect-square w-[min(72vw,72vh,420px)] overflow-hidden rounded-full border border-hairline bg-gradient-to-b from-[var(--color-porcelain)] to-[var(--color-panel)] shadow-[0_30px_80px_-30px_rgba(23,24,27,0.6)]">
          {flakes.map((flake) => (
            <span
              key={flake.id}
              aria-hidden
              className="absolute"
              style={
                reducedMotion
                  ? { left: `${flake.left}%`, top: `${flake.settled}%`, opacity: 0.75 }
                  : {
                      left: `${flake.left}%`,
                      top: "-8%",
                      animation: `isg-globe-fall ${flake.duration}ms linear ${flake.delay}ms infinite`,
                      ["--isg-drift" as string]: `${flake.drift}px`,
                    }
              }
            >
              <svg viewBox="0 0 24 24" style={{ width: flake.size * 2, height: flake.size * 2 }}>
                <path
                  d="M6 4h12l4 6-10 12L2 10Z"
                  fill="var(--color-facet)"
                  stroke="var(--color-metal)"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          ))}

          {/* The glass, and a base for it to stand on. */}
          <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-white/50 via-transparent to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-[16%] bg-panel" />
        </div>

        <p className="mt-5 text-center font-display text-[20px] text-white drop-shadow-[0_2px_10px_rgba(23,24,27,0.6)]">
          {reducedMotion ? "Settled" : "Shaken"}
        </p>
      </div>

      {!reducedMotion ? (
        <style>{`
          @keyframes isg-globe-fall {
            from { transform: translate(0, 0) rotate(0deg); }
            to   { transform: translate(var(--isg-drift), 130%) rotate(220deg); }
          }
        `}</style>
      ) : null}
    </div>,
    document.body,
  );
}
