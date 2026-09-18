"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { recordScore } from "../gem-store";
import type { GameProps } from "../shared/context";
import { GameButton, Overlay } from "../shared/overlay";

/**
 * Pull the ring back, let it go, land it on a peg.
 *
 * One axis and no physics engine: the pull sets a power, the power sets a
 * landing point, and the flight between the two is an interpolation with an arc
 * drawn over it. That is enough to feel like a throw, and a real solver would
 * be a worse game — it would reward tuning rather than judgement.
 *
 * Pointer events throughout, so a finger and a mouse take exactly the same
 * path through this file.
 */

const TOSSES = 3;
const TARGET = 15;
const FLIGHT_MS = 720;

/** Further is worth more. Positions and catch widths are percentages of the lane. */
const PEGS = [
  { at: 34, width: 7, points: 5 },
  { at: 60, width: 5.5, points: 10 },
  { at: 84, width: 4, points: 20 },
];

/** Pull of 0–1 maps onto the lane, with a little past the last peg to overshoot into. */
const REACH = 104;

type Shot = { landed: number; points: number };

export function RingToss({ onClose, onWin, reducedMotion }: GameProps) {
  const [pull, setPull] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [flight, setFlight] = useState<number | null>(null);
  const [shots, setShots] = useState<Shot[]>([]);
  const laneRef = useRef<HTMLDivElement | null>(null);
  const frame = useRef(0);

  const total = shots.reduce((sum, s) => sum + s.points, 0);
  const done = shots.length >= TOSSES;

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  useEffect(() => {
    if (!done) return;
    recordScore("ring-toss", total);
    if (total >= TARGET) onWin();
    // Scored once, when the third ring lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  /** Pull is measured leftwards from the launch mark, capped at the lane's width. */
  const measure = useCallback((clientX: number) => {
    const box = laneRef.current?.getBoundingClientRect();
    if (!box) return 0;
    const fromLeft = (clientX - box.left) / box.width;
    return Math.max(0, Math.min(1, 0.22 - fromLeft) / 0.22);
  }, []);

  const release = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    const power = pull;
    setPull(0);
    if (power < 0.08) return;

    const landed = power * REACH;
    const began = performance.now();

    const fly = (now: number) => {
      const t = Math.min(1, (now - began) / (reducedMotion ? 1 : FLIGHT_MS));
      setFlight(landed * t);
      if (t < 1) {
        frame.current = requestAnimationFrame(fly);
        return;
      }
      const peg = PEGS.find((p) => Math.abs(p.at - landed) <= p.width);
      setShots((current) => [...current, { landed, points: peg?.points ?? 0 }]);
      window.setTimeout(() => setFlight(null), 520);
    };
    frame.current = requestAnimationFrame(fly);
  }, [dragging, pull, reducedMotion]);

  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => setPull(measure(e.clientX));
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
  }, [dragging, measure, release]);

  const restart = () => {
    setShots([]);
    setFlight(null);
    setPull(0);
  };

  const ringAt = flight ?? -pull * 18;
  // A flat parabola over the lane, so the throw reads as a throw.
  const lift = flight !== null ? Math.sin((flight / Math.max(1, ringAt || 1)) * Math.PI) : 0;

  return (
    <Overlay
      title="Ring Toss"
      onClose={onClose}
      wide
      footer={
        <div className="flex items-center justify-between gap-4">
          <p className="text-[13px] tabular-nums text-ink-muted">
            Toss {Math.min(shots.length + 1, TOSSES)} of {TOSSES} · {total} points
          </p>
          {done ? (
            <GameButton onClick={restart}>Play again</GameButton>
          ) : (
            <p className="text-[13px] text-ink-muted">{TARGET} points takes the gem.</p>
          )}
        </div>
      }
    >
      <p className="measure text-[14px] text-ink-muted">
        Drag the ring back and let go. The far peg is worth four times the near one, and it is four
        times as easy to miss.
      </p>

      <div
        ref={laneRef}
        onPointerDown={(e) => {
          if (done || flight !== null) return;
          (e.target as Element).setPointerCapture?.(e.pointerId);
          setDragging(true);
          setPull(measure(e.clientX));
        }}
        className="relative mt-5 h-[210px] touch-none select-none overflow-hidden rounded-[18px] bg-panel"
      >
        {/* The bench the pegs stand on. */}
        <div className="absolute inset-x-0 bottom-[46px] h-px bg-hairline" />

        {PEGS.map((peg) => {
          const hit = shots.some((s) => Math.abs(peg.at - s.landed) <= peg.width);
          return (
            <div
              key={peg.at}
              className="absolute bottom-[46px] flex flex-col items-center"
              style={{ left: `${peg.at}%`, transform: "translateX(-50%)" }}
            >
              <span className="mb-1 text-[11px] tabular-nums text-ink-muted-panel">{peg.points}</span>
              <span
                aria-hidden
                className="w-[3px] rounded-t-full"
                style={{
                  height: 44,
                  background: hit ? "var(--color-ink)" : "var(--color-metal)",
                }}
              />
            </div>
          );
        })}

        {/* Rings that have already landed stay where they fell. */}
        {shots.map((shot, i) => (
          <span
            key={i}
            aria-hidden
            className="absolute bottom-[40px]"
            style={{ left: `${Math.max(2, Math.min(98, shot.landed))}%`, transform: "translateX(-50%)" }}
          >
            <RingGlyph faded />
          </span>
        ))}

        {!done ? (
          <span
            aria-hidden
            className="absolute bottom-[62px]"
            style={{
              left: `${Math.max(1, 12 + ringAt)}%`,
              transform: `translateX(-50%) translateY(${-lift * 52}px)`,
            }}
          >
            <RingGlyph />
          </span>
        ) : null}

        <div className="absolute bottom-3 left-4 right-4 flex items-center gap-3">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-hairline">
            <div
              className="h-full rounded-full bg-ink transition-[width] duration-75"
              style={{ width: `${pull * 100}%` }}
            />
          </div>
          <span className="w-[68px] shrink-0 text-right text-[11px] tabular-nums text-ink-muted-panel">
            {dragging ? `${Math.round(pull * 100)}%` : "pull back"}
          </span>
        </div>

        {done ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-porcelain/85 px-6 text-center backdrop-blur-[1px]">
            <p className="font-display text-[22px]">
              {total >= TARGET ? "Gem earned" : `${total} points`}
            </p>
            <p className="measure text-[14px] text-ink-muted">
              {total >= TARGET
                ? "Three rings, well thrown."
                : `${TARGET} takes it. One good throw at the far peg beats three safe ones.`}
            </p>
            <GameButton onClick={restart}>Play again</GameButton>
          </div>
        ) : null}
      </div>
    </Overlay>
  );
}

function RingGlyph({ faded = false }: { faded?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className="h-6 w-6" opacity={faded ? 0.5 : 1}>
      <ellipse cx="16" cy="16" rx="11" ry="9" fill="none" stroke="var(--color-metal)" strokeWidth="3" />
    </svg>
  );
}
