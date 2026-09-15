"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { StoneGrid } from "./stone-grid";
import { ShapeGlyph } from "./shape-glyph";
import { SHAPES, type ShapeSlug } from "@/lib/shapes";
import {
  CLARITY_GRADES,
  COLOR_GRADES,
  CUT_GRADES,
  LABS,
  addedKey,
  caratBounds,
  countByShape,
  isColorGrade,
  type ClarityGrade,
  type ColorGrade,
  type CutGrade,
  type Lab,
  type Stone,
} from "@/lib/stones";

const PAGE = 12;

const FANCY = "Fancy";

const SORTS = {
  recommended: "Recommended",
  recent: "Recently added",
  caratDesc: "Carat: high to low",
  caratAsc: "Carat: low to high",
} as const;

type Sort = keyof typeof SORTS;

type Filters = {
  shapes: ShapeSlug[];
  colors: (ColorGrade | typeof FANCY)[];
  clarities: ClarityGrade[];
  cuts: CutGrade[];
  labs: Lab[];
  caratMin: number;
  caratMax: number;
};

export function Catalog({
  stones,
  initialShape,
  notice,
}: {
  stones: Stone[];
  initialShape?: ShapeSlug;
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

  const [filters, setFilters] = useState<Filters>(empty);
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

  const results = useMemo(() => {
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
  }, [stones, filters, sort]);

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

        <fieldset className="mt-6 border-t border-hairline pt-5">
          <legend className="sr-only">Shape</legend>
          <p className="text-[13px] text-ink-muted">Shape</p>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {SHAPES.map((shape) => {
              const on = filters.shapes.includes(shape.slug);
              const available = perShape[shape.slug] ?? 0;
              return (
                <button
                  key={shape.slug}
                  type="button"
                  onClick={() => toggle("shapes", shape.slug)}
                  aria-pressed={on}
                  disabled={available === 0}
                  title={`${shape.name} (${available})`}
                  className={`flex flex-col items-center gap-1 rounded-[12px] border px-1 py-2 transition-colors duration-200 disabled:opacity-35 ${
                    on ? "border-ink bg-facet" : "border-hairline hover:border-metal"
                  }`}
                >
                  <ShapeGlyph
                    geometry={shape.geometry}
                    frozen
                    className={`h-7 w-7 ${
                      on
                        ? "[&_.glyph-facet]:stroke-ink [&_.glyph-outline]:stroke-ink"
                        : "[&_.glyph-facet]:stroke-metal [&_.glyph-outline]:stroke-metal"
                    }`}
                  />
                  <span className="text-[10px] leading-none">{shape.name}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="mt-6 border-t border-hairline pt-5">
          <legend className="sr-only">Carat range</legend>
          <p className="text-[13px] text-ink-muted">Carat</p>
          <div className="mt-3 flex items-center gap-3">
            <label className="flex-1">
              <span className="sr-only">Minimum carat</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.05"
                min={min}
                max={filters.caratMax}
                value={filters.caratMin}
                onChange={(e) => setCarat("caratMin", e.target.value)}
                className="w-full rounded-[12px] border border-hairline bg-porcelain px-3 py-2 text-[15px] tabular-nums transition-colors duration-200 focus:border-ink"
              />
            </label>
            <span aria-hidden className="h-px w-3 bg-hairline" />
            <label className="flex-1">
              <span className="sr-only">Maximum carat</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.05"
                min={filters.caratMin}
                max={max}
                value={filters.caratMax}
                onChange={(e) => setCarat("caratMax", e.target.value)}
                className="w-full rounded-[12px] border border-hairline bg-porcelain px-3 py-2 text-[15px] tabular-nums transition-colors duration-200 focus:border-ink"
              />
            </label>
          </div>
        </fieldset>

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

function ChipSet<T extends string>({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: readonly T[];
  selected: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <fieldset className="mt-6 border-t border-hairline pt-5">
      <legend className="sr-only">{label}</legend>
      <p className="text-[13px] text-ink-muted">{label}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => {
          const on = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => onToggle(option)}
              aria-pressed={on}
              className={`rounded-[10px] border px-3 py-1.5 text-[13px] transition-colors duration-200 ${
                on ? "border-ink bg-facet" : "border-hairline hover:border-metal"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
