/**
 * Frame-sequence build step.
 *
 * Reads the raw PNG turntable (rough crystal -> polished, graded stone) out of
 * assets/sequence/raw and writes the tiers the site actually ships:
 *
 *   public/sequence/desktop/  1600px, every valid frame      (hero, wide screens)
 *   public/sequence/mobile/    900px, every 3rd frame        (hero, small screens)
 *   public/sequence/spin/      640px, polished tail only     (drag-to-rotate viewer)
 *   public/sequence/poster.webp  final frame, static hero for prefers-reduced-motion
 *
 * The raw set has gaps: four indices were never published and four more are
 * zero-byte. Both are dropped and the survivors are renumbered contiguously from
 * 00000, so the player can map scroll progress straight onto an index with no
 * lookup table and no missing-image requests.
 *
 * Writes src/data/sequence-manifest.json so the app knows each tier's exact
 * frame count at build time rather than probing for it at runtime.
 *
 *   node scripts/convert-sequence.mjs [rawDir]
 */

import { createRequire } from "node:module";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RAW_DIR = path.resolve(ROOT, process.argv[2] ?? "assets/sequence/raw");
const OUT_DIR = path.join(ROOT, "public", "sequence");
const MANIFEST = path.join(ROOT, "src", "data", "sequence-manifest.json");

/** Page background. Frames render on white, so flattening onto the porcelain
 *  ground keeps the canvas seamless and drops the alpha channel's weight. */
const BG = { r: 0xfa, g: 0xfa, b: 0xfa };

const TIERS = [
  { name: "desktop", width: 1600, step: 1, quality: 76, range: null },
  { name: "mobile", width: 900, step: 3, quality: 72, range: null },
  // Tail of the sequence: the finished stone turning. Used by the product
  // drag-to-rotate preview, which never needs the rough or cutting stages.
  { name: "spin", width: 640, step: 1, quality: 78, range: [0.86, 1] },
];

const CONCURRENCY = Math.max(4, Math.min(12, (await import("node:os")).cpus().length));

function pad(n) {
  return String(n).padStart(5, "0");
}

/**
 * Frames that exist, are non-empty, and decode cleanly, in sequence order.
 *
 * The published set is not uniformly healthy: some entries are zero-byte and
 * others are truncated part-way through the PNG data stream, which only
 * surfaces on decode. Both are dropped here rather than during encoding, so
 * that the renumbering below stays contiguous.
 */
async function collectSourceFrames() {
  let entries;
  try {
    entries = await fsp.readdir(RAW_DIR);
  } catch {
    console.error(
      `\n  No raw frames at ${RAW_DIR}\n` +
        `  Download the PNG sequence into that folder first, then re-run.\n`,
    );
    process.exit(1);
  }

  const candidates = entries
    .filter((f) => /^\d{5}\.png$/i.test(f))
    .sort()
    .map((f) => path.join(RAW_DIR, f));

  const empty = [];
  const corrupt = [];
  const verdicts = new Array(candidates.length).fill(false);

  await pool(candidates, async (file, i) => {
    if ((await fsp.stat(file)).size === 0) {
      empty.push(path.basename(file));
      return;
    }
    try {
      // Force a full decode — a header-only read will not catch truncation.
      await sharp(file).resize({ width: 32 }).raw().toBuffer();
      verdicts[i] = true;
    } catch {
      corrupt.push(path.basename(file));
    }
  });

  if (empty.length) {
    console.log(`    dropped ${empty.length} empty: ${empty.join(", ")}`);
  }
  if (corrupt.length) {
    console.log(`    dropped ${corrupt.length} undecodable: ${corrupt.join(", ")}`);
  }
  return candidates.filter((_, i) => verdicts[i]);
}

/** Runs `task` over `items` with a bounded worker pool. */
async function pool(items, worker) {
  let cursor = 0;
  let done = 0;
  const total = items.length;
  const runners = Array.from({ length: Math.min(CONCURRENCY, total) }, async () => {
    while (cursor < total) {
      const index = cursor++;
      await worker(items[index], index);
      done++;
      if (done % 100 === 0 || done === total) {
        process.stdout.write(`\r    ${done}/${total} frames`);
      }
    }
  });
  await Promise.all(runners);
  process.stdout.write("\n");
}

async function buildTier(tier, sources) {
  const outDir = path.join(OUT_DIR, tier.name);
  await fsp.rm(outDir, { recursive: true, force: true });
  await fsp.mkdir(outDir, { recursive: true });

  let pick = sources;
  if (tier.range) {
    const [from, to] = tier.range;
    pick = sources.slice(Math.floor(sources.length * from), Math.ceil(sources.length * to));
  }
  if (tier.step > 1) {
    pick = pick.filter((_, i) => i % tier.step === 0);
  }

  console.log(`\n  ${tier.name}: ${pick.length} frames at ${tier.width}px`);

  const jobs = pick.map((src, i) => ({ src, dest: path.join(outDir, `${pad(i)}.webp`) }));
  await pool(jobs, async ({ src, dest }) => {
    await sharp(src)
      .flatten({ background: BG })
      .resize({ width: tier.width, withoutEnlargement: true })
      .webp({ quality: tier.quality, effort: 5 })
      .toFile(dest);
  });

  let bytes = 0;
  for (const { dest } of jobs) bytes += (await fsp.stat(dest)).size;
  const mb = bytes / 1024 / 1024;
  console.log(
    `    ${mb.toFixed(1)} MB total, ${(bytes / jobs.length / 1024).toFixed(0)} KB average`,
  );

  return { frames: jobs.length, width: tier.width, bytes };
}

async function main() {
  console.log("\n  validating source frames");
  const sources = await collectSourceFrames();
  if (!sources.length) {
    console.error("  No usable frames found.");
    process.exit(1);
  }
  console.log(`\n  ${sources.length} usable source frames in ${RAW_DIR}`);

  await fsp.mkdir(OUT_DIR, { recursive: true });

  const manifest = { generatedAt: new Date().toISOString(), source: sources.length, tiers: {} };
  for (const tier of TIERS) {
    const result = await buildTier(tier, sources);
    manifest.tiers[tier.name] = { frames: result.frames, width: result.width };
  }

  // Static hero for prefers-reduced-motion, and the LCP image for the page.
  await sharp(sources[sources.length - 1])
    .flatten({ background: BG })
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 82, effort: 6 })
    .toFile(path.join(OUT_DIR, "poster.webp"));
  console.log("\n  poster.webp written (final polished frame)");

  await fsp.mkdir(path.dirname(MANIFEST), { recursive: true });
  await fsp.writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`  manifest written to ${path.relative(ROOT, MANIFEST)}\n`);

  const totalMb = Object.values(manifest.tiers).length
    ? fs
        .readdirSync(OUT_DIR)
        .filter((d) => fs.statSync(path.join(OUT_DIR, d)).isDirectory())
        .reduce((sum, d) => {
          const dir = path.join(OUT_DIR, d);
          return (
            sum +
            fs.readdirSync(dir).reduce((s, f) => s + fs.statSync(path.join(dir, f)).size, 0)
          );
        }, 0) /
      1024 /
      1024
    : 0;
  console.log(`  done — ${totalMb.toFixed(1)} MB in public/sequence\n`);
}

await main();
