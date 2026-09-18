"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { bumpCounter, getState, hasGem } from "../gem-store";
import { sparkleBurst } from "../shared/sparkle";

/**
 * A glint that shows up somewhere on the page, once, and goes again.
 *
 * Three of them makes the gem, and the tally is kept in the store rather than
 * in this component — the point is to find them across a visit, not to find
 * three on one page.
 *
 * Placing it is the fiddly part. A random point inside a container is easy; a
 * random point that doesn't sit on a link, a button or a line of text takes a
 * few tries and a hit test, which is what `placeIn` does. If it can't find a
 * clear spot in a handful of attempts it gives up and shows nothing, because a
 * glint covering the primary call to action is a bug and not an easter egg.
 */

const TOTAL = 3;
const VISIBLE_MS = 6000;
const SIZE = 22;

/** Where a glint may appear, in order of preference. */
const CONTAINERS = ["footer", '[data-easter-egg="product"]', "header"];

type Spot = { x: number; y: number };

function placeIn(container: Element): Spot | null {
  const box = container.getBoundingClientRect();
  if (box.width < SIZE * 3 || box.height < SIZE * 3) return null;

  for (let attempt = 0; attempt < 12; attempt++) {
    // Kept off the very edge, so it never half-hangs outside its container.
    const x = box.left + SIZE + Math.random() * (box.width - SIZE * 2);
    const y = box.top + SIZE + Math.random() * (box.height - SIZE * 2);
    if (y < 0 || y > window.innerHeight) continue;

    const under = document.elementFromPoint(x, y);
    if (!under) continue;
    // Never over something that can be clicked, and never over type.
    if (under.closest("a, button, input, select, textarea, label, [role='button']")) continue;
    if (under.textContent && under.childElementCount === 0 && under.textContent.trim()) continue;

    return { x: x + window.scrollX, y: y + window.scrollY };
  }
  return null;
}

export function TreasureHunt({
  onWin,
  reducedMotion,
  paused,
}: {
  onWin: () => void;
  reducedMotion: boolean;
  paused: boolean;
}) {
  const [spot, setSpot] = useState<Spot | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const hideTimer = useRef<number | undefined>(undefined);

  useEffect(() => setMounted(true), []);

  const found = getState().counters["treasure-hunt"] ?? 0;
  const complete = hasGem("treasure-hunt") || found >= TOTAL;

  /** One glint per page view, somewhere between three and eight seconds in. */
  useEffect(() => {
    if (complete || paused || !mounted) return;

    const appear = window.setTimeout(
      () => {
        for (const selector of CONTAINERS) {
          const candidates = Array.from(document.querySelectorAll(selector));
          if (!candidates.length) continue;
          const container = candidates[Math.floor(Math.random() * candidates.length)];
          const placed = placeIn(container);
          if (!placed) continue;
          setSpot(placed);
          hideTimer.current = window.setTimeout(() => setSpot(null), VISIBLE_MS);
          return;
        }
      },
      3000 + Math.random() * 5000,
    );

    return () => {
      window.clearTimeout(appear);
      window.clearTimeout(hideTimer.current);
    };
  }, [complete, mounted, paused]);

  const take = useCallback(
    (e: React.MouseEvent) => {
      window.clearTimeout(hideTimer.current);
      setSpot(null);
      sparkleBurst({ x: e.clientX, y: e.clientY, reducedMotion, count: 14, spread: 60 });

      const now = bumpCounter("treasure-hunt");
      if (now >= TOTAL) {
        setToast("Found them all");
        onWin();
      } else {
        setToast(`Found — ${now} of ${TOTAL}`);
      }
      window.setTimeout(() => setToast(null), 2600);
    },
    [onWin, reducedMotion],
  );

  if (!mounted) return null;

  return createPortal(
    <>
      {spot ? (
        <button
          type="button"
          onClick={take}
          aria-label="A glint. Click to collect it."
          className="absolute z-[55] rounded-full opacity-45 transition-opacity duration-200 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          style={{ left: spot.x, top: spot.y, width: SIZE, height: SIZE, marginLeft: -SIZE / 2, marginTop: -SIZE / 2 }}
        >
          <svg viewBox="0 0 24 24" aria-hidden className="h-full w-full">
            <path
              d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2Z"
              fill="var(--color-facet)"
              stroke="#c9a227"
              strokeWidth="1.1"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ) : null}

      {toast ? (
        <div
          role="status"
          className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-[85] -translate-x-1/2 rounded-full border border-hairline bg-porcelain px-5 py-2.5 text-[14px] shadow-[0_10px_30px_-12px_rgba(23,24,27,0.45)]"
        >
          {toast}
        </div>
      ) : null}
    </>,
    document.body,
  );
}
