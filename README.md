# Imperial Star Gems

A multi-page storefront for loose natural and lab-grown diamonds. There is no cart
and no price anywhere on the site — every stone ends in an enquiry.

Next.js 16 (App Router) · TypeScript · Tailwind v4 · GSAP ScrollTrigger · Framer Motion

---

## Quick start

```bash
npm install
cp .env.example .env.local     # fill in the contact details
npm run dev                    # http://localhost:3000
```

The converted frame sequence is already committed under `public/sequence`, so the
app runs without re-running the conversion step.

Other scripts:

| Command | What it does |
|---|---|
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run sequence:convert` | Rebuilds `public/sequence` from the raw PNGs |

---

## The frame sequence

The hero is a scroll-scrubbed turntable of a single stone going from rough crystal
to finished, graded diamond.

### Where the frames came from

Pulled once from `github.com/Murali2011/update-sequence` into
`assets/sequence/raw/` (gitignored, ~165 MB). **The live site never references
GitHub** — not in development and not in production. That repo is a build input
only.

The published set is not clean, and the conversion script handles it:

- Indices `677`, `683`, `689`, `695` were never published.
- `00229`, `00488`, `00506`, `00645` are zero-byte.
- Four more are truncated part-way through the PNG stream and only fail on decode.

That leaves **689 good frames out of 701 slots**. They are renumbered contiguously
from `00000`, so scroll progress maps straight onto a frame index with no lookup
table and no requests for missing files. A handful of dropped frames is invisible
at scrub speed.

### What gets built

`npm run sequence:convert` reads `assets/sequence/raw/` and writes:

| Tier | Frames | Width | Size | Used by |
|---|---|---|---|---|
| `desktop` | 689 | 1600px | 10.4 MB | Hero, screens above 900px |
| `mobile` | 230 (every 3rd) | 900px | 2.4 MB | Hero, screens 900px and under |
| `spin` | 97 (polished tail) | 640px | 1.1 MB | Drag-to-rotate product preview |
| `poster.webp` | 1 | 1600px | 18 KB | `prefers-reduced-motion` hero |

165 MB of PNG becomes **13.9 MB of WebP**, averaging 15 KB a frame. Frames are
flattened onto the porcelain background (`#FAFAFA`) rather than keeping an alpha
channel — they render on that ground everywhere, so the alpha was pure weight.

### Serving from a CDN

For production, upload `public/sequence/` to an asset CDN (Cloudflare R2, Bunny,
Vercel Blob, S3+CloudFront) and set:

```
NEXT_PUBLIC_SEQUENCE_BASE_URL=https://cdn.imperialstargems.com/sequence
```

Everything resolves through `frameUrl()` in [`src/lib/sequence.ts`](src/lib/sequence.ts),
so that one variable moves the whole sequence. Unset, it falls back to the local
`/sequence` folder. `next.config.ts` sets a one-year immutable cache header on
that path — frames are addressed by index and never mutate in place, so a new
render means a new folder.

### How the player works

[`src/components/hero-sequence.tsx`](src/components/hero-sequence.tsx)

- A `<canvas>` draws one frame at a time. GSAP ScrollTrigger pins the hero and
  scrubs across six further viewport heights (seven in total).
- Scroll progress maps to `Math.round(progress * (count - 1))`, and `drawImage`
  runs **only when that index actually changes** — scroll fires far more often
  than the sequence advances.
- Frames load in batches of 48 across 8 lanes, started by an `IntersectionObserver`
  300px ahead of the hero. Frame 0 loads first and draws immediately behind a soft
  shimmer; the rest stream in.
- Scrubbing faster than the loader holds the nearest loaded frame instead of
  flashing empty, and the frame under the playhead always jumps the queue.
- GSAP is loaded with a dynamic `import()` inside the effect, so it is not in the
  bundle for any route that does not use it.
- `prefers-reduced-motion` replaces the whole mechanism with the static polished
  frame — no canvas, no ScrollTrigger, no scroll hijacking.

Five narrative captions cross-fade beside the canvas, keyed to progress fractions
rather than frame numbers so they stay correct if the frame count changes.

---

## Design system

Tokens live in [`src/app/globals.css`](src/app/globals.css) under `@theme`.
Tailwind's default palette is **cleared wholesale** (`--color-*: initial`) so a
stray `text-gray-500` fails loudly instead of quietly going off-brand.

| Token | Hex | Use |
|---|---|---|
| `porcelain` | `#FAFAFA` | Page background |
| `panel` | `#EFEDEA` | Alternating section bands |
| `ink` | `#17181B` | Primary text |
| `ink-muted` | `#6E6D69` | Secondary text **on porcelain only** |
| `ink-muted-panel` | `#63625E` | Secondary text on panel bands |
| `hairline` | `#D8D6D1` | Borders, dividers |
| `metal` | `#B9B6AE` | Icon strokes and rules — **never text** |
| `facet` | `#DCEAF0` | Hover and active states only |

### Contrast

Checked rather than assumed, because a white-on-white palette will not forgive it:

```
ink             on porcelain   17.1 : 1   pass
ink             on panel       15.2 : 1   pass
ink-muted       on porcelain    4.96: 1   pass
ink-muted       on panel        4.43: 1   FAILS AA
ink-muted-panel on panel        5.23: 1   pass
metal           on porcelain    1.94: 1   decoration only
```

