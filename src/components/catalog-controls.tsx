"use client";

import { ShapeGlyph } from "./shape-glyph";
import { SHAPES, type ShapeSlug } from "@/lib/shapes";

/** Filter controls shared by the stone and jewelry catalogues. */

export function ShapeFilter({
  selected,
  counts,
  onToggle,
}: {
  selected: ShapeSlug[];
  counts: Partial<Record<string, number>>;
  onToggle: (slug: ShapeSlug) => void;
}) {
  return (
    <fieldset className="mt-6 border-t border-hairline pt-5">
      <legend className="sr-only">Shape</legend>
      <p className="text-[13px] text-ink-muted">Shape</p>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {SHAPES.map((shape) => {
          const on = selected.includes(shape.slug);
          const available = counts[shape.slug] ?? 0;
          return (
            <button
              key={shape.slug}
              type="button"
              onClick={() => onToggle(shape.slug)}
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
  );
}

export function CaratRange({
  label = "Carat",
  bounds: [min, max],
  value: [low, high],
  onChange,
}: {
  label?: string;
  bounds: [number, number];
  value: [number, number];
  onChange: (which: "caratMin" | "caratMax", raw: string) => void;
}) {
  return (
    <fieldset className="mt-6 border-t border-hairline pt-5">
      <legend className="sr-only">{label} range</legend>
      <p className="text-[13px] text-ink-muted">{label}</p>
      <div className="mt-3 flex items-center gap-3">
        <label className="flex-1">
          <span className="sr-only">Minimum carat</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.05"
            min={min}
            max={high}
            value={low}
            onChange={(e) => onChange("caratMin", e.target.value)}
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
            min={low}
            max={max}
            value={high}
            onChange={(e) => onChange("caratMax", e.target.value)}
            className="w-full rounded-[12px] border border-hairline bg-porcelain px-3 py-2 text-[15px] tabular-nums transition-colors duration-200 focus:border-ink"
          />
        </label>
      </div>
    </fieldset>
  );
}

export function ChipSet<T extends string>({
  label,
  options,
  selected,
  onToggle,
  optionLabel,
  counts,
}: {
  label: string;
  options: readonly T[];
  selected: T[];
  onToggle: (value: T) => void;
  /** Display text per option; defaults to the value itself. */
  optionLabel?: (value: T) => string;
  /** When given, options with no matching items are disabled. */
  counts?: Partial<Record<T, number>>;
}) {
  return (
    <fieldset className="mt-6 border-t border-hairline pt-5">
      <legend className="sr-only">{label}</legend>
      <p className="text-[13px] text-ink-muted">{label}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => {
          const on = selected.includes(option);
          const available = counts ? (counts[option] ?? 0) : undefined;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onToggle(option)}
              aria-pressed={on}
              disabled={available === 0}
              title={available === undefined ? undefined : `${optionLabel?.(option) ?? option} (${available})`}
              className={`rounded-[10px] border px-3 py-1.5 text-[13px] transition-colors duration-200 disabled:opacity-35 ${
                on ? "border-ink bg-facet" : "border-hairline hover:border-metal"
              }`}
            >
              {optionLabel?.(option) ?? option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
