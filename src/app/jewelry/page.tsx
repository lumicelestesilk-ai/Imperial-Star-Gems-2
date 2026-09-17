import type { Metadata } from "next";
import { JewelryCatalog } from "@/components/jewelry-catalog";
import { toQueryString } from "@/lib/catalog-filter";
import { JEWELRY_SUMMARIES } from "@/lib/real-jewelry";
import { INVENTORY_NOTICE } from "@/lib/stones";

export const metadata: Metadata = {
  title: "Diamond jewelry",
  description:
    "Diamond rings, earrings, bracelets and necklaces in 9K to 18K yellow, white and rose gold. Filter by type, shape, carat, centre stone, metal and purity, then enquire on any piece.",
  alternates: { canonical: "/jewelry" },
};

export default async function JewelryPage({
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
            Diamond jewelry
          </h1>
          <p className="measure mt-5 text-ink-muted">
            Rings, earrings, bracelets and necklaces, each set with matched diamonds and made to
            order in solid gold. Filter down to the piece you need and enquire — we will send
            photographs, the certificate and a quote in the metal and purity you choose.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 sm:py-16">
        <JewelryCatalog
          items={JEWELRY_SUMMARIES}
          initialQuery={initialQuery}
          notice={INVENTORY_NOTICE}
        />
      </section>
    </>
  );
}
