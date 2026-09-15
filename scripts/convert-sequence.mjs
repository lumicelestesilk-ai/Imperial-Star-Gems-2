/**
 * Frame-sequence build step.
 *
 * Builds the two independent sequences the site ships:
 *
 *   public/sequence/scroll/         00001.webp – 00700.webp   1600px  scroll-scrubbed hero
 *   public/sequence/scroll-mobile/  every 3rd scroll frame      900px  hero on narrow screens
 *   public/sequence/rotate/         00001.webp – 00NNN.webp     720px  looping 360° turn
 *
 * Inputs:
 *
 *   assets/sequence/raw-700/  the rough -> polished render, 700 PNGs
 *                             (_00000.png – _00699.png, or 00000.png – 00699.png)
 *   assets/sequence/raw-360/  OPTIONAL. The dedicated 360° turntable render,
 *                             expected to be 333 PNGs. When present it is used
 *                             frame for frame.
 *
 * If raw-360 is absent, rotate/ is filled with a stand-in: the finished stone's
 * turn from the end of the 700-frame render, played forward and then back so the
 * loop has no jump. The manifest records which one shipped.
 *
 * Output is numbered from 00001 in every folder, regardless of how the source
 * was numbered. Frames that are empty or fail to decode are dropped before
 * numbering, so there are never gaps; the script reports anything it dropped.
 *
 *   node scripts/convert-sequence.mjs
 */

import { createRequire } from "node:module";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
/** SEQUENCE_SOURCE=wire-700 builds from the wireframe render instead of the photographic one. */
const RAW_SCROLL = path.join(ROOT, "assets", "sequence", process.env.SEQUENCE_SOURCE || "raw-700");
const RAW_ROTATE = path.join(ROOT, "assets", "sequence", "raw-360");
const OUT_DIR = path.join(ROOT, "public", "sequence");
const MANIFEST = path.join(ROOT, "src", "data", "sequence-manifest.json");

/** Frames render on white; flattening onto the porcelain ground keeps the
 *  canvas seamless and drops the weight of an alpha channel. */
const BG = { r: 0xfa, g: 0xfa, b: 0xfa };

const EXPECTED_SCROLL = 700;
const EXPECTED_ROTATE = 333;

/**
 * Stand-in rotation range, as 0-based source indices into raw-700. Checked by
 * eye: the polishing dust has cleared by _00630.png, and from there to the last
 * frame the finished stone turns from a three-quarter view to face up.
 */
const STANDIN_FROM = 630;

/** Folders from earlier builds that are no longer served. */
const RETIRED = ["desktop", "mobile", "spin", "poster.webp"];

const CONCURRENCY = Math.max(4, Math.min(12, os.cpus().length));

const pad = (n) => String(n).padStart(5, "0");

async function pool(items, worker, label) {
  let cursor = 0;
  let done = 0;
  const runners = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      await worker(items[i], i);
      done++;
      if (label && (done % 100 === 0 || done === items.length)) {
        process.stdout.write(`\r    ${label} ${done}/${items.length}`);
      }
    }
  });
  await Promise.all(runners);
  if (label) process.stdout.write("\n");
}

/** Sorted, non-empty, fully decodable PNGs in `dir`, or null if the folder is missing. */
async function usableFrames(dir) {
  let entries;
  try {
    entries = await fsp.readdir(dir);
  } catch {
    return null;
  }

  const candidates = entries
    .filter((f) => /\d{5}\.png$/i.test(f))
    .sort((a, b) => Number(a.match(/(\d{5})\.png$/i)[1]) - Number(b.match(/(\d{5})\.png$/i)[1]))
    .map((f) => path.join(dir, f));

  const ok = new Array(candidates.length).fill(false);
  const dropped = [];
  await pool(candidates, async (file, i) => {
    if ((await fsp.stat(file)).size === 0) {
      dropped.push(`${path.basename(file)} (empty)`);
      return;
    }
    try {
      // A full decode — a header read will not catch a truncated PNG.
      await sharp(file).resize({ width: 32 }).raw().toBuffer();
      ok[i] = true;
    } catch {
      dropped.push(`${path.basename(file)} (undecodable)`);
    }
  });

  if (dropped.length) console.log(`    dropped ${dropped.length}: ${dropped.sort().join(", ")}`);
  return candidates.filter((_, i) => ok[i]);
}

