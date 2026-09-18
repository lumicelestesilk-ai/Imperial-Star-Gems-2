"use client";

import { MemoryBoard, type MemoryTheme } from "./gem-memory";
import type { GameProps } from "../shared/context";
import { LUNAR_PALETTE } from "../shared/styles";

/**
 * Gem Memory in red and gold, for the Lunar New Year pages.
 *
 * It is the same board with a different theme — no matching logic lives here,
 * only six lanterns and a palette. The gem is its own, though: finding the game
 * on a new-year page is a separate discovery from finding it on any other.
 */

/** Six lanterns, told apart by silhouette rather than by colour alone. */
const LANTERNS: { id: string; label: string; body: string; trim: string }[] = [
  {
    id: "round",
    label: "Round lantern",
    body: "M50 22c16 0 26 10 26 24s-10 24-26 24-26-10-26-24 10-24 26-24Z",
    trim: "M36 34h28M36 60h28",
  },
  {
    id: "barrel",
    label: "Barrel lantern",
    body: "M32 24h36v46H32Z",
    trim: "M32 38h36M32 56h36",
  },
  {
    id: "tapered",
    label: "Tapered lantern",
    body: "M38 24h24l8 46H30Z",
    trim: "M34 46h32",
  },
  {
    id: "hex",
    label: "Six-sided lantern",
    body: "M50 20l22 12v30L50 74 28 62V32Z",
    trim: "M28 32l22 12 22-12M50 44v30",
  },
  {
    id: "long",
    label: "Long lantern",
    body: "M40 20h20v54H40Z",
    trim: "M40 34h20M40 48h20M40 62h20",
  },
  {
    id: "double",
    label: "Paired lanterns",
    body: "M30 26h16v30H30ZM54 38h16v30H54Z",
    trim: "M30 40h16M54 52h16",
  },
];

const LANTERN_THEME: MemoryTheme = {
  gemId: "lantern-match",
  title: "Lantern Match",
  intro: "Six pairs of lanterns, face down. Find them in as few moves as you can.",
  palette: LUNAR_PALETTE,
  faces: LANTERNS.map((lantern) => ({
    id: lantern.id,
    label: lantern.label,
    art: (
      <svg viewBox="0 0 100 100" aria-hidden className="h-3/5 w-3/5" strokeLinejoin="round">
        {/* The cord and tassel, so every silhouette reads as a hanging lamp. */}
        <path d="M50 8v12M50 74v14" stroke={LUNAR_PALETTE.line} strokeWidth="3" strokeLinecap="round" />
        <path d={lantern.body} fill={LUNAR_PALETTE.glint} stroke={LUNAR_PALETTE.line} strokeWidth="3.4" />
        <path d={lantern.trim} fill="none" stroke={LUNAR_PALETTE.line} strokeWidth="2" opacity="0.65" />
      </svg>
    ),
  })),
};

export function LanternMatch(props: GameProps) {
  return <MemoryBoard theme={LANTERN_THEME} {...props} />;
}
