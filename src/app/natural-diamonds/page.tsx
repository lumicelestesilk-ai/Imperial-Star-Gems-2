import type { Metadata } from "next";
import { Catalog } from "@/components/catalog";
import { toQueryString } from "@/lib/catalog-filter";
import { INVENTORY_NOTICE, NATURAL_STONES } from "@/lib/stones";

export const metadata: Metadata = {
  title: "Natural loose diamonds",
  description:
    "Loose natural diamonds in every standard shape, graded by independent laboratory. Filter by shape, carat, colour, clarity, cut, polish, symmetry, fluorescence, proportions and certificate, then enquire on any stone.",
};

export default async function NaturalDiamondsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const initialQuery = toQueryString(await searchParams);

  return (
    <>
      <section className="border-b border-hairline">
        <div className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 sm:py-20">
          <h1 className="max-w-[880px] font-display text-[clamp(2.4rem,5.6vw,4.2rem)]">
            Natural loose diamonds
          </h1>
          <p className="measure mt-5 text-ink-muted">
            Stones selected individually rather than bought as parcels, each one graded by an
            independent laboratory before it reaches this list. Filter down to the specification
            you need and enquire — we will send the report, images and availability.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 sm:py-16">
        <Catalog
          stones={NATURAL_STONES}
          origin="natural"
          initialQuery={initialQuery}
          notice={INVENTORY_NOTICE}
        />
      </section>
    </>
  );
}