/** Encodes `sources` in order into `tier`/00001.webp, 00002.webp, … */
async function writeTier(tier, sources, width, quality) {
  const outDir = path.join(OUT_DIR, tier);
  await fsp.rm(outDir, { recursive: true, force: true });
  await fsp.mkdir(outDir, { recursive: true });

  const jobs = sources.map((src, i) => ({ src, dest: path.join(outDir, `${pad(i + 1)}.webp`) }));
  await pool(
    jobs,
    ({ src, dest }) =>
      sharp(src)
        .flatten({ background: BG })
        .resize({ width, withoutEnlargement: true })
        .webp({ quality, effort: 5 })
        .toFile(dest),
    tier,
  );

  let bytes = 0;
  for (const { dest } of jobs) bytes += (await fsp.stat(dest)).size;
  console.log(
    `    ${tier}: ${jobs.length} frames, ${pad(1)}.webp – ${pad(jobs.length)}.webp, ` +
      `${(bytes / 1024 / 1024).toFixed(1)} MB`,
  );
  return { frames: jobs.length, width };
}

async function main() {
  console.log(`\n  scroll source: ${path.relative(ROOT, RAW_SCROLL)}`);
  const scroll = await usableFrames(RAW_SCROLL);
  if (!scroll?.length) {
    console.error(`  No frames in ${RAW_SCROLL}. Download the 700-frame render there first.\n`);
    process.exit(1);
  }
  console.log(`    ${scroll.length} usable frames`);
  if (scroll.length !== EXPECTED_SCROLL) {
    console.warn(`    WARNING: expected ${EXPECTED_SCROLL}, found ${scroll.length}`);
  }

  console.log(`\n  rotate source: ${path.relative(ROOT, RAW_ROTATE)}`);
  let rotate = await usableFrames(RAW_ROTATE);
  let rotateSource;
  if (rotate?.length) {
    rotateSource = "raw-360";
    console.log(`    ${rotate.length} usable frames`);
    if (rotate.length !== EXPECTED_ROTATE) {
      console.warn(`    WARNING: expected ${EXPECTED_ROTATE}, found ${rotate.length}`);
    }
  } else {
    // Forward through the finished stone's turn, then back, skipping both end
    // frames on the return so no frame shows twice at the loop point.
    const forward = scroll.slice(STANDIN_FROM);
    const back = forward.slice(1, -1).reverse();
    rotate = [...forward, ...back];
    rotateSource = `stand-in: ${path.basename(RAW_SCROLL)} frames ${STANDIN_FROM}-${scroll.length - 1}, forward then back`;
    console.log(`    not found — using ${rotateSource} (${rotate.length} frames)`);
  }

  await fsp.mkdir(OUT_DIR, { recursive: true });
  for (const name of RETIRED) {
    await fsp.rm(path.join(OUT_DIR, name), { recursive: true, force: true });
  }

  console.log("\n  encoding");
  const tiers = {
    scroll: await writeTier("scroll", scroll, 1600, 76),
    "scroll-mobile": await writeTier(
      "scroll-mobile",
      scroll.filter((_, i) => i % 3 === 0),
      900,
      72,
    ),
    rotate: { ...(await writeTier("rotate", rotate, 720, 78)), source: rotateSource },
  };

  const manifest = { generatedAt: new Date().toISOString(), tiers };
  await fsp.mkdir(path.dirname(MANIFEST), { recursive: true });
  await fsp.writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`\n  manifest: ${path.relative(ROOT, MANIFEST)}\n`);
}

await main();
