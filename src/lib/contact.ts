import type { Stone } from "./stones";
import { jewelDescriptor, type JewelSummary } from "./jewelry";

/**
 * The single source of contact details for the whole site — pages, spec sheet
 * PDFs, WhatsApp and mail links all read from here. Held in code rather than
 * the environment so every deployment shows the same numbers without depending
 * on config being set correctly. Change them here and the site follows.
 */
export const SALES_EMAIL = "sales@imperialstargems.com";

/** Digits only, including country code. wa.me rejects "+", spaces and dashes. */
export const WHATSAPP_NUMBER = "918140089896";

export const SALES_PHONE = "+91 81400 89896";

/** Secondary line, shown alongside the primary number. */
export const SALES_PHONE_ALT = "+44 7470 911 557";

/** "Round, 1.02ct, D/VVS1" — the recap that rides along with every enquiry. */
export function stoneDescriptor(stone: Stone): string {
  return `${stone.shapeName}, ${stone.carat.toFixed(2)}ct, ${stone.color}/${stone.clarity}`;
}

/** Anything with a SKU that can be enquired on — a stone or a piece of jewelry. */
type Enquirable = { sku: string; noun: string; descriptor: string };

const asStone = (stone: Stone): Enquirable => ({
  sku: stone.sku,
  noun: "stone",
  descriptor: stoneDescriptor(stone),
});

const asJewel = (jewel: JewelSummary): Enquirable => ({
  sku: jewel.sku,
  noun: "piece",
  descriptor: jewelDescriptor(jewel),
});

function subjectFor(item: Enquirable): string {
  return `Enquiry - SKU ${item.sku}`;
}

function bodyFor(item: Enquirable): string {
  return `Hi, I'm interested in ${item.noun} SKU ${item.sku} (${item.descriptor}). Please share more details.`;
}

function mailtoFor(item: Enquirable): string {
  const params = new URLSearchParams({ subject: subjectFor(item), body: bodyFor(item) });
  // URLSearchParams encodes spaces as "+", which mail clients render literally
  // in a subject line. %20 is correct for a mailto query.
  return `mailto:${SALES_EMAIL}?${params.toString().replace(/\+/g, "%20")}`;
}

function whatsappFor(item: Enquirable): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(bodyFor(item))}`;
}

export function enquirySubject(stone: Stone): string {
  return subjectFor(asStone(stone));
}

export function enquiryBody(stone: Stone): string {
  return bodyFor(asStone(stone));
}

export function mailtoHref(stone: Stone): string {
  return mailtoFor(asStone(stone));
}

export function whatsappHref(stone: Stone): string {
  return whatsappFor(asStone(stone));
}

export function jewelMailtoHref(jewel: JewelSummary): string {
  return mailtoFor(asJewel(jewel));
}

export function jewelWhatsappHref(jewel: JewelSummary): string {
  return whatsappFor(asJewel(jewel));
}

/** General enquiry links, for the header and contact page. */
export function generalWhatsappHref(): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    "Hi, I'd like to enquire about loose diamonds.",
  )}`;
}

export function generalMailtoHref(): string {
  return `mailto:${SALES_EMAIL}?subject=${encodeURIComponent("General enquiry").replace(/\+/g, "%20")}`;
}
