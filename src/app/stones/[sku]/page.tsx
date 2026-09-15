import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StoneModel } from "@/components/stone-model";
import { StoneEnquireButton } from "@/components/stone-enquire-button";
import { SHAPE_BY_SLUG } from "@/lib/shapes";
import { ALL_STONES, findStone, type Stone } from "@/lib/stones";
import { SITE_URL as BASE, originWord, stoneSpecs } from "@/lib/stone-specs";

type Props = { params: Promise<{ sku: string }> };

function stoneFor(sku: string): Stone {
  const stone = findStone(sku);
  if (!stone) notFound();
  return stone;
}

function titleFor(stone: Stone) {
  return `${stone.shapeName} ${stone.carat.toFixed(2)} ct ${originWord(stone)} diamond, ${stone.color}, ${stone.clarity}`;
}

export function generateStaticParams() {
  return ALL_STONES.map((stone) => ({ sku: stone.sku }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const stone = stoneFor((await params).sku);
  return {
    title: titleFor(stone),
    description: `Loose ${originWord(stone)} ${stone.shapeName.toLowerCase()} diamond, ${stone.carat.toFixed(2)} carats, ${stone.color} colour, ${stone.clarity} clarity, graded by ${stone.lab}. SKU ${stone.sku}. Price and report on enquiry.`,
    alternates: { canonical: `/stones/${stone.sku}` },
  };
}

export default async function StonePage({ params }: Props) {
  const stone = stoneFor((await params).sku);
  const shape = SHAPE_BY_SLUG[stone.shape];
  const catalogue = stone.origin === "natural" ? "/natural-diamonds" : "/lab-grown-diamonds";

  const specs = stoneSpecs(stone);

  // No Offer: pricing is enquiry-only by design, and an Offer without a price is invalid.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: titleFor(stone),
    sku: stone.sku,
    url: `${BASE}/stones/${stone.sku}`,
    category: `Loose ${originWord(stone)} diamonds`,
    material: "Diamond",
    description: `${stone.shapeName} ${stone.carat.toFixed(2)} carat ${originWord(stone)} diamond, ${stone.color} colour, ${stone.clarity} clarity, graded by ${stone.lab}.`,
    weight: { "@type": "QuantitativeValue", value: stone.carat, unitCode: "CTM" },
    additionalProperty: specs
      .filter(([label]) => label !== "Carat")
      .map(([name, value]) => ({ "@type": "PropertyValue", name, value })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <section className="mx-auto grid max-w-[1440px] gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1fr_1fr] lg:gap-16">
        <div className="mx-auto w-full max-w-[520px] lg:sticky lg:top-[96px] lg:h-fit">
          <StoneModel
            stone={stone}
            label={`the ${stone.shapeName} ${stone.carat.toFixed(2)} carat diamond`}
          />
        </div>

        <div>
          <Link
            href={`${catalogue}?shape=${stone.shape}`}
            className="text-[13px] text-ink-muted underline underline-offset-4 transition-colors duration-200 hover:text-ink"
          >
            {stone.origin === "natural" ? "Natural" : "Lab-grown"} {shape.name.toLowerCase()} diamonds
          </Link>
          <h1 className="mt-4 font-display text-[clamp(2.2rem,4.8vw,3.6rem)] leading-none">
            {stone.shapeName} {stone.carat.toFixed(2)} ct
          </h1>
          <p className="mt-3 text-ink-muted">
            {stone.color} colour, {stone.clarity} clarity, {originWord(stone)}
          </p>
          <p className="mt-2 text-[13px] tabular-nums text-ink-muted">SKU {stone.sku}</p>

          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-hairline pt-6 sm:grid-cols-3">
            {specs.map(([label, value]) => (
              <div
                key={label}
                className={label === "Measurements" || label === "Certificate" ? "col-span-2" : undefined}
              >
                <dt className="text-[12px] text-ink-muted">{label}</dt>
                <dd className="mt-0.5 text-[15px]">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-10 max-w-[420px]">
            <StoneEnquireButton stone={stone} />
            <p className="mt-3 text-[13px] text-ink-muted">
              Price, availability and the full grading report are confirmed on enquiry.
            </p>
            <a
              href={`/stones/${encodeURIComponent(stone.sku)}/spec-sheet`}
              download
              className="mt-2 inline-block text-[13px] text-ink-muted underline underline-offset-4 transition-colors duration-200 hover:text-ink"
            >
              Download spec sheet (PDF)
            </a>
          </div>

          <p className="mt-10 border-t border-hairline pt-6 text-[14px] text-ink-muted">
            New to the {shape.name.toLowerCase()}?{" "}
            <Link
              href={`/shapes/${shape.slug}`}
              className="underline underline-offset-4 transition-colors duration-200 hover:text-ink"
            >
              What to look for in this shape
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
