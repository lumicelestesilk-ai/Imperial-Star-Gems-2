import type { Stone } from "./stones";

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
