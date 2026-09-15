import { SHAPES, type Shape, type ShapeSlug } from "./shapes";
import { REAL_LAB_STONES } from "./real-stones";

export type Origin = "natural" | "lab";

export type Stone = {
  /** ISG-[SHAPE]-[N|L]-[NUMBER] */
  sku: string;
  shape: ShapeSlug;
  shapeName: string;
  shapeCode: string;
  origin: Origin;
  carat: number;
  /** A D–J grade, or a fancy-colour description ("Fancy Vivid Blue") — no fixed scale covers both. */
  color: ColorGrade | FancyColor;
  clarity: ClarityGrade;
  /** Round brilliants only — IGI/GIA don't issue an overall cut grade for fancy shapes. */
  cut?: CutGrade;
  polish: CutGrade;
  symmetry: CutGrade;
  fluorescence: Fluorescence;
  lab: Lab;
  /** "6.48 x 6.51 x 4.01 mm" */
  measurements: string;
  tablePercent: number;
  depthPercent: number;
  featured: boolean;
};

export const COLOR_GRADES = ["D", "E", "F", "G", "H", "I", "J"] as const;
export const CLARITY_GRADES = ["FL", "IF", "VVS1", "VVS2", "VS1", "VS2", "SI1", "SI2"] as const;
/** "Ideal" is a round-brilliant-only grade, real stock only — the generator below never assigns it. */
export const CUT_GRADES = ["Excellent", "Very Good", "Good", "Ideal"] as const;
export const LABS = ["GIA", "IGI"] as const;
/** "Very Slight" and "Slight" are real-stock-only — the generator below never assigns them. */
export const FLUORESCENCE = ["None", "Faint", "Very Slight", "Slight", "Medium"] as const;

export type ColorGrade = (typeof COLOR_GRADES)[number];
export type ClarityGrade = (typeof CLARITY_GRADES)[number];
export type CutGrade = (typeof CUT_GRADES)[number];
export type Lab = (typeof LABS)[number];
export type Fluorescence = (typeof FLUORESCENCE)[number];
/** Free-form, like `shapeName` — fancy-colour wording ("Fancy Intense Yellowish Brown")
 *  isn't a closed scale the way D–J or a clarity grade is. */
export type FancyColor = string;

export function isColorGrade(color: ColorGrade | FancyColor): color is ColorGrade {
  return (COLOR_GRADES as readonly string[]).includes(color);
}

/**
 * Shown once at the top of each catalogue. The stones below are a representative
 * sample, not live stock — delete this constant and its two usages on the day a
 * real inventory feed is connected.
 */
export const INVENTORY_NOTICE =
  "A representative selection. Current availability is confirmed on enquiry.";

/** Deterministic PRNG, so SKUs and grades are stable across builds and renders. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Picks from `items` with integer weights — lower grades stay uncommon. */
function weighted<T>(rand: () => number, items: readonly T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rand() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
}

function midRatio(shape: Shape): number {
  const [lo, hi] = shape.ratio.split("–").map((s) => Number.parseFloat(s.trim()));
  return (lo + hi) / 2;
}

function measurementsFor(shape: Shape, carat: number, rand: () => number): string {
  // A one-carat round sits at roughly 6.5 mm; diameter scales with the cube root
  // of weight. Fancy shapes are spread about that figure by their ratio.
  const base = 6.5 * Math.cbrt(carat);
  const ratio = midRatio(shape) * (0.97 + rand() * 0.06);
  const width = base / Math.sqrt(ratio);
  const length = base * Math.sqrt(ratio);
  const depth = base * (0.6 + rand() * 0.05);
  const mm = (n: number) => n.toFixed(2);
  return `${mm(length)} x ${mm(width)} x ${mm(depth)} mm`;
}

function buildStone(shape: Shape, origin: Origin, seed: number): Stone {
  const rand = mulberry32(seed);

  // Weight bands: most stock sits between half a carat and two carats.
  const band = rand();
  const carat =
    band < 0.42
      ? 0.3 + rand() * 0.7
      : band < 0.8
        ? 1.0 + rand() * 1.0
        : band < 0.95
          ? 2.0 + rand() * 1.5
          : 3.5 + rand() * 1.6;

  // Grown stones cluster at the top of the colour and clarity scales.
  const color = weighted(
    rand,
    COLOR_GRADES,
    origin === "lab" ? [16, 15, 13, 9, 5, 2, 1] : [8, 10, 12, 12, 9, 6, 4],
  );
  const clarity = weighted(
    rand,
    CLARITY_GRADES,
    origin === "lab" ? [4, 8, 13, 13, 12, 10, 5, 2] : [1, 4, 8, 10, 13, 13, 9, 5],
  );
  const cut = weighted(rand, CUT_GRADES, [14, 7, 2, 0]);
  const polish = weighted(rand, CUT_GRADES, [16, 6, 1, 0]);
  const symmetry = weighted(rand, CUT_GRADES, [15, 7, 1, 0]);
  const fluorescence = weighted(
    rand,
    FLUORESCENCE,
    origin === "lab" ? [18, 3, 0, 0, 1] : [12, 5, 0, 0, 3],
  );
  // Grown goods are graded by IGI more often than by GIA; natural skews the
  // other way.
  const lab = weighted(rand, LABS, origin === "lab" ? [4, 10] : [11, 5]);

  const serial = 10000 + Math.floor(rand() * 89999);
  const sku = `ISG-${shape.code}-${origin === "natural" ? "N" : "L"}-${serial}`;

  return {
    sku,
    shape: shape.slug,
    shapeName: shape.name,
    shapeCode: shape.code,
    origin,
    carat: Math.round(carat * 100) / 100,
    color,
    clarity,
    cut,
    polish,
    symmetry,
    fluorescence,
    lab,
    measurements: measurementsFor(shape, carat, rand),
    tablePercent: Math.round(54 + rand() * 8),
    depthPercent: Math.round((59 + rand() * 6) * 10) / 10,
    featured: false,
  };
}

