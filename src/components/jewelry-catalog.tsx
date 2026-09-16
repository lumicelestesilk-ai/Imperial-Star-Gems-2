"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { JewelryGrid } from "./jewelry-grid";
import { CaratRange, ChipSet, ShapeFilter } from "./catalog-controls";
import {
  CATEGORY_PLURAL,
  JEWELRY_CATEGORIES,
  METAL_NAME,
  METALS,
  PURITIES,
  SORTS,
  countBy,
  filterJewelry,
  jewelryCaratBounds,
  jewelryFiltersToParams,
  type JewelSummary,
  type JewelryFilters,
  type Sort,
} from "@/lib/jewelry";

const PAGE = 12;

type ListKey = "categories" | "shapes" | "metals" | "purities";

/** The stone Catalog's layout and behaviour, filtered on jewelry's own attributes. */
export function JewelryCatalog({
  items,
  initial,
  notice,
}: {
  items: JewelSummary[];
  /** Opening selection, e.g. from `?type=ring`. */
  initial?: Partial<Pick<JewelryFilters, ListKey>>;
  notice?: string;
}) {
  const [min, max] = useMemo(() => jewelryCaratBounds(items), [items]);
  const counts = useMemo(
    () => ({
      categories: countBy(items, (j) => [j.category]),
      shapes: countBy(items, (j) => j.shapes),
      metals: countBy(items, (j) => j.metals),
      purities: countBy(items, (j) => j.purities),
    }),
    [items],
  );

  const empty: JewelryFilters = useMemo(
    () => ({ categories: [], shapes: [], metals: [], purities: [], caratMin: min, caratMax: max }),
    [min, max],
  );

  const [filters, setFilters] = useState<JewelryFilters>(() => ({ ...empty, ...initial }));
  const [visible, setVisible] = useState(PAGE);
  const [sort, setSort] = useState<Sort>("recommended");

  function toggle<K extends ListKey>(key: K, value: JewelryFilters[K][number]) {
    setFilters((prev) => {
      const list = prev[key] as JewelryFilters[K][number][];
      const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
      return { ...prev, [key]: next };
    });
    setVisible(PAGE);
  }

  function setCarat(which: "caratMin" | "caratMax", raw: string) {
    const value = Number.parseFloat(raw);
    setFilters((prev) => ({ ...prev, [which]: Number.isFinite(value) ? value : prev[which] }));
    setVisible(PAGE);
  }

  const results = useMemo(() => filterJewelry(items, filters, sort), [items, filters, sort]);

  // The sheet covers every matching piece, not just the page shown so far.
  const query = jewelryFiltersToParams(filters, sort, [min, max]).toString();
  const sheetHref = `/spec-sheet/jewelry${query ? `?${query}` : ""}`;

  const activeCount =
    filters.categories.length +
    filters.shapes.length +
    filters.metals.length +
    filters.purities.length +
    (filters.caratMin !== min || filters.caratMax !== max ? 1 : 0);

  // Re-keying the grid on the filter signature replays the entry transition.
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
                setFilters(empty);
                setVisible(PAGE);
              }}
              className="text-[13px] text-ink-muted underline underline-offset-4 transition-colors duration-200 hover:text-ink"
            >
              Clear {activeCount}
            </button>
          ) : null}
        </div>

        <ChipSet
          label="Type"
          options={JEWELRY_CATEGORIES}
          selected={filters.categories}
          onToggle={(v) => toggle("categories", v)}
          optionLabel={(v) => CATEGORY_PLURAL[v]}
          counts={counts.categories}
        />

        <ShapeFilter
          selected={filters.shapes}
          counts={counts.shapes}
          onToggle={(slug) => toggle("shapes", slug)}
        />

        <CaratRange
          label="Total carat"
          bounds={[min, max]}
          value={[filters.caratMin, filters.caratMax]}
          onChange={setCarat}
        />

        <ChipSet
          label="Metal"
          options={METALS}
          selected={filters.metals}
          onToggle={(v) => toggle("metals", v)}
          optionLabel={(v) => METAL_NAME[v]}
          counts={counts.metals}
        />
        <ChipSet
          label="Purity"
          options={PURITIES}
          selected={filters.purities}
          onToggle={(v) => toggle("purities", v)}
          counts={counts.purities}
        />
      </aside>

      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-hairline pb-5">
          <p aria-live="polite" className="text-[15px]">
            {results.length} {results.length === 1 ? "piece" : "pieces"}
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
              {(Object.keys(SORTS) as Sort[]).map((key) => (
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
              Widen the carat range or clear a filter. We also make to order, so tell us the piece
              you have in mind and we will quote for it.
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
            <JewelryGrid
              items={results.slice(0, visible)}
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
