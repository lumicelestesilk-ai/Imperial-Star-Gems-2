import { PdfDocument, fit, textWidth, wrap, type Rgb } from "./pdf";
import { SALES_EMAIL, SALES_PHONE, WHATSAPP_NUMBER } from "./contact";
import { SITE_URL, originWord, stoneSpecs } from "./stone-specs";
import {
  INVENTORY_NOTICE,
  type CutGrade,
  type Fluorescence,
  type Origin,
  type Stone,
} from "./stones";

/**
 * Printable spec sheets for trade buyers who review offline or forward a
 * shortlist internally. There is no price column: pricing is enquiry-only by
 * design, so each sheet says so and every row links back to its stone.
 */

const INK: Rgb = [0.1, 0.1, 0.11];
const MUTED: Rgb = [0.42, 0.42, 0.45];
const HAIRLINE: Rgb = [0.84, 0.84, 0.86];
const ZEBRA: Rgb = [0.965, 0.965, 0.97];

const BRAND = "IMPERIAL STAR GEMS";
const AUTHOR = "Imperial Star Gems";
const PRICE_NOTE = "Prices on enquiry — quote the SKU.";

/** Standard trade abbreviations, so thirteen columns fit across A4 landscape. */
const CUT_ABBR: Record<CutGrade, string> = {
  Ideal: "ID",
  Excellent: "EX",
  "Very Good": "VG",
  Good: "G",
  Fair: "F",
};
const FLUOR_ABBR: Record<Fluorescence, string> = {
  None: "NON",
  Faint: "FNT",
  "Very Slight": "VSL",
  Slight: "SLT",
  Medium: "MED",
  Strong: "STG",
};

function preparedLine(date: Date) {
  const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });
  return `Prepared ${day.format(date)}`;
}

function stoneUrl(stone: Stone) {
  return `${SITE_URL}/stones/${encodeURIComponent(stone.sku)}`;
}

type Column = { label: string; width: number; align?: "right"; value: (s: Stone) => string };

const COLUMNS: Column[] = [
  { label: "SKU", width: 108, value: (s) => s.sku },
  { label: "Shape", width: 100, value: (s) => s.shapeName },
  { label: "Carat", width: 38, align: "right", value: (s) => s.carat.toFixed(2) },
  { label: "Colour", width: 130, value: (s) => s.color },
  { label: "Clarity", width: 42, value: (s) => s.clarity },
  { label: "Cut", width: 30, value: (s) => (s.cut ? CUT_ABBR[s.cut] : "–") },
  { label: "Pol", width: 30, value: (s) => CUT_ABBR[s.polish] },
  { label: "Sym", width: 30, value: (s) => CUT_ABBR[s.symmetry] },
  { label: "Fluor", width: 34, value: (s) => FLUOR_ABBR[s.fluorescence] },
  { label: "Lab", width: 30, value: (s) => s.lab },
  { label: "Measurements (mm)", width: 128, value: (s) => s.measurements.replace(/\s*mm$/, "") },
  { label: "Table", width: 34, align: "right", value: (s) => `${s.tablePercent}%` },
  { label: "Depth", width: 36, align: "right", value: (s) => `${s.depthPercent}%` },
];

export function renderCatalogueSheet({
  stones,
  origin,
  summary,
  preparedAt,
}: {
  stones: Stone[];
  origin: Origin;
  summary: string;
  preparedAt: Date;
}): Buffer {
  const W = 842;
  const H = 595;
  const M = 36;
  const ROW = 14;
  const TOP = 124;
  const ROWS_PER_PAGE = 30;
  const PAD = 4;

  const doc = new PdfDocument(W, H);
  const originName = origin === "natural" ? "Natural" : "Lab-grown";
  const pageCount = Math.max(1, Math.ceil(stones.length / ROWS_PER_PAGE));
  const count = `${stones.length} ${stones.length === 1 ? "stone" : "stones"}`;

  for (let p = 0; p < pageCount; p++) {
    doc.addPage();

    // Every page carries the full header, so a single printed page still stands alone.
    doc.text(M, 50, BRAND, { size: 13, font: "bold", color: INK });
    doc.text(W - M, 50, preparedLine(preparedAt), { size: 8, color: MUTED, align: "right" });
    doc.text(M, 67, `${originName} diamonds  •  Trade spec sheet`, { size: 10, color: INK });
    doc.text(W - M, 67, `${count}  •  Page ${p + 1} of ${pageCount}`, {
      size: 8,
      color: MUTED,
      align: "right",
    });
    doc.text(M, 82, fit(summary, W - 2 * M, 8), { size: 8, color: MUTED });
    doc.text(M, 94, `${INVENTORY_NOTICE} ${PRICE_NOTE}`, { size: 8, color: MUTED });

    doc.rule(M, 104, W - M, 104, HAIRLINE);
    let x = M;
    for (const col of COLUMNS) {
      const at = col.align === "right" ? x + col.width - PAD : x + PAD;
      doc.text(at, 116, col.label, { size: 7, font: "bold", color: MUTED, align: col.align });
      x += col.width;
    }
    doc.rule(M, 121, W - M, 121, HAIRLINE);

    const rows = stones.slice(p * ROWS_PER_PAGE, (p + 1) * ROWS_PER_PAGE);
    if (rows.length === 0) {
      doc.text(M + PAD, TOP + 14, "No stones match these filters. We also source to order — tell us the specification.", {
        size: 9,
        color: INK,
      });
    }
    rows.forEach((stone, i) => {
      const top = TOP + i * ROW;
      if (i % 2 === 1) doc.fill(M, top, W - 2 * M, ROW, ZEBRA);
      let cx = M;
      for (const col of COLUMNS) {
        const value = fit(col.value(stone), col.width - 2 * PAD, 7.5);
        const at = col.align === "right" ? cx + col.width - PAD : cx + PAD;
        doc.text(at, top + 9.5, value, { size: 7.5, color: INK, align: col.align });
        cx += col.width;
      }
      doc.link(M, top, W - 2 * M, ROW, stoneUrl(stone));
    });

    doc.rule(M, 552, W - M, 552, HAIRLINE);
    doc.text(
      M,
      564,
      "Cut / Pol / Sym: ID Ideal, EX Excellent, VG Very Good, G Good, F Fair. Cut is graded on round brilliants only.",
      { size: 6.5, color: MUTED },
    );
    doc.text(
      M,
      573,
      "Fluor: NON None, FNT Faint, VSL Very Slight, SLT Slight, MED Medium, STG Strong. Each row links to the stone online.",
      { size: 6.5, color: MUTED },
    );
    doc.text(W - M, 564, `${SALES_EMAIL}  •  ${SALES_PHONE}  •  WhatsApp +${WHATSAPP_NUMBER}`, {
      size: 7.5,
      color: INK,
      align: "right",
    });
    doc.text(W - M, 573, SITE_URL.replace(/^https:\/\//, ""), {
      size: 6.5,
      color: MUTED,
      align: "right",
    });
  }

  return doc.toBuffer({ title: `${AUTHOR} — ${originName} diamonds spec sheet`, author: AUTHOR });
}