function buildCatalog(origin: Origin, count: number, seedBase: number): Stone[] {
  const stones: Stone[] = [];
  const seen = new Set<string>();
  let attempt = 0;

  while (stones.length < count) {
    // Rotate through the shapes so every shape has stock in both catalogues.
    const shape = SHAPES[stones.length % SHAPES.length];
    const stone = buildStone(shape, origin, seedBase + attempt * 7919);
    attempt++;
    if (seen.has(stone.sku)) continue;
    seen.add(stone.sku);
    stones.push(stone);
  }
  return stones;
}

export const NATURAL_STONES: Stone[] = buildCatalog("natural", 66, 20260913);

/**
 * Any shape with real stock (`real-stones.ts`) drops its generated entries
 * from the lab catalogue, so the two don't sit side by side. Shapes with no
 * real stock yet (princess, at last count) stay fully generated.
 */
const REAL_LAB_SHAPES = new Set(REAL_LAB_STONES.map((s) => s.shape));

export const LAB_STONES: Stone[] = [
  ...buildCatalog("lab", 55, 77010203).filter((s) => !REAL_LAB_SHAPES.has(s.shape)),
  ...REAL_LAB_STONES,
];

export const ALL_STONES: Stone[] = [...NATURAL_STONES, ...LAB_STONES];

/** Six stones for the home page — one per shape, spread across both origins. */
export const FEATURED_STONES: Stone[] = (() => {
  const wanted: Array<[ShapeSlug, Origin]> = [
    ["radiant", "natural"],
    ["oval", "natural"],
    ["emerald", "lab"],
    ["round", "natural"],
    ["pear", "lab"],
    ["asscher", "natural"],
  ];
  return wanted
    .map(([shape, origin]) => {
      const pool = origin === "natural" ? NATURAL_STONES : LAB_STONES;
      const pick =
        pool.find(
          (s) => s.shape === shape && s.carat >= 1 && isColorGrade(s.color) && s.color <= "G",
        ) ?? pool.find((s) => s.shape === shape);
      return pick ? { ...pick, featured: true } : undefined;
    })
    .filter((s): s is Stone => Boolean(s));
})();

export function stonesFor(origin: Origin): Stone[] {
  return origin === "natural" ? NATURAL_STONES : LAB_STONES;
}

export function findStone(sku: string): Stone | undefined {
  return ALL_STONES.find((s) => s.sku === sku);
}

export function countByShape(stones: Stone[]): Record<string, number> {
  return stones.reduce<Record<string, number>>((acc, s) => {
    acc[s.shape] = (acc[s.shape] ?? 0) + 1;
    return acc;
  }, {});
}

/**
 * Sortable intake key from a supplier SKU — "TP-070926-3399" is 7 Sep 2026, serial 3399.
 * Generated stock carries no date and returns 0, so it sorts after dated stock.
 */
export function addedKey(stone: Stone): number {
  const short = /^TP-(\d{2})(\d{2})(\d{2})-+(\d+)/.exec(stone.sku);
  if (short) {
    const [, dd, mm, yy, serial] = short;
    return Number(`20${yy}${mm}${dd}`) * 1e5 + Number(serial);
  }
  const long = /^TP-(\d{2})(\d{2})(\d{4})-+(\d+)/.exec(stone.sku);
  if (long) {
    const [, dd, mm, yyyy, serial] = long;
    return Number(`${yyyy}${mm}${dd}`) * 1e5 + Number(serial);
  }
  return 0;
}

/** Carat bounds of a set, rounded outwards to clean slider stops. */
export function caratBounds(stones: Stone[]): [number, number] {
  const values = stones.map((s) => s.carat);
  return [Math.floor(Math.min(...values) * 10) / 10, Math.ceil(Math.max(...values) * 10) / 10];
}
