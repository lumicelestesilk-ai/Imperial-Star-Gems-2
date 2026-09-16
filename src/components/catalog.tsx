"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { StoneGrid } from "./stone-grid";
import { CaratRange, ChipSet, ShapeFilter } from "./catalog-controls";
import type { ShapeSlug } from "@/lib/shapes";
import {
  CLARITY_GRADES,
  COLOR_GRADES,
  CUT_GRADES,
  LABS,
  addedKey,
  caratBounds,
  countByShape,
  type Origin,
  type Stone,
} from "@/lib/stones";
import {
  FANCY,
  SORTS,
  filterStones,
  filtersToParams,
  type Filters,
  type Sort,
} from "@/lib/catalog-filter";

const PAGE = 12;

export function Catalog({
  stones,
  origin,
  initialShape,
  initialCarat,
  initialColors,
  initialCuts,
  initialClarities,
  notice,
}: {
  stones: Stone[];
  origin: Origin;
  initialShape?: ShapeSlug;
  /** Opening carat range; clamped to the catalogue's bounds. Clear resets to the full range. */
  initialCarat?: { min?: number; max?: number };
  /** Opening colour selection, e.g. from the colour guide. */
  initialColors?: Filters["colors"];
  /** Opening cut selection, e.g. from the cut guide. */
  initialCuts?: Filters["cuts"];
  /** Opening clarity selection, e.g. from the clarity guide. */
  initialClarities?: Filters["clarities"];
  notice?: string;
}) {
  const [min, max] = useMemo(() => caratBounds(stones), [stones]);
  const perShape = useMemo(() => countByShape(stones), [stones]);

  const empty: Filters = useMemo(
    () => ({
      shapes: initialShape ? [initialShape] : [],
      colors: [],
      clarities: [],
      cuts: [],
      labs: [],
      caratMin: min,
      caratMax: max,
    }),
    [initialShape, min, max],
  );

  const [filters, setFilters] = useState<Filters>(() => {
    const clamp = (v: number) => Math.min(max, Math.max(min, v));
    return {
      ...empty,
      colors: initialColors ?? empty.colors,
      cuts: initialCuts ?? empty.cuts,
      clarities: initialClarities ?? empty.clarities,
      caratMin: clamp(initialCarat?.min ?? min),
      caratMax: clamp(initialCarat?.max ?? max),
    };
  });
  const [visible, setVisible] = useState(PAGE);
  const [sort, setSort] = useState<Sort>("recommended");
  const hasDates = useMemo(() => stones.some((s) => addedKey(s) > 0), [stones]);

  function toggle<K extends "shapes" | "colors" | "clarities" | "cuts" | "labs">(
    key: K,
    value: Filters[K][number],
  ) {
    setFilters((prev) => {
      const list = prev[key] as Filters[K][number][];
      const next = list.includes(value)
        ? list.filter((v) => v !== value)
        : [...list, value];
      return { ...prev, [key]: next };
    });
    setVisible(PAGE);
  }

  function setCarat(which: "caratMin" | "caratMax", raw: string) {
    const value = Number.parseFloat(raw);
    setFilters((prev) => ({ ...prev, [which]: Number.isFinite(value) ? value : prev[which] }));
    setVisible(PAGE);
  }

  const results = useMemo(() => filterStones(stones, filters, sort), [stones, filters, sort]);

  // The sheet covers every matching stone, not just the page shown so far.
  const query = filtersToParams(filters, sort, [min, max]).toString();
  const sheetHref = `/spec-sheet/${origin === "natural" ? "natural" : "lab-grown"}${query ? `?${query}` : ""}`;

  const activeCount =
    filters.shapes.length +
    filters.colors.length +
    filters.clarities.length +
    filters.cuts.length +
    filters.labs.length +
    (filters.caratMin !== min || filters.caratMax !== max ? 1 : 0);

  // Re-keying the grid on the filter signature replays the entry transition,
  // which is what makes a filter change feel like it landed.
  const signature = JSON.stringify([filters, sort]);

  return (
    <div className="grid gap-10 lg:grid-cols-[280px_1fr] lg:gap-12">
      <aside className="lg:sticky lg:top-[96px] lg:h-fit">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-2xl">Filter</h2>
          {activeCount > 0 ? (
            <button
              type="button"
              onClick={() => {
                setFilters({ ...empty, shapes: [] });
                setVisible(PAGE);
              }}
              className="text-[13px] text-ink-muted underline underline-offset-4 transition-colors duration-200 hover:text-ink"
            >
              Clear {activeCount}
            </button>
          ) : null}
        </div>

        <ShapeFilter
          selected={filters.shapes}
          counts={perShape}
          onToggle={(slug) => toggle("shapes", slug)}
        />

        <CaratRange
          bounds={[min, max]}
          value={[filters.caratMin, filters.caratMax]}
          onChange={setCarat}
        />

        <ChipSet
          label="Colour"
          options={[...COLOR_GRADES, FANCY]}
          selected={filters.colors}
          onToggle={(v) => toggle("colors", v)}
        />
        <ChipSet
          label="Clarity"
          options={CLARITY_GRADES}
          selected={filters.clarities}
          onToggle={(v) => toggle("clarities", v)}
        />
        <ChipSet
          label="Cut and finish"
          options={CUT_GRADES}
          selected={filters.cuts}
          onToggle={(v) => toggle("cuts", v)}
        />
        <ChipSet
          label="Certificate"
          options={LABS}
          selected={filters.labs}
          onToggle={(v) => toggle("labs", v)}
        />
      </aside>

      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-hairline pb-5">
          <p aria-live="polite" className="text-[15px]">
            {results.length} {results.length === 1 ? "stone" : "stones"}
          </p>
          <label className="flex items-center gap-2 text-[13px] text-ink-muted">
            Sort
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as Sort);
                setVisible(PAGE);
              }}
              className="rounded-[12px] border border-hairline bg-porcelain px-3 py-2 text-[15px] text-ink transition-colors duration-200 focus:border-ink"
            >
              {(Object.keys(SORTS) as Sort[])
                .filter((key) => key !== "recent" || hasDates)
                .map((key) => (
                  <option key={key} value={key}>
                    {SORTS[key]}
                  </option>
                ))}
            </select>
          </label>
          {results.length > 0 ? (
            <a
              href={sheetHref}
              download
              className="text-[13px] text-ink-muted underline underline-offset-4 transition-colors duration-200 hover:text-ink"
            >
              Download spec sheet (PDF)
            </a>
          ) : null}
          {notice ? <p className="w-full text-[13px] text-ink-muted">{notice}</p> : null}
        </div>

        {results.length === 0 ? (
          <div className="mt-10 rounded-[22px] border border-hairline bg-panel p-8">
            <h3 className="font-display text-2xl">Nothing matches that combination</h3>
            <p className="measure mt-2 text-[15px] text-ink-muted-panel">
              Widen the carat range or clear a grade. We also source to order, so tell us what
              you are looking for and we will go and find it.
            </p>
          </div>
        ) : (
          <motion.div
            key={signature}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
            className="mt-8"
          >
            <StoneGrid
              stones={results.slice(0, visible)}
              className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
            />
          </motion.div>
        )}

        {visible < results.length ? (
          <div className="mt-10 flex justify-center">
            <button
              type="button"
              onClick={() => setVisible((v) => v + PAGE)}
              className="rounded-full border border-ink px-8 py-3 text-[15px] transition-colors duration-200 hover:bg-ink hover:text-white"
            >
              Show {Math.min(PAGE, results.length - visible)} more
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
