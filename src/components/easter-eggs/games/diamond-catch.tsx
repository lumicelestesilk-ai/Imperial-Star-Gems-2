"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { recordScore } from "../gem-store";
import type { GameProps } from "../shared/context";
import { GameButton, Overlay } from "../shared/overlay";

/**
 * Thirty seconds, a ring, and a sky full of falling stones. Catch the
 * diamonds, let the coal fall past. Fifty points takes the gem.
 *
 * The field is measured in percentages rather than pixels so the same numbers
 * work on a phone and a desktop, and the loop keeps its entities in a ref —
 * React is asked to paint once a frame, not to own the physics.
 */

const ROUND_MS = 30_000;
const TARGET = 50;
const RING_HALF = 9;
const CATCH_LINE = 86;

type Falling = {
  id: number;
  x: number;
  y: number;
  speed: number;
  coal: boolean;
  spin: number;
};

export function DiamondCatch({ onClose, onWin, reducedMotion }: GameProps) {
  const [phase, setPhase] = useState<"ready" | "playing" | "over">("ready");
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(ROUND_MS);
  const [items, setItems] = useState<Falling[]>([]);
  const [ringX, setRingX] = useState(50);

  const fieldRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef(50);
  const itemsRef = useRef<Falling[]>([]);
  const scoreRef = useRef(0);
  const keys = useRef({ left: false, right: false });

  const finish = useCallback(() => {
    setPhase("over");
    recordScore("diamond-catch", scoreRef.current);
    if (scoreRef.current >= TARGET) onWin();
  }, [onWin]);

  const start = () => {
    scoreRef.current = 0;
    itemsRef.current = [];
    ringRef.current = 50;
    setScore(0);
    setItems([]);
    setRingX(50);
    setLeft(ROUND_MS);
    setPhase("playing");
  };

  /* ------------------------------------------------------------ the loop */

  useEffect(() => {
    if (phase !== "playing") return;

    let frame = 0;
    let nextId = 0;
    let lastSpawn = 0;
    let previous = performance.now();
    const began = previous;

    const tick = (now: number) => {
      const dt = Math.min(now - previous, 48);
      previous = now;
      const elapsed = now - began;

      if (elapsed >= ROUND_MS) {
        finish();
        return;
      }
      setLeft(ROUND_MS - elapsed);

      // Steady at first, then quicker — the last ten seconds are the game.
      const pace = 1 + (elapsed / ROUND_MS) * 0.9;
      if (now - lastSpawn > 620 / pace) {
        lastSpawn = now;
        itemsRef.current = [
          ...itemsRef.current,
          {
            id: nextId++,
            x: 8 + Math.random() * 84,
            y: -6,
            speed: (0.022 + Math.random() * 0.016) * pace,
            // Roughly one in four is coal, never two in a row at the start.
            coal: elapsed > 2500 && Math.random() < 0.26,
            spin: Math.random() * 360,
          },
        ];
      }

      if (keys.current.left) ringRef.current = Math.max(RING_HALF, ringRef.current - dt * 0.09);
      if (keys.current.right) ringRef.current = Math.min(100 - RING_HALF, ringRef.current + dt * 0.09);

      let gained = 0;
      const survivors: Falling[] = [];
      for (const item of itemsRef.current) {
        const y = item.y + item.speed * dt;
        if (y >= CATCH_LINE && y < CATCH_LINE + 12) {
          if (Math.abs(item.x - ringRef.current) < RING_HALF) {
            gained += item.coal ? -15 : 10;
            continue;
          }
        }
        if (y > 106) continue;
        survivors.push({ ...item, y });
      }
      itemsRef.current = survivors;

      if (gained !== 0) {
        scoreRef.current = Math.max(0, scoreRef.current + gained);
        setScore(scoreRef.current);
      }
      setItems(survivors);
      setRingX(ringRef.current);

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [finish, phase]);

  /* ------------------------------------------------------------ controls */

  useEffect(() => {
    if (phase !== "playing") return;
    const down = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") keys.current.left = true;
      if (e.key === "ArrowRight") keys.current.right = true;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") keys.current.left = false;
      if (e.key === "ArrowRight") keys.current.right = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      keys.current.left = false;
      keys.current.right = false;
    };
  }, [phase]);

  /** Dragging or simply moving over the field steers too — no keyboard needed. */
  const steer = (clientX: number) => {
    const box = fieldRef.current?.getBoundingClientRect();
    if (!box) return;
    const percent = ((clientX - box.left) / box.width) * 100;
    ringRef.current = Math.min(100 - RING_HALF, Math.max(RING_HALF, percent));
    setRingX(ringRef.current);
  };

  const won = score >= TARGET;

  return (
    <Overlay
      title="Diamond Catch"
      onClose={onClose}
      wide
      footer={
        <div className="flex items-center justify-between gap-4">
          <p className="text-[13px] text-ink-muted">
            Arrow keys, or drag across the field. {TARGET} points takes the gem.
          </p>
          {phase === "playing" ? (
            <p className="shrink-0 text-[13px] tabular-nums text-ink-muted">
              {Math.ceil(left / 1000)}s
            </p>
          ) : (
            <GameButton onClick={start}>{phase === "ready" ? "Start" : "Play again"}</GameButton>
          )}
        </div>
      }
    >
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-[12px] text-ink-muted">Score</p>
        <p className="font-display text-[26px] leading-none tabular-nums">{score}</p>
      </div>

      <div
        ref={fieldRef}
        onPointerMove={(e) => phase === "playing" && steer(e.clientX)}
        onPointerDown={(e) => phase === "playing" && steer(e.clientX)}
        className="relative mt-3 h-[min(52vh,380px)] touch-none select-none overflow-hidden rounded-[18px] bg-panel"
      >
        {items.map((item) => (
          <span
            key={item.id}
            aria-hidden
            className="absolute"
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              transform: `translate(-50%,-50%) rotate(${reducedMotion ? 0 : item.spin + item.y * 2}deg)`,
            }}
          >
            {item.coal ? <Coal /> : <Diamond />}
          </span>
        ))}

        <span
          aria-hidden
          className="absolute"
          style={{ left: `${ringX}%`, top: `${CATCH_LINE + 5}%`, transform: "translate(-50%,-50%)" }}
        >
          <Ring />
        </span>

        {phase !== "playing" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-porcelain/85 px-6 text-center backdrop-blur-[1px]">
            {phase === "ready" ? (
              <>
                <p className="font-display text-[22px]">Catch the diamonds, dodge the coal</p>
                <p className="text-[14px] text-ink-muted">Thirty seconds on the clock.</p>
              </>
            ) : (
              <>
                <p className="font-display text-[22px]">
                  {won ? "Gem earned" : `${score} points`}
                </p>
                <p className="measure text-[14px] text-ink-muted">
                  {won
                    ? "Nicely done — that one is yours."
                    : `${TARGET} takes the gem. Coal costs you fifteen, so letting it fall is a move.`}
                </p>
              </>
            )}
            <GameButton onClick={start}>{phase === "ready" ? "Start" : "Play again"}</GameButton>
          </div>
        ) : null}
      </div>

      <p aria-live="polite" className="sr-only">
        {phase === "over" ? `Round over. ${score} points.` : ""}
      </p>
    </Overlay>
  );
}

function Diamond() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7">
      <path
        d="M6 4h12l4 6-10 12L2 10Z"
        fill="var(--color-facet)"
        stroke="var(--color-ink)"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M6 4l2 6 4 12 4-12 2-6M2 10h20" fill="none" stroke="var(--color-ink)" strokeWidth="0.8" opacity="0.5" />
    </svg>
  );
}

function Coal() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6">
      <path
        d="M5 9l4-4 7 1 3 5-2 6-7 2-5-4Z"
        fill="var(--color-ink)"
        stroke="var(--color-ink)"
        strokeWidth="1.2"
        strokeLinejoin="round"
        opacity="0.85"
      />
    </svg>
  );
}

function Ring() {
  return (
    <svg viewBox="0 0 48 32" className="h-8 w-12">
      <ellipse cx="24" cy="20" rx="13" ry="10" fill="none" stroke="var(--color-metal)" strokeWidth="3" />
      <path d="M18 9h12l-6 7Z" fill="var(--color-facet)" stroke="var(--color-ink)" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}