export function renderStoneSheet(stone: Stone, preparedAt: Date): Buffer {
  const W = 595;
  const H = 842;
  const M = 48;
  const VALUE_X = M + 150;

  const doc = new PdfDocument(W, H);
  doc.addPage();

  doc.text(M, 60, BRAND, { size: 13, font: "bold", color: INK });
  doc.text(W - M, 60, preparedLine(preparedAt), { size: 8, color: MUTED, align: "right" });
  doc.text(M, 76, "Trade spec sheet", { size: 9, color: MUTED });
  doc.rule(M, 90, W - M, 90, HAIRLINE);

  doc.text(M, 138, `${stone.shapeName} ${stone.carat.toFixed(2)} ct`, {
    size: 26,
    font: "bold",
    color: INK,
  });
  doc.text(
    M,
    160,
    fit(`${stone.color} colour, ${stone.clarity} clarity, ${originWord(stone)}`, W - 2 * M, 11),
    { size: 11, color: INK },
  );
  doc.text(M, 177, `SKU ${stone.sku}`, { size: 9, color: MUTED });

  let y = 210;
  for (const [label, value] of stoneSpecs(stone)) {
    doc.text(M, y, label, { size: 9, color: MUTED });
    doc.text(VALUE_X, y, fit(value, W - M - VALUE_X, 11), { size: 11, color: INK });
    doc.rule(M, y + 9, W - M, y + 9, HAIRLINE);
    y += 24;
  }

  y += 22;
  const note = `Price, availability and the full grading report are confirmed on enquiry. Quote SKU ${stone.sku}.`;
  for (const line of wrap(note, W - 2 * M, 10)) {
    doc.text(M, y, line, { size: 10, color: INK });
    y += 14;
  }

  y += 6;
  const url = stoneUrl(stone);
  const lead = "View online  ";
  const urlX = M + textWidth(lead, 9);
  doc.text(M, y, lead, { size: 9, color: MUTED });
  doc.text(urlX, y, url, { size: 9, color: INK });
  doc.link(urlX, y - 9, textWidth(url, 9), 12, url);

  y += 40;
  doc.text(M, y, "Sales", { size: 10, font: "bold", color: INK });
  for (const line of [SALES_EMAIL, SALES_PHONE, `WhatsApp +${WHATSAPP_NUMBER}`]) {
    y += 15;
    doc.text(M, y, line, { size: 10, color: INK });
  }

  doc.rule(M, H - 60, W - M, H - 60, HAIRLINE);
  doc.text(M, H - 46, INVENTORY_NOTICE, { size: 8, color: MUTED });

  return doc.toBuffer({
    title: `${AUTHOR} — ${stone.shapeName} ${stone.carat.toFixed(2)} ct, SKU ${stone.sku}`,
    author: AUTHOR,
  });
}

export function pdfResponse(pdf: Buffer, stem: string, preparedAt: Date): Response {
  const safe = stem.replace(/[^A-Za-z0-9-]/g, "");
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safe}-${preparedAt.toISOString().slice(0, 10)}.pdf"`,
      "Cache-Control": "public, max-age=3600",
      // The HTML catalogue is the indexable version; the PDFs would only compete with it.
      "X-Robots-Tag": "noindex",
    },
  });
}
