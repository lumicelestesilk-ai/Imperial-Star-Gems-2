import type { JewelSummary } from "@/lib/jewelry";

/**
 * Marks a product image as something the Carat Guesser can ask about, and
 * carries the answer.
 *
 * Only pieces with a centre stone qualify, because the centre stone's weight is
 * the one figure the card doesn't already print — the total carat is right
 * there in the specification grid, and a quiz whose answer is two inches below
 * the question is not a quiz. Pieces over five carats are skipped too: the
 * slider stops there, and an unanswerable question is worse than none.
 *
 * A weight is not a price. Nothing here exposes anything the page wasn't
 * already willing to tell the visitor on the product's own page.
 */
export function caratAttributes(jewel: Pick<JewelSummary, "centerCarat" | "name">) {
  const carat = jewel.centerCarat;
  if (carat === undefined || carat < 0.25 || carat > 5) return {};
  return {
    "data-easter-egg": "product",
    "data-carat": carat.toFixed(2),
    "data-piece": jewel.name,
  };
}
