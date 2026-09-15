import { describeFilters, filterStones, filtersFromParams } from "@/lib/catalog-filter";
import { pdfResponse, renderCatalogueSheet } from "@/lib/spec-sheet";
import { caratBounds, stonesFor } from "@/lib/stones";

export const runtime = "nodejs";

/** GET /spec-sheet/natural or /spec-sheet/lab-grown, with the catalogue's filters as query params. */
export async function GET(request: Request, { params }: { params: Promise<{ origin: string }> }) {
  const { origin: slug } = await params;
  const origin = slug === "natural" ? "natural" : slug === "lab-grown" ? "lab" : undefined;
  if (!origin) return new Response("Not found", { status: 404 });

  const all = stonesFor(origin);
  const bounds = caratBounds(all);
  const { filters, sort } = filtersFromParams(new URL(request.url).searchParams, bounds);
  const preparedAt = new Date();

  const pdf = renderCatalogueSheet({
    stones: filterStones(all, filters, sort),
    origin,
    summary: describeFilters(filters, sort, bounds),
    preparedAt,
  });
  return pdfResponse(pdf, `imperial-star-gems-${slug}`, preparedAt);
}
