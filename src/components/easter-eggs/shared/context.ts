"use client";

import { createContext, useContext } from "react";

/**
 * The handle the provider passes down.
 *
 * It lives in its own module so the tray can read the context without importing
 * the provider that renders it — the provider already imports the tray, and a
 * cycle between the two is the kind of thing that works until a bundler decides
 * otherwise.
 */

export type EasterEggApi = {
  /** True when the visitor asked the OS for less movement. Games must honour it. */
  reducedMotion: boolean;
  /** Opens a game directly, as the tray's replay buttons and the console do. */
  open: (id: string) => void;
};

export const EasterEggContext = createContext<EasterEggApi>({
  reducedMotion: false,
  open: () => {},
});

export function useEasterEggs() {
  return useContext(EasterEggContext);
}

/**
 * What every game is handed.
 *
 * One shape for all of them, so the provider can render whichever is active
 * without a switch. The last two are only meaningful to the Carat Guesser;
 * every other game ignores them.
 */
export type GameProps = {
  onClose: () => void;
  /** Awards this game's gem. Calling it twice is harmless. */
  onWin: () => void;
  reducedMotion: boolean;
  carat?: number;
  piece?: string;
};
