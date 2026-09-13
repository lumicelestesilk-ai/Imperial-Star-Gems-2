"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { STAGES, frameCount, frameUrl, posterUrl, stageAt, type SequenceTier } from "@/lib/sequence";

/** Frames fetched per batch. Small enough to start drawing early, large enough
 *  to keep the connection busy. */
const BATCH = 48;
/** Parallel requests inside a batch. */
const LANES = 8;
/** Height of the sticky site header, in pixels. */
const HEADER_H = 72;

export function HeroSequence() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const pinRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const imagesRef = useRef<(HTMLImageElement | null)[]>([]);
  const requestedRef = useRef<Set<number>>(new Set());
  const drawnIndexRef = useRef(-1);
  const currentIndexRef = useRef(0);
  const tierRef = useRef<SequenceTier>("desktop");

  const [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState<boolean | null>(null);
  const [stageId, setStageId] = useState(STAGES[0].id);
  const [started, setStarted] = useState(false);

  /* ---------------------------------------------------------------- drawing */

  const draw = useCallback((index: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Fall back to the nearest frame already in memory, so scrubbing ahead of
    // the preloader holds the last good image instead of flashing empty.
    const images = imagesRef.current;
    let img = images[index] ?? null;
    if (!img) {
      for (let step = 1; step < images.length; step++) {
        img = images[index - step] ?? images[index + step] ?? null;
        if (img) break;
      }
    }
    if (!img) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    drawnIndexRef.current = index;
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    // Cap the pixel ratio: a 3x buffer costs fill rate for no visible gain on a
    // sequence that repaints on every scroll tick.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.round(rect.width * dpr);
    const height = Math.round(rect.height * dpr);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      draw(drawnIndexRef.current >= 0 ? drawnIndexRef.current : 0);
    }
  }, [draw]);

  /* -------------------------------------------------------------- preloading */

  const loadFrame = useCallback(
    (index: number) =>
      new Promise<void>((resolve) => {
        const count = frameCount(tierRef.current);
        if (index < 0 || index >= count) return resolve();
        if (requestedRef.current.has(index)) return resolve();
        requestedRef.current.add(index);

        const img = new Image();
        img.decoding = "async";
        img.onload = () => {
          imagesRef.current[index] = img;
          // If the playhead is parked on (or past) this frame, show it now.
          if (drawnIndexRef.current < 0 || currentIndexRef.current === index) {
            draw(currentIndexRef.current);
            setReady(true);
          }
          resolve();
        };
        img.onerror = () => {
          // Let a later pass retry rather than leaving a permanent hole.
          requestedRef.current.delete(index);
          resolve();
        };
        img.src = frameUrl(tierRef.current, index);
      }),
    [draw],
  );

  /* ------------------------------------------------- reduced-motion + tier */

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  /* ------------------------------------------------------------ the machine */

  useEffect(() => {
    if (reduced === null || reduced) return;

    const section = sectionRef.current;
    const pin = pinRef.current;
    if (!section || !pin) return;

    // Low-power devices decode the thinned, smaller tier.
    tierRef.current = window.matchMedia("(max-width: 900px)").matches ? "mobile" : "desktop";
    const count = frameCount(tierRef.current);
    imagesRef.current = new Array(count).fill(null);

    let cancelled = false;
    let cleanupScroll: (() => void) | undefined;

    const preload = async () => {
      // First frame before anything else, so the canvas fills immediately.
      await loadFrame(0);
      if (cancelled) return;
      setReady(true);

      for (let start = 0; start < count && !cancelled; start += BATCH) {
        const end = Math.min(start + BATCH, count);
        const queue: number[] = [];
        for (let i = start; i < end; i++) queue.push(i);

        // Always keep the frame under the playhead ahead of the queue, in case
        // the visitor scrubs faster than the batches arrive.
        await Promise.all(
          Array.from({ length: LANES }, async () => {
            while (queue.length && !cancelled) {
              await loadFrame(currentIndexRef.current);
              const next = queue.shift();
              if (next === undefined) return;
              await loadFrame(next);
            }
          }),
        );
      }
    };

    // Only start fetching once the hero is actually approaching the viewport.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          void preload();
        }
      },
      { rootMargin: "300px 0px" },
    );
    observer.observe(section);

    const setupScroll = async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);

      const trigger = ScrollTrigger.create({
        trigger: section,
        // Pin just below the sticky header, so the canvas is never behind it.
        start: `top ${HEADER_H}px`,
        // Six further viewport heights of scrubbing after the hero locks.
        // A function keeps it correct when the window is resized.
        end: () => `+=${window.innerHeight * 6}`,
        pin,
        // Let ScrollTrigger add the spacer. The alternative — sizing the section
        // by hand and disabling pinSpacing — makes the hero snap out of view at
        // the end instead of releasing into the next section.
        pinSpacing: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        scrub: true,
        onUpdate: (self) => {
          const index = Math.round(self.progress * (count - 1));
          currentIndexRef.current = index;
          // Redraw only when the frame actually changes — scroll fires far more
          // often than the sequence advances.
          if (index !== drawnIndexRef.current) draw(index);

          const stage = stageAt(self.progress);
          setStageId((prev) => (prev === stage.id ? prev : stage.id));
          setStarted(self.progress > 0.015);
        },
      });

      cleanupScroll = () => {
        trigger.kill();
      };
    };

    void setupScroll();

    resizeCanvas();
    const ro = new ResizeObserver(resizeCanvas);
    if (canvasRef.current) ro.observe(canvasRef.current);

    return () => {
      cancelled = true;
      observer.disconnect();
      ro.disconnect();
      cleanupScroll?.();
    };
  }, [reduced, draw, loadFrame, resizeCanvas]);

  /* ----------------------------------------------------------------- render */

  const activeStage = STAGES.find((s) => s.id === stageId) ?? STAGES[0];

  // Static hero: the finished stone, no scroll playback at all.
  if (reduced) {
    return (
      <section className="border-b border-hairline">
        <div className="mx-auto grid min-h-[calc(100svh-72px)] max-w-[1440px] items-center gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[5fr_7fr]">
          <HeroTitle />
          <div className="rounded-[36px] border border-hairline bg-porcelain p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={posterUrl()}
              alt="A polished radiant-cut diamond, face up, on a white ground."
              className="mx-auto aspect-square w-full max-w-[560px] object-contain"
            />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="relative border-b border-hairline" aria-labelledby="hero-heading">
      {/*
        Height comes from the ScrollTrigger pin spacer rather than a fixed
        `700svh` here: seven viewport heights in total, one showing the hero and
        six scrubbing the 689-frame turn.
      */}
      <div
        ref={pinRef}
        className="flex h-[calc(100svh-72px)] items-center overflow-hidden"
      >
        <div className="mx-auto grid w-full max-w-[1440px] items-center gap-6 px-5 sm:px-8 lg:grid-cols-[5fr_7fr] lg:gap-10">
          <div className="order-2 lg:order-1">
            <HeroTitle />

            <div className="mt-8 hidden lg:block">
              <StageCaption stage={activeStage} />
            </div>
          </div>

          <div className="relative order-1 lg:order-2">
            <div className="relative mx-auto aspect-square w-full max-w-[min(64vh,620px)] overflow-hidden rounded-[36px] border border-hairline bg-porcelain">
              <canvas
                ref={canvasRef}
                className="h-full w-full"
                role="img"
                aria-label="A rough diamond crystal being planned, sawn, faceted and polished into a finished radiant-cut stone."
              />
              {!ready ? (
                <div
                  aria-hidden
                  className="absolute inset-0 animate-pulse rounded-[36px] bg-gradient-to-br from-panel via-porcelain to-panel"
                />
              ) : null}
            </div>

            <ScrollCue visible={!started} />
          </div>

          <div className="order-3 lg:hidden">
            <StageCaption stage={activeStage} compact />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroTitle() {
  return (
    <div>
      <h1
        id="hero-heading"
        className="font-display text-[clamp(2.4rem,6.4vw,4.6rem)] leading-[1.02]"
      >
        Every diamond begins as rough.
      </h1>
      <p className="measure mt-5 text-[15px] text-ink-muted sm:text-base">
        Imperial Star Gems supplies loose natural and lab-grown stones to trade and private
        buyers. Follow one crystal from the ground to its certificate.
      </p>
      <div className="mt-7 flex flex-wrap items-center gap-3">
        <Link
          href="/natural-diamonds"
          className="rounded-full bg-ink px-7 py-3 text-[15px] text-white transition-opacity duration-200 hover:opacity-85"
        >
          Natural diamonds
        </Link>
        <Link
          href="/lab-grown-diamonds"
          className="rounded-full border border-hairline px-7 py-3 text-[15px] transition-colors duration-200 hover:border-ink"
        >
          Lab-grown diamonds
        </Link>
      </div>
    </div>
  );
}

function StageCaption({
  stage,
  compact = false,
}: {
  stage: (typeof STAGES)[number];
  compact?: boolean;
}) {
  const number = STAGES.findIndex((s) => s.id === stage.id) + 1;

  return (
    <div className={compact ? "pt-4" : "border-t border-hairline pt-6"}>
      <div className="flex items-start gap-4">
        {/* Stage ticks: a technical read-out of where the stone is in the cut. */}
        <div aria-hidden className="mt-2 flex shrink-0 flex-col gap-1.5">
          {STAGES.map((s, i) => (
            <span
              key={s.id}
              className={`block h-px transition-all duration-500 ${
                i === number - 1 ? "w-6 bg-ink" : "w-3 bg-hairline"
              }`}
            />
          ))}
        </div>

        {/*
          Cross-fade: both the title and body are keyed on the stage id, so React
          swaps the node and the CSS animation replays on every stage change.
        */}
        <div key={stage.id} className="animate-[fadeIn_520ms_ease-out]">
          <p className="text-[13px] text-ink-muted">
            Stage {number} of {STAGES.length}
          </p>
          <h2 className="mt-1 font-display text-[clamp(1.4rem,2.4vw,2rem)]">{stage.title}</h2>
          <p
            className={`measure mt-2 text-ink-muted ${compact ? "line-clamp-3 text-[14px]" : "text-[15px]"}`}
          >
            {stage.body}
          </p>
        </div>
      </div>
    </div>
  );
}

function ScrollCue({ visible }: { visible: boolean }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-x-0 -bottom-2 flex justify-center transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <span className="rounded-full border border-hairline bg-porcelain px-4 py-1.5 text-[12px] text-ink-muted">
        Scroll to cut the stone
      </span>
    </div>
  );
}
