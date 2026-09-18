"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Progress across the hidden games, kept in localStorage so a gem found on one
 * visit is still there on the next — the same bargain the shortlist makes, and
 * the same store shape, so there is one pattern to learn rather than two.
 *
 * Everything here is deliberately inert until a trigger fires. The store is the
 * only part of the easter-egg system the initial bundle carries; every game
 * behind it is loaded on demand.
 */

const STORAGE_KEY = "isg_easter_eggs_v1";

export type Gem = {
  id: string;
  name: string;
  /** Shown on a locked gem: enough to hunt with, not enough to spoil. */
  hint: string;
  /**
   * Set when the gem only exists on some pages. The tray says so rather than
   * leaving a hunter turning over a stone that isn't there.
   */
  seasonal?: string;
  /** False for gems awarded for finding the thing rather than beating it. */
  skill: boolean;
  /** Suffix for the best score, where one is kept. No unit means no score. */
  unit?: string;
  /** Moves and seconds are better when there are fewer of them. */
  lowerIsBetter?: boolean;
};

/**
 * Thirteen gems. Sparkle Trail is deliberately not among them: it awards
 * nothing, opens nothing and is pure decoration, so counting it would make the
 * tray's total disagree with what a hunter can actually collect.
 */
export const GEMS: Gem[] = [
  {
    id: "diamond-catch",
    name: "Diamond Catch",
    hint: "Players of a certain age know the code. Up, up, down, down…",
    skill: true,
    unit: " points",
  },
  {
    id: "gem-memory",
    name: "Gem Memory",
    hint: "Impatience with the logo is rewarded. Seven times, quickly.",
    skill: true,
    unit: " moves",
    lowerIsBetter: true,
  },
  {
    id: "four-cs-quiz",
    name: "The Four Cs",
    hint: "Hold Shift and click the logo, if you think you know your grades.",
    skill: true,
    unit: " / 5",
  },
  {
    id: "spot-the-flaw",
    name: "Spot the Flaw",
    hint: "Type the name of the tool a grader never puts down.",
    skill: true,
    unit: "s",
    lowerIsBetter: true,
  },
  {
    id: "carat-guesser",
    name: "Carat Guesser",
    hint: "Rest on a photograph of a piece for three seconds and see what it asks.",
    skill: true,
  },
  {
    id: "ring-toss",
    name: "Ring Toss",
    hint: "The footer does not expect to be clicked three times in a row.",
    skill: true,
    unit: " points",
  },
  {
    id: "gem-cut-puzzle",
    name: "Gem Cut",
    hint: "Press the first letter of Cut, three times over.",
    skill: true,
    unit: " turns",
    lowerIsBetter: true,
  },
  {
    id: "treasure-hunt",
    name: "Treasure Hunt",
    hint: "Something catches the light now and then. Three of them, to be exact.",
    skill: true,
  },
  {
    id: "vault-cracker",
    name: "Vault Cracker",
    hint: "Walk away for a minute. The vault only appears when nobody is looking.",
    skill: true,
  },
  {
    id: "snow-globe",
    name: "Snow Globe",
    hint: "Shake something on a page about midwinter.",
    seasonal: "Christmas and midwinter pages",
    skill: false,
  },
  {
    id: "lantern-match",
    name: "Lantern Match",
    hint: "The logo keeps a different game for the new lunar year.",
    seasonal: "Chinese New Year pages",
    skill: true,
    unit: " moves",
    lowerIsBetter: true,
  },
  {
    id: "diya-sequence",
    name: "Diya Sequence",
    hint: "Five lamps, lit in an order worth remembering.",
    seasonal: "Diwali pages",
    skill: true,
    unit: " rounds",
  },
  {
    id: "secret-console",
    name: "Secret Console",
    hint: "One keystroke opens a prompt — ask any search box which one. On a phone, hold the logo.",
    skill: false,
  },
];

export const GEM_TOTAL = GEMS.length;

