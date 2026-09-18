"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFastMouseMove } from "../triggers/use-fast-mouse-move";

/**
 * Sparks off the cursor while it is moving quickly across the hero.
 *
 * The only game here that is not a game: no overlay, no gem, no score. It is
 * decoration, and decoration has exactly one obligation — to stay out of the
 * way. The layer is `pointer-events: none` from root to leaf, so nothing under
 * it ever loses a click, and the whole component is never mounted at all when
 * the visitor has asked for reduced motion.
 */

const LIFE_MS = 420;
/** One spark every other frame or so; a spark per mousemove is a smear. */
const SPACING_MS = 45;

type Spark = { id: number; x: number; y: number; size: number; drift: number };

export function SparkleTrail({ reducedMotion }: { reducedMotion: boolean }) {
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [mounted, setMounted] = useState(false);
  const lastAt = useRef(0);
  const nextId = useRef(0);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    // Every spark schedules its own removal; on unmount, drop the lot at once.
    return () => setSparks([]);
  }, []);

  useFastMouseMove(
    '[data-easter-egg="hero"]',
    (x, y) => {
      const now = performance.now();
      if (now - lastAt.current < SPACING_MS) return;
      lastAt.current = now;

      const spark: Spark = {
        id: nextId.current++,
        x,
        y,
        size: 4 + Math.random() * 5,
        drift: (Math.random() - 0.5) * 26,
      };
      setSparks((current) => [...current.slice(-14), spark]);
      window.setTimeout(
        () => setSparks((current) => current.filter((s) => s.id !== spark.id)),
        LIFE_MS,
      );
    },
    !reducedMotion,
  );

  if (!mounted || reducedMotion) return null;

  return createPortal(
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[60]">
      {sparks.map((spark) => (
        <span
          key={spark.id}
          className="pointer-events-none absolute"
          style={{
            left: spark.x,
            top: spark.y,
            width: spark.size,
            height: spark.size,
            marginLeft: -spark.size / 2,
            marginTop: -spark.size / 2,
            background: "var(--color-facet)",
            boxShadow: "0 0 6px 1px rgba(201,162,39,0.55)",
            borderRadius: "1px",
            animation: `isg-spark ${LIFE_MS}ms cubic-bezier(0.22,0.61,0.36,1) forwards`,
            // Each spark drifts its own way, so a fast sweep reads as a spray.
            ["--isg-drift" as string]: `${spark.drift}px`,
          }}
        />
      ))}
      <style>{`
        @keyframes isg-spark {
          from { opacity: 1; transform: rotate(45deg) scale(1) translate(0, 0); }
          to   { opacity: 0; transform: rotate(160deg) scale(0.2) translate(var(--isg-drift), 14px); }
        }
      `}</style>
    </div>,
    document.body,
  );
}
