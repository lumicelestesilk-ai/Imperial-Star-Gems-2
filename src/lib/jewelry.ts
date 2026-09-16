import { SHAPE_BY_SLUG, SHAPES, type ShapeSlug } from "./shapes";
import type { Lab, Origin } from "./stones";

/**
 * Finished jewelry — the counterpart of stones.ts. This module holds the types,
 * vocabulary and filtering only; the stock list lives in real-jewelry.ts, which
 * is server-only because of its size. Client components import from here.
 */

export const JEWELRY_CATEGORIES = ["ring", "earrings", "bracelet", "necklace"] as const;
export const METALS = ["yellow", "white", "rose"] as const;
export const PURITIES = ["9K", "10K", "14K", "18K"] as const;

export type JewelryCategory = (typeof JEWELRY_CATEGORIES)[number];
export type Metal = (typeof METALS)[number];
export type Purity = (typeof PURITIES)[number];

export const CATEGORY_NAME: Record<JewelryCategory, string> = {
  ring: "Ring",
  earrings: "Earrings",
  bracelet: "Bracelet",
  necklace: "Necklace",
};

export const CATEGORY_PLURAL: Record<JewelryCategory, string> = {
  ring: "Rings",
  earrings: "Earrings",
  bracelet: "Bracelets",
  necklace: "Necklaces",
};

export const METAL_NAME: Record<Metal, string> = {
  yellow: "Yellow gold",
  white: "White gold",
  rose: "Rose gold",
};

export type JewelImage = {
  /** Under /public/jewelry/<SKU>/ */
  src: string;
  width: number;
  height: number;
  alt: string;
  /** Set when the photograph shows one metal colour only. */
  metal?: Metal;
};

export type JewelSection = {
  title: string;
  rows: [string, string][];
  notes: string[];
};

export type Jewel = {
  /** IMPSG-NNNNN, assigned by scripts/scrape-jewelry.mjs. */
  sku: string;
  name: string;
  category: JewelryCategory;
  origin: Origin;
  /** Every shape set in the piece, centre stone first. */
  shapes: ShapeSlug[];
  /** Total diamond weight. */
  carat: number;
  centerCarat?: number;
  diamondCount?: number;
  /** Ranges, not single grades — pieces are set with matched parcels ("D–F", "VVS–VS"). */
  color?: string;
  clarity?: string;
  lab?: Lab;
  /** Metal colours the piece is made in. */
  metals: Metal[];
  /** Gold purities the piece is made in. */
  purities: Purity[];
  ringSize?: string;
  images: JewelImage[];
  /** The full written specification, as supplied. */
  sections: JewelSection[];
  /** ISO timestamp. */
  addedAt: string;
  featured: boolean;
  /**
   * Trade-desk reference only; never rendered and never sent to the browser.
   * `priceUsd` is the supplier's retail range across metal options.
   */
  supplier: {
    productId: number;
    handle: string;
    ref?: string;
    priceUsd?: [number, number];
  };
};

/**
 * What the catalogue, cards and enquiry drawer need. The written specification
 * and supplier details stay on the server.
 */
export type JewelSummary = Omit<Jewel, "sections" | "supplier">;

export function toSummary({ sections: _s, supplier: _p, ...summary }: Jewel): JewelSummary {
  return summary;
}

export function originWord(jewel: Pick<Jewel, "origin">) {
  return jewel.origin === "natural" ? "natural" : "lab-grown";
}

export function metalsLine(jewel: Pick<Jewel, "metals">) {
  return jewel.metals.map((m) => METAL_NAME[m].split(" ")[0]).join(", ") + " gold";
}

export function puritiesLine(jewel: Pick<Jewel, "purities">) {
  return jewel.purities.join(", ");
}

export function shapesLine(jewel: Pick<Jewel, "shapes">) {
  return jewel.shapes.map((s) => SHAPE_BY_SLUG[s].name).join(", ");
}

/** "Ring, 2.57ct, D–F/VVS–VS" — the recap that rides along with every enquiry. */
export function jewelDescriptor(jewel: JewelSummary): string {
  const grades = [jewel.color, jewel.clarity].filter(Boolean).join("/");
  return [CATEGORY_NAME[jewel.category], `${jewel.carat.toFixed(2)}ct`, grades]
    .filter(Boolean)
    .join(", ");
}

/** The label/value list shared by the piece's page, its enquiry drawer and its PDF spec sheet. */
export function jewelSpecs(jewel: JewelSummary): [string, string][] {
  const specs: [string, string][] = [
    ["Type", CATEGORY_NAME[jewel.category]],
    ["Total carat", `${jewel.carat.toFixed(2)} ct`],
  ];
  if (jewel.centerCarat !== undefined) specs.push(["Centre stone", `${jewel.centerCarat.toFixed(2)} ct`]);
  if (jewel.diamondCount !== undefined) specs.push(["Diamond count", String(jewel.diamondCount)]);
  specs.push([jewel.shapes.length > 1 ? "Shapes" : "Shape", shapesLine(jewel)]);
  if (jewel.color) specs.push(["Colour", jewel.color]);
  if (jewel.clarity) specs.push(["Clarity", jewel.clarity]);
  specs.push(["Origin", jewel.origin === "natural" ? "Natural" : "Lab-grown"]);
  if (jewel.metals.length) specs.push(["Metal", metalsLine(jewel)]);
  if (jewel.purities.length) specs.push(["Purity", puritiesLine(jewel)]);
  if (jewel.ringSize) specs.push(["Ring size", jewel.ringSize]);
  specs.push(["Certificate", jewel.lab ? `${jewel.lab}, on request` : "On request"]);
  return specs;
}

