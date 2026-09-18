"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { recordScore } from "../gem-store";
import { GLYPHS } from "@/lib/glyphs";
import type { GameProps } from "../shared/context";
import { GameButton, Overlay } from "../shared/overlay";

/**
 * Fifteen seconds under the loupe, three inclusions to find.
 *
 * The stone is an original drawing — the site's own round-brilliant plotting
 * diagram, blown up — and never a photograph of stock. Putting flaws on a
 * picture of something we sell would imply the thing we sell has them, which is
 * both untrue and exactly the sort of joke that isn't worth making.
 *
 * What it does mirror honestly is how a grader works: inclusions are plotted on
 * a diagram, not on a photo, and finding them is a matter of sweeping the stone
 * rather than spotting them all at once.
 */

const ROUND_MS = 15_000;
const FLAWS = 3;
/** Click tolerance, as a share of the 100-unit drawing. */
const NEAR = 7;

type Flaw = { id: number; x: number; y: number; kind: "pinpoint" | "feather" | "crystal" };

/** Random points inside the girdle, never crowded onto one another. */
function scatter(): Flaw[] {
  const kinds: Flaw["kind"][] = ["pinpoint", "feather", "crystal"];
  const placed: Flaw[] = [];
  let guard = 0;

  while (placed.length < FLAWS && guard++ < 200) {
    const angle = Math.random() * Math.PI * 2;
    // Kept off the girdle line itself, where the outline would hide them.
    const radius = 8 + Math.random() * 25;
    const x = 50 + Math.cos(angle) * radius;
    const y = 50 + Math.sin(angle) * radius;
    if (placed.some((f) => Math.hypot(f.x - x, f.y - y) < 18)) continue;
    placed.push({ id: placed.length, x, y, kind: kinds[placed.length] });
  }
  return placed;
}

