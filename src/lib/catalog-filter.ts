import { SHAPE_BY_SLUG, SHAPES, type ShapeSlug } from "./shapes";
import {
  CLARITY_GRADES,
  COLOR_GRADES,
  CUT_GRADES,
  LABS,
  addedKey,
  isColorGrade,
  type ClarityGrade,
  type ColorGrade,
  type CutGrade,
  type Lab,
  type Stone,
} from "./stones";

/**
 * Filtering lives here, not in the catalogue component, so the downloadable
 * spec sheet lists exactly the stones the buyer was looking at on screen.
 */

export const FANCY = "Fancy";

export const SORTS = {
  recommended: "Recommended",
  recent: "Recently added",
  caratDesc: "Carat: high to low",
  caratAsc: "Carat: low to high",
} as const;

export type Sort = keyof typeof SORTS;

export type Filters = {
  shapes: ShapeSlug[];
  colors: (ColorGrade | typeof FANCY)[];
  clarities: ClarityGrade[];
  cuts: CutGrade[];
  labs: Lab[];
  caratMin: number;
  caratMax: number;
};

export function filterStones(stones: Stone[], filters: Filters, sort: Sort): Stone[] {
  const matched = stones.filter((s) => {
    if (filters.shapes.length && !filters.shapes.includes(s.shape)) return false;
    if (
      filters.colors.length &&
      !(isColorGrade(s.color) ? filters.colors.includes(s.color) : filters.colors.includes(FANCY))
    )
      return false;
    if (filters.clarities.length && !filters.clarities.includes(s.clarity)) return false;
    if (filters.cuts.length && (!s.cut || !filters.cuts.includes(s.cut))) return false;
    if (filters.labs.length && !filters.labs.includes(s.lab)) return false;
    if (s.carat < filters.caratMin || s.carat > filters.caratMax) return false;
    return true;
  });
  if (sort === "recent") return matched.sort((a, b) => addedKey(b) - addedKey(a));
  if (sort === "caratDesc") return matched.sort((a, b) => b.carat - a.carat);
  if (sort === "caratAsc") return matched.sort((a, b) => a.carat - b.carat);
  return matched;
}

/** Only non-default values are written, so an unfiltered sheet has a bare URL. */
export function filtersToParams(filters: Filters, sort: Sort, bounds: [number, number]) {
  const params = new URLSearchParams();
  if (filters.shapes.length) params.set("shape", filters.shapes.join(","));
  if (filters.colors.length) params.set("color", filters.colors.join(","));
  if (filters.clarities.length) params.set("clarity", filters.clarities.join(","));
  if (filters.cuts.length) params.set("cut", filters.cuts.join(","));
  if (filters.labs.length) params.set("lab", filters.labs.join(","));
  if (filters.caratMin !== bounds[0]) params.set("cmin", String(filters.caratMin));
  if (filters.caratMax !== bounds[1]) params.set("cmax", String(filters.caratMax));
  if (sort !== "recommended") params.set("sort", sort);
  return params;
}

function pick<T extends string>(params: URLSearchParams, key: string, allowed: readonly T[]): T[] {
  const raw = params.get(key);
  if (!raw) return [];
  return raw.split(",").filter((v): v is T => (allowed as readonly string[]).includes(v));
}

/** The inverse of `filtersToParams`; anything unrecognised is dropped rather than trusted. */
export function filtersFromParams(
  params: URLSearchParams,
  bounds: [number, number],
): { filters: Filters; sort: Sort } {
  const carat = (key: string, fallback: number) => {
    const value = Number.parseFloat(params.get(key) ?? "");
    return Number.isFinite(value) ? value : fallback;
  };
  const sort = (Object.keys(SORTS) as Sort[]).find((key) => key === params.get("sort"));
  return {
    filters: {
      shapes: pick(
        params,
        "shape",
        SHAPES.map((s) => s.slug),
      ),
      colors: pick(params, "color", [...COLOR_GRADES, FANCY]),
      clarities: pick(params, "clarity", CLARITY_GRADES),
      cuts: pick(params, "cut", CUT_GRADES),
      labs: pick(params, "lab", LABS),
      caratMin: carat("cmin", bounds[0]),
      caratMax: carat("cmax", bounds[1]),
    },
    sort: sort ?? "recommended",
  };
}

/** `?cmin=&cmax=` from a page's searchParams, e.g. a carat-guide link into the catalogue. */
export function caratFromSearch(cmin?: string | string[], cmax?: string | string[]) {
  const num = (value?: string | string[]) => {
    const n = Number.parseFloat((Array.isArray(value) ? value[0] : value) ?? "");
    return Number.isFinite(n) ? n : undefined;
  };
  return { min: num(cmin), max: num(cmax) };
}

/** `?color=D,E` from a page's searchParams, e.g. a colour-guide link into the catalogue. */
export function colorsFromSearch(value?: string | string[]): Filters["colors"] {
  const raw = (Array.isArray(value) ? value[0] : value) ?? "";
  const allowed: readonly string[] = [...COLOR_GRADES, FANCY];
  return raw.split(",").filter((v): v is Filters["colors"][number] => allowed.includes(v));
}

/** `?cut=Ideal,Excellent` from a page's searchParams, e.g. a cut-guide link into the catalogue. */
export function cutsFromSearch(value?: string | string[]): Filters["cuts"] {
  const raw = (Array.isArray(value) ? value[0] : value) ?? "";
  return raw
    .split(",")
    .filter((v): v is Filters["cuts"][number] => (CUT_GRADES as readonly string[]).includes(v));
}

/** `?clarity=VS1,VS2` from a page's searchParams, e.g. a clarity-guide link into the catalogue. */
export function claritiesFromSearch(value?: string | string[]): Filters["clarities"] {
  const raw = (Array.isArray(value) ? value[0] : value) ?? "";
  return raw
    .split(",")
    .filter((v): v is Filters["clarities"][number] => (CLARITY_GRADES as readonly string[]).includes(v));
}

/** One line for the sheet header, so a forwarded copy says what it was filtered to. */
export function describeFilters(filters: Filters, sort: Sort, bounds: [number, number]): string {
  const parts: string[] = [];
  if (filters.shapes.length) parts.push(filters.shapes.map((s) => SHAPE_BY_SLUG[s].name).join(", "));
  if (filters.caratMin !== bounds[0] || filters.caratMax !== bounds[1]) {
    parts.push(`${filters.caratMin.toFixed(2)}–${filters.caratMax.toFixed(2)} ct`);
  }
  if (filters.colors.length) parts.push(`Colour ${filters.colors.join(", ")}`);
  if (filters.clarities.length) parts.push(`Clarity ${filters.clarities.join(", ")}`);
  if (filters.cuts.length) parts.push(`Cut ${filters.cuts.join(", ")}`);
  if (filters.labs.length) parts.push(`${filters.labs.join(" or ")} certified`);
  const scope = parts.length ? `Filtered to ${parts.join("  •  ")}` : "Full catalogue, no filters";
  return `${scope}  •  Sorted ${SORTS[sort].toLowerCase()}`;
}
