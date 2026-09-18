"use client";

import { useEffect, useMemo, useState } from "react";
import { recordScore } from "../gem-store";
import type { GameProps } from "../shared/context";
import { GameButton, Overlay } from "../shared/overlay";

/**
 * Bring a rough stone into a brilliant by turning its crowns straight.
 *
 * The scoped-down version the brief allows: six wedges around a table, each
 * scrambled to some multiple of 30°, each clicking round by 30°. Aligned means
 * every wedge back at zero, where its facet lines meet its neighbours' across
 * the seams.
 *
 * A full facet-geometry simulation was the alternative and it would have been
 * the wrong game — a real cut is decided by angles of a fraction of a degree,
 * which is a spreadsheet rather than a puzzle. Twelve positions per wedge is
 * enough to take a few moments and little enough to stay a pleasure.
 *
 * Every wedge is also a button with a label and a visible focus ring, so the
 * whole thing is solvable by tab and space alone.
 */

const WEDGES = 6;
const STEP = 30;
const POSITIONS = 360 / STEP;

/** A wedge of the crown: the pie slice, plus the facet lines that must line up. */
function wedgePaths(index: number) {
  const from = (index * 360) / WEDGES;
  const to = ((index + 1) * 360) / WEDGES;
  const point = (deg: number, r: number) => {
    const t = ((deg - 90) * Math.PI) / 180;
    return [50 + Math.cos(t) * r, 50 + Math.sin(t) * r] as const;
  };

  const [ox, oy] = point(from, 42);
  const [px, py] = point(to, 42);
  const [ix, iy] = point(from, 17);
  const [jx, jy] = point(to, 17);
  const [mx, my] = point((from + to) / 2, 42);

  return {
    // Girdle edge to table edge — the body of the wedge.
    body: `M${ix} ${iy}L${ox} ${oy}A42 42 0 0 1 ${px} ${py}L${jx} ${jy}Z`,
    // The bezel and upper-girdle lines. Straight only when the wedge is at zero.
    facets: [`M${ix} ${iy}L${mx} ${my}`, `M${jx} ${jy}L${mx} ${my}`],
  };
}

export function GemCutPuzzle({ onClose, onWin }: GameProps) {
  const [angles, setAngles] = useState<number[]>([]);
  const [turns, setTurns] = useState(0);
  const [solved, setSolved] = useState(false);

  const geometry = useMemo(() => Array.from({ length: WEDGES }, (_, i) => wedgePaths(i)), []);

  const scramble = () => {
    // Never hand out a solved board, and never a board one turn from solved.
    let next: number[];
    do {
      next = Array.from({ length: WEDGES }, () => Math.floor(Math.random() * POSITIONS) * STEP);
    } while (next.filter((a) => a !== 0).length < 3);
    setAngles(next);
    setTurns(0);
    setSolved(false);
  };

  useEffect(scramble, []);

  useEffect(() => {
    if (solved || !angles.length || angles.some((a) => a !== 0)) return;
    setSolved(true);
    recordScore("gem-cut-puzzle", turns);
    onWin();
  }, [angles, onWin, solved, turns]);

  const rotate = (index: number, by: number) => {
    if (solved) return;
    setTurns((t) => t + 1);
    setAngles((current) => current.map((a, i) => (i === index ? (a + by + 360) % 360 : a)));
  };

  const remaining = angles.filter((a) => a !== 0).length;

  return (
    <Overlay
      title="Gem Cut"
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-4">
          <p className="text-[13px] tabular-nums text-ink-muted">
            {turns} {turns === 1 ? "turn" : "turns"}
            {solved ? "" : ` · ${remaining} out of true`}
          </p>
          <GameButton variant="outline" onClick={scramble}>
            New rough
          </GameButton>
        </div>
      }
    >
      <p className="measure text-[14px] text-ink-muted">
        {solved
          ? "Every crown true, every seam meeting. That is a cut stone."
          : "Six crowns, set at the wrong angles. Click one to turn it thirty degrees. The stone is cut when every facet line runs into its neighbour's."}
      </p>

      <div className="mt-5 rounded-[18px] bg-panel p-4">
        <svg
          viewBox="0 0 100 100"
          role="group"
          aria-label="An uncut stone with six crowns to align"
          className="mx-auto block aspect-square w-full max-w-[330px]"
        >
          {/* The girdle, and the table the crowns meet at. */}
          <circle cx="50" cy="50" r="42" fill="var(--color-porcelain)" stroke="var(--color-metal)" strokeWidth="0.8" />

          {angles.map((angle, i) => {
            const { body, facets } = geometry[i];
            const true_ = angle === 0;
            return (
              <g key={i} transform={`rotate(${angle} 50 50)`} style={{ transition: "transform 220ms cubic-bezier(0.22,0.61,0.36,1)" }}>
                <path
                  d={body}
                  fill={true_ ? "var(--color-facet)" : "var(--color-panel)"}
                  stroke="var(--color-ink)"
                  strokeWidth="0.7"
                  strokeLinejoin="round"
                  opacity={true_ ? 1 : 0.85}
                />
                {facets.map((d) => (
                  <path key={d} d={d} fill="none" stroke="var(--color-ink)" strokeWidth="0.6" opacity={true_ ? 0.75 : 0.35} />
                ))}
              </g>
            );
          })}

          <circle cx="50" cy="50" r="17" fill="var(--color-facet)" stroke="var(--color-ink)" strokeWidth="0.8" opacity={solved ? 1 : 0.5} />

          {/*
            Hit areas sit above the drawing and never rotate, so a wedge stays
            where it was clicked however far its facets have turned.
          */}
          {angles.map((angle, i) => {
            const { body } = geometry[i];
            return (
              <path
                key={`hit-${i}`}
                d={body}
                fill="transparent"
                tabIndex={solved ? -1 : 0}
                role="button"
                aria-label={`Crown ${i + 1}, ${angle === 0 ? "true" : `${angle} degrees out`}. Turn it.`}
                onClick={() => rotate(i, STEP)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    rotate(i, e.shiftKey ? -STEP : STEP);
                  }
                }}
                className="cursor-pointer outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink"
              />
            );
          })}
        </svg>
      </div>

      <p aria-live="polite" className="sr-only">
        {solved ? `Cut, in ${turns} turns.` : `${remaining} crowns still out of true.`}
      </p>
    </Overlay>
  );
}