export function SpotTheFlaw({ onClose, onWin }: GameProps) {
  const [phase, setPhase] = useState<"ready" | "playing" | "over">("ready");
  const [flaws, setFlaws] = useState<Flaw[]>([]);
  const [found, setFound] = useState<number[]>([]);
  const [left, setLeft] = useState(ROUND_MS);
  const [missPoint, setMissPoint] = useState<{ x: number; y: number } | null>(null);
  const startedAt = useRef(0);
  const foundRef = useRef<number[]>([]);

  const start = () => {
    setFlaws(scatter());
    setFound([]);
    foundRef.current = [];
    setMissPoint(null);
    setLeft(ROUND_MS);
    startedAt.current = performance.now();
    setPhase("playing");
  };

  const stop = useCallback(
    (win: boolean) => {
      setPhase("over");
      if (!win) return;
      const seconds = Math.max(1, Math.round((performance.now() - startedAt.current) / 1000));
      recordScore("spot-the-flaw", seconds);
      onWin();
    },
    [onWin],
  );

  useEffect(() => {
    if (phase !== "playing") return;
    const id = window.setInterval(() => {
      const remaining = ROUND_MS - (performance.now() - startedAt.current);
      if (remaining <= 0) {
        setLeft(0);
        stop(false);
        return;
      }
      setLeft(remaining);
    }, 100);
    return () => window.clearInterval(id);
  }, [phase, stop]);

  const inspect = (e: React.MouseEvent<SVGSVGElement>) => {
    if (phase !== "playing") return;
    const box = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * 100;
    const y = ((e.clientY - box.top) / box.height) * 100;

    const hit = flaws.find((f) => !foundRef.current.includes(f.id) && Math.hypot(f.x - x, f.y - y) < NEAR);
    if (!hit) {
      setMissPoint({ x, y });
      window.setTimeout(() => setMissPoint(null), 420);
      return;
    }

    foundRef.current = [...foundRef.current, hit.id];
    setFound(foundRef.current);
    if (foundRef.current.length === FLAWS) stop(true);
  };

  const won = found.length === FLAWS;

  return (
    <Overlay
      title="Spot the Flaw"
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-4">
          <p className="text-[13px] tabular-nums text-ink-muted">
            {phase === "playing"
              ? `${found.length} of ${FLAWS} · ${(left / 1000).toFixed(1)}s`
              : `${FLAWS} inclusions, 15 seconds`}
          </p>
          {phase !== "playing" ? (
            <GameButton onClick={start}>{phase === "ready" ? "Start" : "Again"}</GameButton>
          ) : null}
        </div>
      }
    >
      <p className="measure text-[14px] text-ink-muted">
        A plotting diagram, not a photograph — three inclusions are marked on it somewhere. Find
        them before the time is up.
      </p>

      <div className="relative mt-4 overflow-hidden rounded-[18px] bg-panel p-3">
        <svg
          viewBox="0 0 100 100"
          onClick={inspect}
          role="img"
          aria-label="A round brilliant plotting diagram. Click to inspect it for inclusions."
          className={`mx-auto block aspect-square w-full max-w-[340px] ${
            phase === "playing" ? "cursor-crosshair" : ""
          }`}
        >
          <path d={GLYPHS.round.outline} fill="var(--color-porcelain)" stroke="var(--color-ink)" strokeWidth="0.9" />
          {GLYPHS.round.facets.map((d) => (
            <path key={d} d={d} fill="none" stroke="var(--color-metal)" strokeWidth="0.55" />
          ))}

          {phase !== "ready"
            ? flaws.map((flaw) => {
                const seen = found.includes(flaw.id);
                const show = seen || phase === "over";
                if (!show) return <Inclusion key={flaw.id} flaw={flaw} faint />;
                return (
                  <g key={flaw.id}>
                    <circle
                      cx={flaw.x}
                      cy={flaw.y}
                      r={NEAR}
                      fill="none"
                      stroke={seen ? "var(--color-ink)" : "#8c1c13"}
                      strokeWidth="0.8"
                      strokeDasharray="2 2"
                    />
                    <Inclusion flaw={flaw} />
                  </g>
                );
              })
            : null}

          {missPoint ? (
            <circle
              cx={missPoint.x}
              cy={missPoint.y}
              r="3"
              fill="none"
              stroke="var(--color-ink-muted)"
              strokeWidth="0.7"
              opacity="0.7"
            />
          ) : null}
        </svg>

        {phase !== "playing" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-porcelain/85 px-6 text-center backdrop-blur-[1px]">
            <p className="font-display text-[22px]">
              {phase === "ready" ? "Under the loupe" : won ? "All three" : "Time"}
            </p>
            <p className="measure text-[14px] text-ink-muted">
              {phase === "ready"
                ? "Three inclusions, fifteen seconds, one drawn stone."
                : won
                  ? "Found the lot. A grader does this all day, at ten times magnification."
                  : "The ones you missed are circled. Inclusions are graded on size, position and contrast — not on how many there are."}
            </p>
            <GameButton onClick={start}>{phase === "ready" ? "Start" : "Again"}</GameButton>
          </div>
        ) : null}
      </div>

      <p aria-live="polite" className="sr-only">
        {phase === "playing" ? `${found.length} of ${FLAWS} found.` : ""}
      </p>
    </Overlay>
  );
}

/** The three inclusion types a plot actually distinguishes. */
function Inclusion({ flaw, faint = false }: { flaw: Flaw; faint?: boolean }) {
  const stroke = faint ? "transparent" : "#8c1c13";
  const fill = faint ? "transparent" : "#8c1c13";

  if (flaw.kind === "feather") {
    return (
      <path
        d={`M${flaw.x - 3} ${flaw.y + 1.6}q3 -3.4 6 -0.6`}
        fill="none"
        stroke={stroke}
        strokeWidth="0.9"
        strokeLinecap="round"
      />
    );
  }
  if (flaw.kind === "crystal") {
    return (
      <path
        d={`M${flaw.x} ${flaw.y - 2.4}l2.1 2.4-2.1 2.4-2.1-2.4Z`}
        fill="none"
        stroke={stroke}
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
    );
  }
  return <circle cx={flaw.x} cy={flaw.y} r="1.1" fill={fill} />;
}
