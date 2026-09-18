"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { recordScore } from "../gem-store";
import type { GameProps } from "../shared/context";
import { GameButton, Overlay } from "../shared/overlay";
import { DEFAULT_PALETTE, type GamePalette } from "../shared/styles";
import { GLYPHS } from "@/lib/glyphs";
import { SHAPES } from "@/lib/shapes";

/**
 * Six pairs, face down.
 *
 * The board is the engine, and it is themed rather than copied: the Lunar New
 * Year pages hand it lanterns and a red palette and get a different game out of
 * the same fifty lines. Anything that had to be duplicated to reskin it would
 * be a bug in this file, not a feature of that one.
 */

export type MemoryTheme = {
  /** Six faces. Each appears twice. */
  faces: { id: string; label: string; art: ReactNode }[];
  palette: GamePalette;
  title: string;
  /** Which gem a finished board awards. */
  gemId: string;
  intro: string;
};

type Card = { key: number; faceId: string };

/** Fisher–Yates, seeded by nothing in particular — a new board every time. */
function shuffled(faces: MemoryTheme["faces"]): Card[] {
  const cards = faces.flatMap((face, i) => [
    { key: i * 2, faceId: face.id },
    { key: i * 2 + 1, faceId: face.id },
  ]);
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

export function MemoryBoard({ theme, onClose, onWin }: { theme: MemoryTheme } & GameProps) {
  const [cards, setCards] = useState<Card[]>(() => shuffled(theme.faces));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const timer = useRef<number | undefined>(undefined);

  const faceById = useMemo(
    () => Object.fromEntries(theme.faces.map((f) => [f.id, f])),
    [theme.faces],
  );
  const done = matched.length === theme.faces.length;

  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    if (!done) return;
    recordScore(theme.gemId, moves);
    onWin();
    // Firing once, on the transition into a finished board.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const flip = (card: Card) => {
    if (flipped.length === 2 || flipped.includes(card.key) || matched.includes(card.faceId)) return;

    const next = [...flipped, card.key];
    setFlipped(next);
    if (next.length < 2) return;

    setMoves((m) => m + 1);
    const [a, b] = next.map((key) => cards.find((c) => c.key === key));
    if (a && b && a.faceId === b.faceId) {
      setMatched((m) => [...m, a.faceId]);
      setFlipped([]);
      return;
    }
    // Long enough to read the second card, short enough not to wait on it.
    timer.current = window.setTimeout(() => setFlipped([]), 820);
  };

  const restart = () => {
    window.clearTimeout(timer.current);
    setCards(shuffled(theme.faces));
    setFlipped([]);
    setMatched([]);
    setMoves(0);
  };

  return (
    <Overlay
      title={theme.title}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-4">
          <p className="text-[13px] tabular-nums text-ink-muted">
            {moves} {moves === 1 ? "move" : "moves"}
          </p>
          <GameButton variant="outline" onClick={restart}>
            New board
          </GameButton>
        </div>
      }
    >
      <p className="text-[14px] text-ink-muted">{done ? "Every pair found." : theme.intro}</p>

      <ul className="mt-4 grid grid-cols-4 gap-2.5 sm:gap-3">
        {cards.map((card) => {
          const face = faceById[card.faceId];
          const up = flipped.includes(card.key) || matched.includes(card.faceId);
          return (
            <li key={card.key}>
              <button
                type="button"
                onClick={() => flip(card)}
                aria-label={up ? face.label : "Face-down card"}
                aria-pressed={up}
                disabled={up}
                className="flex aspect-[3/4] w-full items-center justify-center rounded-[14px] border transition-colors duration-200 disabled:cursor-default focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                style={{
                  borderColor: up ? theme.palette.line : "var(--color-hairline)",
                  background: up ? theme.palette.fill : "var(--color-panel)",
                  opacity: matched.includes(card.faceId) ? 0.55 : 1,
                }}
              >
                {up ? (
                  face.art
                ) : (
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-full"
                    style={{ background: "var(--color-metal)" }}
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <p aria-live="polite" className="sr-only">
        {done ? `Board complete in ${moves} moves.` : ""}
      </p>
    </Overlay>
  );
}

/* ------------------------------------------------------------ default theme */

/** Six of the site's own cut shapes, drawn from the same geometry the cards use. */
const SHAPE_FACES = ["round", "pear", "emerald", "marquise", "heart", "oval"] as const;

const GEM_THEME: MemoryTheme = {
  gemId: "gem-memory",
  title: "Gem Memory",
  intro: "Six pairs of cuts, face down. Find them in as few moves as you can.",
  palette: DEFAULT_PALETTE,
  faces: SHAPE_FACES.map((slug) => {
    const shape = SHAPES.find((s) => s.slug === slug);
    return {
      id: slug,
      label: shape?.name ?? slug,
      art: (
        <svg viewBox="0 0 100 100" aria-hidden className="h-3/5 w-3/5" strokeLinejoin="round">
          <path d={GLYPHS[slug].outline} fill="none" stroke="var(--color-ink)" strokeWidth="3" />
          {GLYPHS[slug].facets.slice(0, 3).map((d) => (
            <path key={d} d={d} fill="none" stroke="var(--color-ink)" strokeWidth="1.6" opacity="0.5" />
          ))}
        </svg>
      ),
    };
  }),
};

export function GemMemory(props: GameProps) {
  return <MemoryBoard theme={GEM_THEME} {...props} />;
}