export const GEM_BY_ID: Record<string, Gem> = Object.fromEntries(GEMS.map((g) => [g.id, g]));

/**
 * The reward for a full set.
 *
 * Nothing on this site carries a price — no cart, no checkout, every stone
 * quoted on enquiry — so a discount code has nothing to discount. The flag is
 * therefore off, and the finish is simply a thing to mention to the desk. Turn
 * it on and edit the code only if the business decides to honour one.
 */
export const COMPLETION_CODE = "SPARKLE13";
export const SHOW_COMPLETION_CODE = false;

export type GemState = {
  gemsCollected: string[];
  bestScores: Record<string, number>;
  /** Progress towards gems that take more than one sitting, e.g. the hunt. */
  counters: Record<string, number>;
};

const EMPTY: GemState = { gemsCollected: [], bestScores: {}, counters: {} };

let cache: GemState | null = null;
const listeners = new Set<() => void>();

function read(): GemState {
  // Belt and braces: every consumer is client-only, but a store that throws
  // during a server render would take a page down with it.
  if (typeof window === "undefined") return EMPTY;
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    if (typeof parsed !== "object" || parsed === null) return EMPTY;
    const raw = parsed as Partial<GemState>;
    return {
      // Unknown ids are dropped: a renamed game shouldn't leave a ghost in the count.
      gemsCollected: Array.isArray(raw.gemsCollected)
        ? raw.gemsCollected.filter((id): id is string => typeof id === "string" && id in GEM_BY_ID)
        : [],
      bestScores: typeof raw.bestScores === "object" && raw.bestScores ? raw.bestScores : {},
      counters: typeof raw.counters === "object" && raw.counters ? raw.counters : {},
    };
  } catch {
    return EMPTY;
  }
}

function getSnapshot(): GemState {
  if (cache === null) cache = read();
  return cache;
}

function getServerSnapshot(): GemState {
  return EMPTY;
}

function write(next: GemState) {
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private mode or full storage: progress still holds for this page view.
  }
  listeners.forEach((notify) => notify());
}

function onStorage(e: StorageEvent) {
  if (e.key !== STORAGE_KEY && e.key !== null) return;
  cache = null;
  listeners.forEach((notify) => notify());
}

export function subscribe(notify: () => void) {
  listeners.add(notify);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(notify);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

export function getState(): GemState {
  return getSnapshot();
}

export function hasGem(id: string): boolean {
  return getSnapshot().gemsCollected.includes(id);
}

/** True only the first time, so the celebration fires once and not on a replay. */
export function awardGem(id: string): boolean {
  if (!(id in GEM_BY_ID) || hasGem(id)) return false;
  const current = getSnapshot();
  write({ ...current, gemsCollected: [...current.gemsCollected, id] });
  return true;
}

/**
 * Best score only ever improves, so a bad replay cannot erase a good round.
 * Which direction counts as better is the gem's business: points go up,
 * moves and seconds go down.
 */
export function recordScore(id: string, score: number) {
  const current = getSnapshot();
  const best = current.bestScores[id];
  if (best !== undefined) {
    const better = GEM_BY_ID[id]?.lowerIsBetter ? score < best : score > best;
    if (!better) return;
  }
  write({ ...current, bestScores: { ...current.bestScores, [id]: score } });
}

export function bumpCounter(key: string, by = 1): number {
  const current = getSnapshot();
  const next = (current.counters[key] ?? 0) + by;
  write({ ...current, counters: { ...current.counters, [key]: next } });
  return next;
}

export function resetAll() {
  write(EMPTY);
}

export function useGemState() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const has = useCallback((id: string) => state.gemsCollected.includes(id), [state]);
  return { state, has, count: state.gemsCollected.length, total: GEM_TOTAL };
}

const noop = () => () => {};

/** False during SSR and hydration, so stored progress never causes a mismatch. */
export function useHydrated() {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}