/* ---------------------------------------------------------------- filtering */

/** Same options as the stone catalogues; not imported from catalog-filter, which pulls in the stone lists. */
export const SORTS = {
  recommended: "Recommended",
  recent: "Recently added",
  caratDesc: "Carat: high to low",
  caratAsc: "Carat: low to high",
} as const;

export type Sort = keyof typeof SORTS;

export type JewelryFilters = {
  categories: JewelryCategory[];
  shapes: ShapeSlug[];
  metals: Metal[];
  purities: Purity[];
  caratMin: number;
  caratMax: number;
};

/** Filtering lives here, not in the component, so the PDF sheet lists exactly what was on screen. */
export function filterJewelry<T extends JewelSummary>(
  items: T[],
  filters: JewelryFilters,
  sort: Sort,
): T[] {
  const matched = items.filter((j) => {
    if (filters.categories.length && !filters.categories.includes(j.category)) return false;
    if (filters.shapes.length && !j.shapes.some((s) => filters.shapes.includes(s))) return false;
    if (filters.metals.length && !j.metals.some((m) => filters.metals.includes(m))) return false;
    if (filters.purities.length && !j.purities.some((p) => filters.purities.includes(p))) return false;
    if (j.carat < filters.caratMin || j.carat > filters.caratMax) return false;
    return true;
  });
  if (sort === "recent") return matched.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  if (sort === "caratDesc") return matched.sort((a, b) => b.carat - a.carat);
  if (sort === "caratAsc") return matched.sort((a, b) => a.carat - b.carat);
  // Recommended: featured pieces first, otherwise stock order.
  return matched.sort((a, b) => Number(b.featured) - Number(a.featured));
}

/** Carat bounds of a set, rounded outwards to clean input stops. */
export function jewelryCaratBounds(items: Pick<Jewel, "carat">[]): [number, number] {
  const values = items.map((j) => j.carat);
  return [Math.floor(Math.min(...values) * 10) / 10, Math.ceil(Math.max(...values) * 10) / 10];
}

export function countBy<T extends string>(items: JewelSummary[], key: (j: JewelSummary) => T[]) {
  return items.reduce<Partial<Record<T, number>>>((acc, j) => {
    for (const value of new Set(key(j))) acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

/** Only non-default values are written, so an unfiltered sheet has a bare URL. */
export function jewelryFiltersToParams(
  filters: JewelryFilters,
  sort: Sort,
  bounds: [number, number],
) {
  const params = new URLSearchParams();
  if (filters.categories.length) params.set("type", filters.categories.join(","));
  if (filters.shapes.length) params.set("shape", filters.shapes.join(","));
  if (filters.metals.length) params.set("metal", filters.metals.join(","));
  if (filters.purities.length) params.set("purity", filters.purities.join(","));
  if (filters.caratMin !== bounds[0]) params.set("cmin", String(filters.caratMin));
  if (filters.caratMax !== bounds[1]) params.set("cmax", String(filters.caratMax));
  if (sort !== "recommended") params.set("sort", sort);
  return params;
}

/** `?type=ring,earrings` style values, with anything unrecognised dropped. */
export function pickList<T extends string>(
  value: string | string[] | null | undefined,
  allowed: readonly T[],
): T[] {
  const raw = (Array.isArray(value) ? value[0] : value) ?? "";
  return raw.split(",").filter((v): v is T => (allowed as readonly string[]).includes(v));
}

/** The inverse of `jewelryFiltersToParams`. */
export function jewelryFiltersFromParams(
  params: URLSearchParams,
  bounds: [number, number],
): { filters: JewelryFilters; sort: Sort } {
  const carat = (key: string, fallback: number) => {
    const value = Number.parseFloat(params.get(key) ?? "");
    return Number.isFinite(value) ? value : fallback;
  };
  const sort = (Object.keys(SORTS) as Sort[]).find((key) => key === params.get("sort"));
  return {
    filters: {
      categories: pickList(params.get("type"), JEWELRY_CATEGORIES),
      shapes: pickList(
        params.get("shape"),
        SHAPES.map((s) => s.slug),
      ),
      metals: pickList(params.get("metal"), METALS),
      purities: pickList(params.get("purity"), PURITIES),
      caratMin: carat("cmin", bounds[0]),
      caratMax: carat("cmax", bounds[1]),
    },
    sort: sort ?? "recommended",
  };
}

/** One line for the sheet header, so a forwarded copy says what it was filtered to. */
export function describeJewelryFilters(
  filters: JewelryFilters,
  sort: Sort,
  bounds: [number, number],
): string {
  const parts: string[] = [];
  if (filters.categories.length) parts.push(filters.categories.map((c) => CATEGORY_PLURAL[c]).join(", "));
  if (filters.shapes.length) parts.push(filters.shapes.map((s) => SHAPE_BY_SLUG[s].name).join(", "));
  if (filters.caratMin !== bounds[0] || filters.caratMax !== bounds[1]) {
    parts.push(`${filters.caratMin.toFixed(2)}–${filters.caratMax.toFixed(2)} ct`);
  }
  if (filters.metals.length) parts.push(filters.metals.map((m) => METAL_NAME[m]).join(", "));
  if (filters.purities.length) parts.push(filters.purities.join(", "));
  const scope = parts.length ? `Filtered to ${parts.join("  •  ")}` : "Full catalogue, no filters";
  return `${scope}  •  Sorted ${SORTS[sort].toLowerCase()}`;
}
