"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { recordScore } from "../gem-store";
import { DIWALI_PALETTE } from "../shared/styles";

/**
 * Five lamps. Watch the order they light in, then light them in the same order.
 * The run grows by one each round; five rounds takes the gem.
 *
 * Unlike every other game here this one is ambient — a strip that sits on the
 * page rather than an overlay that covers it, because it belongs to the page it
 * is on. It is only mounted on Diwali landing pages.
 *
 * Under reduced motion the lamps still light, they simply do it in hard steps
 * with no glow transition: the sequence *is* the game, so it can't be skipped,
 * but the flicker can be.
 */

const LAMPS = 5;
const TARGET_ROUND = 5;
const LIT_MS = 480;
const GAP_MS = 220;

type Phase = "idle" | "showing" | "repeating" | "wrong" | "won";

export function DiyaSequence({ onWin, reducedMotion }: { onWin: () => void; reducedMotion: boolean }) {
  const [sequence, setSequence] = useState<number[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [lit, setLit] = useState<number | null>(null);
  const [step, setStep] = useState(0);
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  /** Plays the run back, then hands over. */
  const show = useCallback(
    (run: number[]) => {
      setPhase("showing");
      setStep(0);
      clearTimers();
      run.forEach((lamp, i) => {
        timers.current.push(
          window.setTimeout(() => setLit(lamp), i * (LIT_MS + GAP_MS) + 400),
        );
        timers.current.push(
          window.setTimeout(() => setLit(null), i * (LIT_MS + GAP_MS) + 400 + LIT_MS),
        );
      });
      timers.current.push(
        window.setTimeout(() => setPhase("repeating"), run.length * (LIT_MS + GAP_MS) + 400),
      );
    },
    [],
  );

  const advance = useCallback(() => {
    const next = [...sequence, Math.floor(Math.random() * LAMPS)];
    setSequence(next);
    show(next);
  }, [sequence, show]);

  const press = (lamp: number) => {
    if (phase !== "repeating") return;
    setLit(lamp);
    window.setTimeout(() => setLit(null), 180);

    if (sequence[step] !== lamp) {
      setPhase("wrong");
      window.setTimeout(() => {
        setSequence([]);
        setStep(0);
        setPhase("idle");
      }, 1100);
      return;
    }

    const at = step + 1;
    if (at < sequence.length) {
      setStep(at);
      return;
    }

    // Round complete.
    if (sequence.length >= TARGET_ROUND) {
      recordScore("diya-sequence", sequence.length);
      setPhase("won");
      onWin();
      return;
    }
    recordScore("diya-sequence", sequence.length);
    window.setTimeout(() => {
      const next = [...sequence, Math.floor(Math.random() * LAMPS)];
      setSequence(next);
      show(next);
    }, 620);
  };

  const message =
    phase === "won"
      ? `All ${TARGET_ROUND} rounds — the gem is yours.`
      : phase === "wrong"
        ? "Not that one. Starting again."
        : phase === "showing"
          ? "Watch the order…"
          : phase === "repeating"
            ? `Repeat it — ${sequence.length} ${sequence.length === 1 ? "lamp" : "lamps"}`
            : "Light the lamps in the order they were lit.";

  return (
    <section
      aria-label="Diya sequence"
      className="mx-auto my-12 w-full max-w-[520px] rounded-[22px] border border-hairline px-5 py-6 text-center"
    >
      <h2 className="font-display text-[20px] leading-none">Light the diyas</h2>
      <p aria-live="polite" className="mt-2 min-h-[20px] text-[13px] text-ink-muted">
        {message}
      </p>

      <ul className="mt-5 flex items-end justify-center gap-2 sm:gap-3">
        {Array.from({ length: LAMPS }, (_, lamp) => {
          const on = lit === lamp || phase === "won";
          return (
            <li key={lamp}>
              <button
                type="button"
                onClick={() => press(lamp)}
                disabled={phase === "showing" || phase === "wrong"}
                aria-label={`Diya ${lamp + 1}${on ? ", lit" : ""}`}
                aria-pressed={on}
                className={`rounded-[14px] p-1.5 disabled:cursor-default focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
                  reducedMotion ? "" : "transition-transform duration-200"
                } ${phase === "repeating" ? "hover:-translate-y-0.5" : ""}`}
              >
                <Diya lit={on} reducedMotion={reducedMotion} />
              </button>
            </li>
          );
        })}
      </ul>

      {phase === "idle" ? (
        <button
          type="button"
          onClick={advance}
          className="mt-5 rounded-full border border-ink px-5 py-2 text-[14px] transition-colors duration-200 hover:bg-ink hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Begin
        </button>
      ) : null}
    </section>
  );
}

/** An oil lamp: a shallow bowl, a wick, and a flame that only shows when lit. */
function Diya({ lit, reducedMotion }: { lit: boolean; reducedMotion: boolean }) {
  return (
    <svg viewBox="0 0 48 56" aria-hidden className="h-12 w-11 sm:h-14 sm:w-12">
      {lit ? (
        <>
          <ellipse cx="24" cy="18" rx="11" ry="13" fill={DIWALI_PALETTE.glint} opacity="0.28" />
          <path
            d="M24 8c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11Z"
            fill={DIWALI_PALETTE.glint}
            stroke={DIWALI_PALETTE.line}
            strokeWidth="1.2"
            strokeLinejoin="round"
            style={reducedMotion ? undefined : { transformOrigin: "24px 26px", animation: "isg-flicker 900ms ease-in-out infinite alternate" }}
          />
        </>
      ) : (
        <path d="M24 20v6" stroke={DIWALI_PALETTE.line} strokeWidth="1.6" strokeLinecap="round" opacity="0.5" />
      )}

      <path
        d="M8 32h32c0 9-7 14-16 14S8 41 8 32Z"
        fill={lit ? DIWALI_PALETTE.fill : "var(--color-panel)"}
        stroke={DIWALI_PALETTE.line}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M8 32h32" stroke={DIWALI_PALETTE.line} strokeWidth="1.2" opacity="0.6" />

      {!reducedMotion ? (
        <style>{`
          @keyframes isg-flicker {
            from { transform: scaleY(1) scaleX(1); }
            to   { transform: scaleY(1.08) scaleX(0.95); }
          }
        `}</style>
      ) : null}
    </svg>
  );
}