`--ink-muted` at the briefed `#6E6D69` clears AA on porcelain but lands just under
it on the panel ground, so `--ink-muted-panel` exists for panel sections. `--metal`
is a stroke colour only; every label a user has to read uses an ink token.

### Type and shape

- Display: **Instrument Serif** (high-contrast editorial serif, in the spirit of
  Canela / Reckless). Body: **DM Sans**. Both via `next/font`, self-hosted at build
  time — the build needs network access for the initial font fetch.
- Body copy is capped by a `measure` utility at 62ch.
- Radii scale by element size rather than one value everywhere: pill CTAs,
  22px cards, 36px panels, 10–12px chips and inputs.

### Motion

Boldness is spent on the hero and nowhere else. There is no fade-slide-up on
scroll anywhere on the site — every other transition answers a user action:
hover, focus, opening the drawer, changing a filter.

---

## The shape system

Eleven cuts drawn as hairline plotting diagrams — girdle outline plus facet lines
— in [`src/lib/glyphs.ts`](src/lib/glyphs.ts). They serve as the catalogue's
navigation, the product card imagery, and the brand's technical mark.

Strokes use `vector-effect: non-scaling-stroke`, so they stay a true hairline at
any size. On hover or keyboard focus the outline fills with the cool glint and the
facet lines draw themselves in from the girdle inwards, staggered — pure CSS on
`pathLength="1"`, no JavaScript hover state. Clicking a glyph filters the
catalogue to that shape via `?shape=<slug>`.

---

## Enquiry flow

No price exists anywhere — not on a card, not in a data attribute, not in the
serialized props. The only route to a number is an enquiry.

`Enquire` opens a drawer ([`enquiry-drawer.tsx`](src/components/enquiry-drawer.tsx))
with the SKU, a drag-to-rotate preview built from the real polished frames, the
full specification, and three contact paths:

1. **WhatsApp** — `https://wa.me/<number>?text=<url-encoded message>`
2. **Email** — `mailto:` with subject and body pre-filled
3. **In-page form** — posts to `/api/enquiry`, because `mailto:` silently does
   nothing for anyone without a configured mail client

The drawer traps focus, closes on Escape, locks body scroll without shifting the
layout, and restores focus to the button that opened it.

`POST /api/enquiry` validates, requires an email **or** a phone, runs a honeypot,
and rate-limits to 5/minute per IP. Set `ENQUIRY_WEBHOOK_URL` to deliver
somewhere; without it the route accepts and logs a warning rather than silently
dropping enquiries.

> The in-memory rate limiter does not survive a restart and is not shared between
> serverless instances. Put a real limiter or a WAF rule in front of it before
> launch.

SKU format: `ISG-[SHAPE]-[N|L]-[NUMBER]`, e.g. `ISG-RD-N-10234`, `ISG-OV-L-40871`.

---

## Before this goes live

Placeholders that must be replaced:

- **`NEXT_PUBLIC_WHATSAPP_NUMBER`** and **`NEXT_PUBLIC_SALES_EMAIL`** — the
  fallbacks (`910000000000`, `sales@imperialstargems.com`) are deliberately
  obvious so a misconfigured deploy is visibly wrong rather than quietly wrong.
- **Inventory.** The 121 stones in [`src/lib/stones.ts`](src/lib/stones.ts) are
  generated from a seeded PRNG — realistic and deterministic, but not real stock.
  Replace `buildCatalog` with the live feed and delete `INVENTORY_NOTICE` and its
  two usages.
- **Certificate numbers.** Deliberately *not* generated. Cards and the drawer show
  the grading lab and "Report number supplied on enquiry" rather than a plausible
  ten-digit number that could be mistaken for a real GIA or IGI report. Wire real
  report numbers in with the real inventory.
- **Sourcing and ethics copy** on `/craftsmanship` states standard trade positions
  (Kimberley Process, System of Warranties, treatment disclosure). Confirm each
  claim is true of the business before publishing, and add memberships and
  registration numbers where they apply.
- **`metadataBase`** in `src/app/layout.tsx`, plus the domain in `sitemap.ts` and
  `robots.ts`, if the production domain differs.

---

## Not built

- **Tier 1 draggable per-shape sequences.** The brief offers this as the
  recommended tier for the shape grid, but it needs 36–72 rendered frames for each
  of the eleven shapes and only one sequence exists (a radiant). The shape grid
  ships with the SVG wireframe-to-glint interaction the brief also specifies, and
  the frame-sequence drag technique is implemented for real against the polished
  frames in [`spin-viewer.tsx`](src/components/spin-viewer.tsx) — so the pattern
  is in place and wiring per-shape assets in later is a matter of swapping the
  frame source. **This needs eleven more renders to complete.**
- **Tier 2 three.js wireframe gem.** Explicitly a stretch goal.
  `react-three-fiber` is not installed, which keeps it off every route's bundle.

## Layout

```
assets/sequence/raw/        Raw PNG input, gitignored — safe to delete after converting
scripts/convert-sequence.mjs  PNG -> WebP tiers + manifest
public/sequence/            Converted frames (desktop / mobile / spin / poster)
src/app/                    Routes: home, two catalogues, shapes, craftsmanship, contact
src/app/api/enquiry/        Enquiry endpoint
src/components/             Hero, catalogue, glyphs, drawer, spin viewer, form
src/lib/                    Shapes, glyph geometry, stones, sequence, contact helpers
src/data/                   Generated frame manifest
```
