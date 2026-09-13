import type { Stone } from "./stones";

/**
 * Contact details come from the environment so the number and address can be
 * changed without a code edit. The fallbacks are obvious placeholders — if a
 * deployment ships with them, it is visibly wrong rather than quietly wrong.
 */
export const SALES_EMAIL = process.env.NEXT_PUBLIC_SALES_EMAIL || "sales@imperialstargems.com";

/** Digits only, including country code. wa.me rejects "+", spaces and dashes. */
export const WHATSAPP_NUMBER = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "910000000000").replace(
  /\D/g,
  "",
);

export const SALES_PHONE = process.env.NEXT_PUBLIC_SALES_PHONE || "+91 00000 00000";

/** "Round, 1.02ct, D/VVS1" — the recap that rides along with every enquiry. */
export function stoneDescriptor(stone: Stone): string {
  return `${stone.shapeName}, ${stone.carat.toFixed(2)}ct, ${stone.color}/${stone.clarity}`;
}

export function enquirySubject(stone: Stone): string {
  return `Enquiry - SKU ${stone.sku}`;
}

export function enquiryBody(stone: Stone): string {
  return `Hi, I'm interested in stone SKU ${stone.sku} (${stoneDescriptor(stone)}). Please share more details.`;
}

export function mailtoHref(stone: Stone): string {
  const params = new URLSearchParams({
    subject: enquirySubject(stone),
    body: enquiryBody(stone),
  });
  // URLSearchParams encodes spaces as "+", which mail clients render literally
  // in a subject line. %20 is correct for a mailto query.
  return `mailto:${SALES_EMAIL}?${params.toString().replace(/\+/g, "%20")}`;
}

export function whatsappHref(stone: Stone): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(enquiryBody(stone))}`;
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
