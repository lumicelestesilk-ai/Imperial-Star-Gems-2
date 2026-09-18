"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { GameProps } from "../shared/context";

/**
 * A three-wheel combination lock, in the corner, for people who have stopped
 * reading.
 *
 * It appears after a minute of stillness, which means it must not behave like
 * an interruption: no backdrop, no scroll lock, no focus stolen. Move the mouse
 * and it is simply there, in the corner, waiting. Escape or the ✕ dismisses it.
 *
 * ## The combination
 *
 * Every digit is counted off the page in front of the visitor, so the answer is
 * always derivable and never guessed:
 *
 *   1. how many links the header's primary navigation holds
 *   2. how many second-level headings the page has
 *   3. how many words are in the page's first heading
 *
 * Each is taken modulo 10, so a page with twelve headings wants a 2. The hints
 * on the dial say all of this in words; the counting is the game.
 */

const HINTS = [
  "links in the top navigation",
  "second-level headings on this page",
  "words in this page's first heading",
];

function combination(): [number, number, number] {
  const nav = document.querySelectorAll('header nav[aria-label="Primary"] a').length;
  const headings = document.querySelectorAll("main h2").length;
  const h1 = document.querySelector("main h1")?.textContent?.trim() ?? "";
  const words = h1 ? h1.split(/\s+/).filter(Boolean).length : 0;
  return [nav % 10, headings % 10, words % 10];
}

export function VaultCracker({ onClose, onWin }: GameProps) {
  const [wheels, setWheels] = useState<[number, number, number]>([0, 0, 0]);
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<"closed" | "open">("closed");

  useEffect(() => setMounted(true), []);

  // Read once, on open: counting from a DOM that shifts under the player would
  // make the puzzle unfair rather than difficult.
  const answer = useMemo(() => (mounted ? combination() : ([0, 0, 0] as const)), [mounted]);

  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mounted, onClose]);

  useEffect(() => {
    if (state === "open") return;
    if (wheels.every((digit, i) => digit === answer[i])) {
      setState("open");
      onWin();
    }
  }, [answer, onWin, state, wheels]);

  const turn = (index: number, by: number) =>
    setWheels((current) => {
      const next = [...current] as [number, number, number];
      next[index] = (next[index] + by + 10) % 10;
      return next;
    });

  if (!mounted) return null;

  return createPortal(
    <section
      aria-label="Vault"
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-[75] w-[min(17rem,calc(100vw-2rem))] rounded-[22px] border border-hairline bg-porcelain p-4 shadow-[0_18px_50px_-18px_rgba(23,24,27,0.4)] sm:left-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[18px] leading-none">
            {state === "open" ? "Open" : "The vault"}
          </h2>
          <p className="mt-1 text-[12px] text-ink-muted">
            {state === "open" ? "Counted, not guessed." : "Three digits, all on this page."}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close the vault"
          className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors duration-200 hover:bg-panel hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M5 5 19 19M19 5 5 19" />
          </svg>
        </button>
      </div>

      <div className="mt-4 flex justify-center gap-2.5">
        {wheels.map((digit, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => turn(i, 1)}
              aria-label={`Increase digit ${i + 1}`}
              className="flex h-6 w-9 items-center justify-center rounded-t-[8px] text-ink-muted transition-colors duration-200 hover:bg-panel hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink"
            >
              <svg viewBox="0 0 24 24" aria-hidden className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 15l6-6 6 6" />
              </svg>
            </button>

            <input
              type="text"
              inputMode="numeric"
              aria-label={`Digit ${i + 1}: ${HINTS[i]}`}
              value={digit}
              onChange={(e) => {
                const parsed = Number(e.target.value.replace(/\D/g, "").slice(-1));
                if (Number.isFinite(parsed)) {
                  setWheels((current) => {
                    const next = [...current] as [number, number, number];
                    next[i] = parsed;
                    return next;
                  });
                }
              }}
              onWheel={(e) => turn(i, e.deltaY > 0 ? 1 : -1)}
              className={`h-12 w-9 rounded-[8px] border text-center font-display text-[22px] tabular-nums transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink ${
                state === "open" ? "border-ink bg-panel" : "border-hairline bg-porcelain"
              }`}
            />

            <button
              type="button"
              onClick={() => turn(i, -1)}
              aria-label={`Decrease digit ${i + 1}`}
              className="flex h-6 w-9 items-center justify-center rounded-b-[8px] text-ink-muted transition-colors duration-200 hover:bg-panel hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink"
            >
              <svg viewBox="0 0 24 24" aria-hidden className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <ol className="mt-4 space-y-1 border-t border-hairline pt-3 text-[12px] text-ink-muted">
        {HINTS.map((hint, i) => (
          <li key={hint} className={wheels[i] === answer[i] ? "text-ink" : undefined}>
            {i + 1}. {hint}
          </li>
        ))}
      </ol>

      <p aria-live="polite" className="sr-only">
        {state === "open" ? "The vault is open." : ""}
      </p>
    </section>,
    document.body,
  );
}
