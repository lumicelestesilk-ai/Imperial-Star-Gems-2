/**
 * Tokens the games draw with.
 *
 * They point at the site's own custom properties rather than restating hex
 * values, so a seasonal theme — which swaps the grounds and the glint on
 * <html data-season> — carries into the hidden games for free, and nothing here
 * can drift out of step with globals.css.
 *
 * Tailwind classes do the static styling in these files, as everywhere else in
 * the codebase. These are for the values that have to be computed: a particle's
 * position, a wheel's rotation, a falling gem's colour.
 */

export const INK = "var(--color-ink)";
export const INK_MUTED = "var(--color-ink-muted)";
export const HAIRLINE = "var(--color-hairline)";
export const METAL = "var(--color-metal)";
export const FACET = "var(--color-facet)";
export const PANEL = "var(--color-panel)";
export const PORCELAIN = "var(--color-porcelain)";

/** A palette a themed game can be handed in place of the default one. */
export type GamePalette = {
  /** Fills the drawn gem or token. */
  fill: string;
  /** Its outline and facet lines. */
  line: string;
  /** The celebratory accent — sparkles, wins, the lit state. */
  glint: string;
};

export const DEFAULT_PALETTE: GamePalette = {
  fill: FACET,
  line: INK,
  glint: "#c9a227",
};

/** Red and gold, for the Lunar New Year pages. */
export const LUNAR_PALETTE: GamePalette = {
  fill: "#f6e3c8",
  line: "#8c1c13",
  glint: "#c9a227",
};

/** Lamp-lit amber, for Diwali. */
export const DIWALI_PALETTE: GamePalette = {
  fill: "#fbe6c2",
  line: "#7a3b12",
  glint: "#e8a33d",
};
