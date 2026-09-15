import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShapeGlyph } from "@/components/shape-glyph";
import { CaratSizeChart } from "@/components/carat-size-chart";
import { SHAPES, type Shape } from "@/lib/shapes";
import { LAB_STONES, NATURAL_STONES, countByShape } from "@/lib/stones";

type Props = { params: Promise<{ slug: string }> };

function shapeFor(slug: string): Shape {
  const shape = SHAPES.find((s) => s.slug === slug);
  if (!shape) notFound();
  return shape;
}

export function generateStaticParams() {
  return SHAPES.map((shape) => ({ slug: shape.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const shape = shapeFor((await params).slug);
  return {
    title: `${shape.name} cut diamonds`,
    description: `${shape.summary} What the ${shape.name.toLowerCase()} asks of the cutter, what to look for when buying, and natural and lab-grown stock in this shape.`,
    alternates: { canonical: `/shapes/${shape.slug}` },
  };
}

export default async function ShapePage({ params }: Props) {
  const shape = shapeFor((await params).slug);
  const index = SHAPES.indexOf(shape);
  const prev = SHAPES[(index - 1 + SHAPES.length) % SHAPES.length];
  const next = SHAPES[(index + 1) % SHAPES.length];
  const natural = countByShape(NATURAL_STONES)[shape.slug] ?? 0;
  const lab = countByShape(LAB_STONES)[shape.slug] ?? 0;

  return (
    <>
      <section className="border-b border-hairline">
        <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1fr_320px] lg:items-center lg:gap-16">
          <div>
            <Link
              href="/shapes"
              className="text-[13px] text-ink-muted underline underline-offset-4 transition-colors duration-200 hover:text-ink"
            >
              All shapes
            </Link>
            <h1 className="mt-4 font-display text-[clamp(2.4rem,5.6vw,4.2rem)] leading-none">
              {shape.name}
            </h1>
            <p className="measure mt-5 text-ink-muted">{shape.summary}</p>
          </div>
          <div className="flex justify-center rounded-[36px] bg-panel py-14">
            <ShapeGlyph geometry={shape.geometry} className="glyph-auto h-40 w-40" strokeWidth={1} />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1440px] gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1fr_320px] lg:gap-16">
        <div>
          <h2 className="font-display text-[clamp(1.7rem,3.4vw,2.4rem)]">Its character</h2>
          <p className="measure mt-4 text-ink-muted">{shape.note}</p>

          <h2 className="mt-12 font-display text-[clamp(1.7rem,3.4vw,2.4rem)]">
            What to look for
          </h2>
          <p className="measure mt-4 text-ink-muted">{shape.character}</p>

          <h2 className="mt-12 font-display text-[clamp(1.7rem,3.4vw,2.4rem)]">
            {shape.name} size by carat weight
          </h2>
          <p className="measure mt-4 text-ink-muted">
            Approximate face-up size at a typical {shape.name.toLowerCase()} ratio and depth,
            drawn to scale. Select a weight to see natural stock in that band.
          </p>
          <div className="mt-6">
            <CaratSizeChart shapes={[shape.slug]} rowHeadings={false} />
          </div>
          <p className="mt-4 text-[14px] text-ink-muted">
            <Link
              href="/carat-guide"
              className="underline underline-offset-4 transition-colors duration-200 hover:text-ink"
            >
              Diamond carat guide: every shape, price milestones and choosing a weight
            </Link>
          </p>
        </div>

        <aside className="lg:sticky lg:top-[96px] lg:h-fit">
          <dl className="grid grid-cols-3 gap-x-6 gap-y-4 border-t border-hairline pt-5 lg:grid-cols-1">
            <div>
              <dt className="text-[12px] text-ink-muted">Facet family</dt>
              <dd className="mt-0.5 text-[15px]">{shape.cutFamily}</dd>
            </div>
            <div>
              <dt className="text-[12px] text-ink-muted">Typical ratio</dt>
              <dd className="mt-0.5 text-[15px] tabular-nums">{shape.ratio}</dd>
            </div>
            <div>
              <dt className="text-[12px] text-ink-muted">SKU code</dt>
              <dd className="mt-0.5 text-[15px]">{shape.code}</dd>
            </div>
          </dl>

          <div className="mt-8 flex flex-col gap-3">
            <Link
              href={`/natural-diamonds?shape=${shape.slug}`}
              className="rounded-full border border-ink px-6 py-2.5 text-center text-[14px] transition-colors duration-200 hover:bg-ink hover:text-white"
            >
              Natural in this shape <span className="tabular-nums">({natural})</span>
            </Link>
            <Link
              href={`/lab-grown-diamonds?shape=${shape.slug}`}
              className="rounded-full border border-hairline px-6 py-2.5 text-center text-[14px] transition-colors duration-200 hover:border-ink"
            >
              Lab-grown in this shape <span className="tabular-nums">({lab})</span>
            </Link>
          </div>
        </aside>
      </section>

      <nav
        aria-label="Other shapes"
        className="mx-auto flex max-w-[1440px] justify-between gap-6 border-t border-hairline px-5 py-10 sm:px-8"
      >
        {[
          { label: "Previous", shape: prev },
          { label: "Next", shape: next },
        ].map(({ label, shape: s }) => (
          <Link
            key={label}
            href={`/shapes/${s.slug}`}
            className={`group flex items-center gap-4 ${label === "Next" ? "flex-row-reverse text-right" : ""}`}
          >
            <ShapeGlyph geometry={s.geometry} frozen className="glyph-auto h-10 w-10 shrink-0" />
            <span>
              <span className="block text-[12px] text-ink-muted">{label}</span>
              <span className="block font-display text-[20px] leading-tight">{s.name}</span>
            </span>
          </Link>
        ))}
      </nav>
    </>
  );
}
