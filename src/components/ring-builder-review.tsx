"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { ShapeGlyph } from "./shape-glyph";
import { SIZE_MODELS, faceUpSize, formatFaceUp, parseMeasurements, type FaceUp } from "@/lib/carat-size";
import { ringBuildMailtoHref, ringBuildWhatsappHref, stoneDescriptor, type RingBuild } from "@/lib/contact";
import { METALS, METAL_NAME, PURITIES, type Metal, type Purity } from "@/lib/jewelry";
import {
  FINISH,
  STYLE_NAME,
  builderHref,
  imageForMetal,
  type BuildParams,
  type SettingDesign,
} from "@/lib/ring-builder";
import { ORDER_SIZES, formatUs, sizeFromUs } from "@/lib/ring-sizes";
import type { ShortlistStone } from "@/lib/shortlist";
import { SHAPE_BY_SLUG, type ShapeSlug } from "@/lib/shapes";

type Props = {
  stone: ShortlistStone;
  design: SettingDesign | null;
  params: BuildParams;
  initialMetal?: Metal;
  initialPurity?: Purity;
  initialSize?: number;
};

export function RingBuilderReview({ stone, design, params, initialMetal, initialPurity, initialSize }: Props) {
  const router = useRouter();
  const metals = design?.metals.length ? design.metals : [...METALS];
  const purities = design?.purities.length ? design.purities : [...PURITIES];
  const [metal, setMetal] = useState<Metal>(
    initialMetal && metals.includes(initialMetal) ? initialMetal : metals.includes("white") ? "white" : metals[0],
  );
  const [purity, setPurity] = useState<Purity>(
    initialPurity && purities.includes(initialPurity)
      ? initialPurity
      : purities.includes("18K")
        ? "18K"
        : purities[purities.length - 1],
  );
  const [size, setSize] = useState<number | undefined>(initialSize);
  const sizeId = useId();

  // Keep the URL shareable: a link sent to a partner opens on the same ring.
  const sync = (changes: Partial<BuildParams>) =>
    router.replace(builderHref(params, changes), { scroll: false });

  const photo = design ? imageForMetal(design, metal) : undefined;
  const stoneSize = parseMeasurements(stone.measurements) ?? faceUpSize(stone.shape, stone.carat);
  const ring = sizeFromUs(size ?? 7);

  const build: RingBuild = {
    stone,
    setting: design ? { sku: design.sku, name: design.name } : undefined,
    metal: `${purity} ${METAL_NAME[metal].toLowerCase()}, ${FINISH.toLowerCase()}`,
    size: size === undefined ? undefined : `US ${formatUs(size)} (UK ${ring.uk}, EU ${ring.eu})`,
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
      {/* The combination */}
      <div className="space-y-5 lg:sticky lg:top-[96px] lg:h-fit">
        {design && photo ? (
          <figure className="relative aspect-square overflow-hidden rounded-[22px] bg-panel">
            <Image
              key={photo.src}
              src={photo.src}
              alt={photo.metal ? `${design.name} in ${METAL_NAME[photo.metal].toLowerCase()}` : design.name}
              fill
              priority
              sizes="(min-width: 1024px) 45vw, 90vw"
              className="object-cover"
            />
            <figcaption className="absolute bottom-3 left-3 rounded-full bg-porcelain/90 px-3 py-1 text-[12px] text-ink-muted backdrop-blur-sm">
              {photo.metal === metal ? "Shown" : "Photographed in another metal,"} with a{" "}
              {design.centreCarat.toFixed(2)} ct centre stone
            </figcaption>
          </figure>
        ) : (
          <div className="flex aspect-square items-center justify-center rounded-[22px] bg-panel">
            <ShapeGlyph geometry={SHAPE_BY_SLUG[stone.shape].geometry} className="glyph-auto h-40 w-40" />
          </div>
        )}

        {design ? (
          <ScaleCompare shape={stone.shape} yours={stoneSize} photographed={design.centreSize} estimated={!design.centreSizeMeasured} />
        ) : null}
      </div>

      {/* Choices */}
      <div>
        <section className="border-b border-hairline pb-6">
          <p className="text-[12px] text-ink-muted">Your stone</p>
          <div className="mt-1 flex items-baseline justify-between gap-4">
            <h3 className="font-display text-[26px] leading-tight">
              {stone.shapeName} {stone.carat.toFixed(2)} ct
            </h3>
            <Link href={builderHref(params, { stone: undefined, page: undefined })} className="shrink-0 text-[13px] text-ink-muted underline underline-offset-4 hover:text-ink">
              Change
            </Link>
          </div>
          <p className="mt-1 text-[14px] text-ink-muted">
            {stone.color} colour, {stone.clarity} clarity, {stone.origin === "natural" ? "natural" : "lab-grown"},{" "}
            {stone.lab} · <Link href={`/stones/${stone.sku}`} className="underline underline-offset-4 hover:text-ink">{stone.sku}</Link>
          </p>
        </section>

        <section className="border-b border-hairline py-6">
          <p className="text-[12px] text-ink-muted">Your setting</p>
          {design ? (
            <>
              <div className="mt-1 flex items-baseline justify-between gap-4">
                <h3 className="font-display text-[26px] leading-tight">{STYLE_NAME[design.style]}</h3>
                <Link href={builderHref(params, { setting: undefined, page: undefined })} className="shrink-0 text-[13px] text-ink-muted underline underline-offset-4 hover:text-ink">
                  Change
                </Link>
              </div>
              <p className="mt-1 text-[14px] text-ink-muted">
                <Link href={`/jewelry/${design.sku}`} className="underline underline-offset-4 hover:text-ink">
                  {design.name}
                </Link>
              </p>
            </>
          ) : (
            <p className="mt-1 text-[15px] text-ink-muted">
              A made-to-order design for this stone. We will suggest suitable settings when you
              enquire.
            </p>
          )}
        </section>

        <fieldset className="border-b border-hairline py-6">
          <legend className="text-[12px] text-ink-muted">Metal</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {metals.map((m) => (
              <Choice
                key={m}
                name="metal"
                checked={metal === m}
                onChange={() => {
                  setMetal(m);
                  sync({ metal: m });
                }}
              >
                <span aria-hidden className={`h-3.5 w-3.5 rounded-full border border-metal ${SWATCH[m]}`} />
                {METAL_NAME[m]}
              </Choice>
            ))}
          </div>
        </fieldset>

        <fieldset className="border-b border-hairline py-6">
          <legend className="text-[12px] text-ink-muted">Gold purity</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {purities.map((p) => (
              <Choice
                key={p}
                name="purity"
                checked={purity === p}
                onChange={() => {
                  setPurity(p);
                  sync({ purity: p });
                }}
              >
                {p}
              </Choice>
            ))}
          </div>
          <p className="mt-3 text-[13px] text-ink-muted">
            Higher purity means more gold: a richer colour and a heavier ring. Lower purity is harder
            wearing.
          </p>
        </fieldset>

        <div className="border-b border-hairline py-6">
          <p className="text-[12px] text-ink-muted">Finish</p>
          <p className="mt-1 text-[15px]">{FINISH}</p>
        </div>

        <div className="border-b border-hairline py-6">
          <div className="flex items-baseline justify-between gap-4">
            <label htmlFor={sizeId} className="text-[12px] text-ink-muted">
              Ring size
            </label>
            <Link href="/ring-size-guide" className="text-[13px] text-ink-muted underline underline-offset-4 hover:text-ink">
              Find your size
            </Link>
          </div>
          <select
            id={sizeId}
            value={size === undefined ? "" : String(size)}
            onChange={(e) => {
              const next = e.target.value ? Number(e.target.value) : undefined;
              setSize(next);
              sync({ size: next === undefined ? undefined : String(next) });
            }}
            className="mt-3 w-full rounded-input border border-hairline bg-porcelain px-4 py-2.5 text-[15px]"
          >
            <option value="">Not sure yet</option>
            {ORDER_SIZES.map((us) => {
              const s = sizeFromUs(us);
              return (
                <option key={us} value={us}>
                  US {formatUs(us)} · UK {s.uk} · EU {s.eu}
                </option>
              );
            })}
          </select>
        </div>

        <section className="mt-8 rounded-[22px] bg-panel p-6 sm:p-8">
          <h3 className="font-display text-[26px] leading-tight">Enquire about this ring</h3>
          <p className="mt-2 text-[14px] text-ink-muted-panel">
            Your stone, setting, metal and size go in one message. We reply with the price, lead time
            and the grading report.
          </p>
          <ul className="mt-4 space-y-1 text-[13px] text-ink-muted-panel">
            <li>{stone.sku} · {stoneDescriptor(stone)}</li>
            {design ? <li>{design.sku} · {STYLE_NAME[design.style]} setting</li> : null}
            <li>{build.metal}</li>
            <li>Size {build.size ?? "to be confirmed"}</li>
          </ul>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <a
              href={ringBuildWhatsappHref(build)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-ink px-6 py-3 text-center text-[15px] text-white transition-opacity duration-200 hover:opacity-85"
            >
              WhatsApp
            </a>
            <a
              href={ringBuildMailtoHref(build)}
              className="rounded-full border border-ink px-6 py-3 text-center text-[15px] transition-colors duration-200 hover:bg-ink hover:text-white"
            >
              Email
            </a>
          </div>
          <p className="mt-4 text-[12px] text-ink-muted-panel">Price and availability confirmed on enquiry.</p>
        </section>
      </div>
    </div>
  );
}

/** Flat swatches: a hint of the metal, not a rendering of it. */
const SWATCH: Record<Metal, string> = {
  yellow: "bg-[#e3c77f]",
  white: "bg-[#e6e6e3]",
  rose: "bg-[#e3b3a0]",
};

function Choice({
  name,
  checked,
  onChange,
  children,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-[14px] transition-colors duration-200 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink ${
        checked ? "border-ink" : "border-hairline hover:border-ink"
      }`}
    >
      <input type="radio" name={name} checked={checked} onChange={onChange} className="sr-only" />
      {children}
    </label>
  );
}

/**
 * The buyer's stone over the centre stone the design was photographed with,
 * both drawn to true millimetre scale. This is what "combined" can honestly
 * show: the head is made to fit the stone, so the question is how the
 * proportions change against the photograph.
 */
function ScaleCompare({
  shape,
  yours,
  photographed,
  estimated,
}: {
  shape: ShapeSlug;
  yours: FaceUp;
  photographed: FaceUp;
  estimated: boolean;
}) {
  const [x, y, w, h] = SIZE_MODELS[shape].box;
  const geometry = SHAPE_BY_SLUG[shape].geometry;
  const ratio = yours.width / photographed.width;
  const note =
    ratio < 0.85
      ? "Your stone is smaller than the one photographed, so the band and any halo will look a little more prominent around it."
      : ratio > 1.15
        ? "Your stone is larger than the one photographed, so the band will look finer beside it."
        : "Your stone is close to the size photographed, so the ring will look much as pictured.";

  return (
    <div className="rounded-[22px] border border-hairline p-5 sm:p-6">
      <p className="text-[13px] text-ink-muted">Your stone against the photographed centre, to scale</p>
      <div className="relative mt-4 h-[200px] [--mm:12px] sm:[--mm:14px]">
        {[
          { size: photographed, lit: false, className: "[&_.glyph-facet]:hidden [&_.glyph-outline]:[stroke-dasharray:3_3] [&_.glyph-outline]:stroke-ink-muted" },
          { size: yours, lit: true, className: "" },
        ].map(({ size, lit, className }, i) => (
          // Long axis vertical, as a stone sits along the finger in most designs.
          <div
            key={i}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{
              width: `calc(var(--mm) * ${size.width.toFixed(2)})`,
              height: `calc(var(--mm) * ${size.length.toFixed(2)})`,
            }}
          >
            <ShapeGlyph
              geometry={geometry}
              frozen={!lit}
              lit={lit}
              viewBox={`${x} ${y} ${w} ${h}`}
              preserveAspectRatio="none"
              className={`h-full w-full overflow-visible ${className}`}
            />
          </div>
        ))}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-hairline pt-4 text-[14px]">
        <div>
          <dt className="flex items-center gap-2 text-[12px] text-ink-muted">
            <span aria-hidden className="h-px w-5 bg-ink" /> Your stone
          </dt>
          <dd className="mt-0.5 tabular-nums">{formatFaceUp(yours)}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-2 text-[12px] text-ink-muted">
            <span aria-hidden className="w-5 border-t border-dashed border-ink-muted" /> Photographed
          </dt>
          <dd className="mt-0.5 tabular-nums">
            {estimated ? "about " : ""}
            {formatFaceUp(photographed)}
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-[13px] text-ink-muted">
        {note} The setting&apos;s head is made to fit your stone.
      </p>
    </div>
  );
}
