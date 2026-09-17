"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { STAGES, frameCount, frameUrl, stageAt, type SequenceTier } from "@/lib/sequence";
import { useViewportWidth } from "@/hooks/use-device-type";

/** Parallel requests while preloading. */
const LANES = 8;
/** At or below this width the thinned `scroll-mobile` tier is decoded. Not a
 *  device-type breakpoint: tablets up to 900px have always had the small tier. */
const MOBILE_TIER_MAX_WIDTH = 900;
/**
 * Length of the cutting sequence, start to finished stone: the full 700-frame
 * tier at 30 fps. The thinned phone tier plays over the same time, so both
 * tiers show each stage for as long.
 */
const INTRO_MS = (frameCount("scroll") / 30) * 1000;
/** Playback keeps this much of the sequence loaded ahead of itself before moving on. */
const BUFFER_MS = 1000;
/** Playback rate of the finished stone's loop, matching the homepage rotation. */
const LOOP_FPS = 30;

/**
 * The homepage hero: one crystal cut from rough to finished stone.
 *
 * Plays on its own, on a clock. The cutting sequence runs once, the caption
 * follows it stage by stage, and on the last frame playback hands over to the
 * 360° loop of the finished stone, which then turns indefinitely. Nothing here
 * reads scroll position.
 *
 * The clock only runs while the hero is on screen and the tab is visible, and
 * it holds rather than skips when the network has not delivered the frames
 * ahead of it. A pause button satisfies WCAG 2.2.2 for motion that starts on
 * its own; there is still no prefers-reduced-motion branch, because Windows
 * Server, RDP sessions and many power-saving setups report reduced motion by
 * default, and visitors on those machines would only ever see a still.
 */
export function HeroSequence() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const introRef = useRef<(HTMLImageElement | null)[]>([]);
  const loopRef = useRef<(HTMLImageElement | null)[]>([]);
  const loopReadyRef = useRef(false);
  const tierRef = useRef<SequenceTier>("scroll");
  const pausedRef = useRef(false);

  /** Where playback is: milliseconds into the intro, then frames into the loop. */
  const elapsedRef = useRef(0);
  const inLoopRef = useRef(false);
  const loopIndexRef = useRef(0);
  const drawnRef = useRef<string>("");

  const [ready, setReady] = useState(false);
  const [stageId, setStageId] = useState(STAGES[0].id);
  const [paused, setPaused] = useState(false);

  const viewportWidth = useViewportWidth();
  const hydrated = viewportWidth !== null;

  /* ---------------------------------------------------------------- drawing */

  const paint = useCallback((img: HTMLImageElement, key: string) => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.width) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    drawnRef.current = key;
  }, []);

  /** Draws whatever the playhead points at, falling back to the nearest loaded frame. */
  const render = useCallback(
    (force = false) => {
      if (inLoopRef.current && loopReadyRef.current) {
        const i = loopIndexRef.current;
        const img = loopRef.current[i];
        if (img && (force || drawnRef.current !== `loop-${i}`)) paint(img, `loop-${i}`);
        return;
      }
      const images = introRef.current;
      const count = images.length;
      if (!count) return;
      // Until the loop is in memory the last intro frame stands in for it: it is
      // the same face-up view as the loop's first frame.
      const target = inLoopRef.current
        ? count - 1
        : Math.min(count - 1, Math.floor((elapsedRef.current / INTRO_MS) * count));
      for (let step = 0; step < count; step++) {
        const i = images[target - step] ? target - step : target + step;
        const img = images[i];
        if (!img) continue;
        if (force || drawnRef.current !== `intro-${i}`) paint(img, `intro-${i}`);
        return;
      }
    },
    [paint],
  );

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    // A 3x buffer costs fill rate for no visible gain on a sequence repainting 30 times a second.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.round(rect.width * dpr);
    const height = Math.round(rect.height * dpr);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      render(true);
    }
  }, [render]);

  /* ------------------------------------------------------------ the machine */

  useEffect(() => {
    // Wait for the real width so a phone never starts loading the desktop tier.
    if (viewportWidth === null) return;
    const section = sectionRef.current;
    if (!section) return;

    // Sampled once per mount: resizing afterwards doesn't swap tiers mid-play.
    const tier: SequenceTier = viewportWidth <= MOBILE_TIER_MAX_WIDTH ? "scroll-mobile" : "scroll";
    tierRef.current = tier;
    const count = frameCount(tier);
    const loopCount = frameCount("rotate");
    // A clean slate on every mount; React's development double-mount would
    // otherwise inherit a torn-down run's state.
    introRef.current = new Array(count).fill(null);
    loopRef.current = new Array(loopCount).fill(null);
    loopReadyRef.current = false;
    elapsedRef.current = 0;
    inLoopRef.current = false;
    loopIndexRef.current = 0;
    drawnRef.current = "";

    let cancelled = false;
    /** Frames 0..contiguous-1 are all in memory. */
    let contiguous = 0;

    /* -- loading */

    const fetchFrame = (url: string) =>
      new Promise<HTMLImageElement | null>((resolve) => {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = url;
      });

    const loadIntro = async () => {
      const first = await fetchFrame(frameUrl(tier, 0));
      if (cancelled) return;
      if (first) {
        introRef.current[0] = first;
        render(true);
        setReady(true);
      }
      // In order, so playback can start as soon as its buffer is filled.
      const queue = Array.from({ length: count - 1 }, (_, k) => k + 1);
      await Promise.all(
        Array.from({ length: LANES }, async () => {
          while (queue.length && !cancelled) {
            const i = queue.shift() as number;
            // One retry, since a gap holds playback until loading finishes.
            const img = (await fetchFrame(frameUrl(tier, i))) ?? (await fetchFrame(frameUrl(tier, i)));
            if (cancelled) return;
            introRef.current[i] = img;
            while (contiguous < count && introRef.current[contiguous]) contiguous++;
          }
        }),
      );
      if (cancelled) return;
      // Frames that failed twice borrow their predecessor, so playback can pass them.
      introRef.current = introRef.current.map((img, i, all) => img ?? all[i - 1] ?? all.find(Boolean) ?? null);
      contiguous = introRef.current.every(Boolean) ? count : contiguous;
      // The loop comes second, well before the intro reaches it on any
      // reasonable connection.
      if (!cancelled) void loadLoop();
    };

    const loadLoop = async () => {
      const queue = Array.from({ length: loopCount }, (_, i) => i);
      await Promise.all(
        Array.from({ length: LANES }, async () => {
          while (queue.length && !cancelled) {
            const i = queue.shift() as number;
            loopRef.current[i] = await fetchFrame(frameUrl("rotate", i));
          }
        }),
      );
      if (cancelled) return;
      // A missing frame would stutter the spin; borrow the previous one.
      loopRef.current = loopRef.current.map((img, i, all) => img ?? all[i - 1] ?? all[0]);
      // Play only once every frame has settled; a half-loaded loop reads as stutter.
      loopReadyRef.current = loopRef.current.every(Boolean);
    };

    /* -- the clock */

    let raf = 0;
    let last = 0;
    let loopCarry = 0;
    let onScreen = false;
    let lastStage = "";

    const tick = (now: number) => {
      raf = 0;
      if (!onScreen || document.visibilityState !== "visible") return;
      const dt = last ? Math.min(now - last, 100) : 0;
      last = now;

      if (!pausedRef.current) {
        if (!inLoopRef.current) {
          // Hold, rather than skip ahead, until the next second of frames is in.
          const next = elapsedRef.current + dt;
          const needed = Math.min(count, Math.ceil(((next + BUFFER_MS) / INTRO_MS) * count));
          if (contiguous >= needed) elapsedRef.current = next;
          if (elapsedRef.current >= INTRO_MS) {
            elapsedRef.current = INTRO_MS;
            inLoopRef.current = true;
            loopIndexRef.current = 0;
            loopCarry = 0;
          }
          const stage = stageAt(Math.min(elapsedRef.current / INTRO_MS, 1));
          if (stage.id !== lastStage) {
            lastStage = stage.id;
            setStageId(stage.id);
          }
        } else if (loopReadyRef.current) {
          loopCarry += dt;
          const step = 1000 / LOOP_FPS;
          if (loopCarry >= step) {
            // Cap catch-up so a dropped burst of frames does not lurch the stone.
            const advance = Math.min(Math.floor(loopCarry / step), 3);
            loopCarry -= advance * step;
            loopIndexRef.current = (loopIndexRef.current + advance) % loopCount;
          }
        }
        render();
      }
      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (raf || !onScreen || document.visibilityState !== "visible") return;
      last = 0;
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const onVisibility = () => (document.visibilityState === "visible" ? start() : stop());
    document.addEventListener("visibilitychange", onVisibility);

    let loading = false;
    const io = new IntersectionObserver(
      (entries) => {
        onScreen = entries[entries.length - 1].isIntersecting;
        if (onScreen && !loading) {
          loading = true;
          void loadIntro();
        }
        if (onScreen) start();
        else stop();
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(section);

    // The pause button restarts the clock without waiting for another observer callback.
    const resume = () => start();
    section.addEventListener("hero:resume", resume);

    resizeCanvas();
    const ro = new ResizeObserver(resizeCanvas);
    if (canvasRef.current) ro.observe(canvasRef.current);

    return () => {
      cancelled = true;
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      section.removeEventListener("hero:resume", resume);
    };
    // `hydrated`, not the width: the tier is chosen once, on the first real measurement.
  }, [hydrated, render, resizeCanvas]);

  const togglePaused = () => {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
    if (!pausedRef.current) sectionRef.current?.dispatchEvent(new Event("hero:resume"));
  };

  /* ----------------------------------------------------------------- render */

  const activeStage = STAGES.find((s) => s.id === stageId) ?? STAGES[0];

  return (
    <section ref={sectionRef} className="relative border-b border-hairline" aria-labelledby="hero-heading">
      <div className="flex min-h-[calc(100svh-72px)] items-center py-10">
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
                aria-label={`Diamond cutting sequence, playing automatically. Now showing ${activeStage.title}: ${activeStage.stillAlt}`}
              />
              {!ready ? (
                <div
                  aria-hidden
                  className="absolute inset-0 animate-pulse rounded-[36px] bg-gradient-to-br from-panel via-porcelain to-panel"
                />
              ) : null}
              <button
                type="button"
                onClick={togglePaused}
                aria-pressed={paused}
                className="absolute bottom-3 right-3 rounded-full border border-hairline bg-porcelain/85 px-3.5 py-1.5 text-[12px] text-ink-muted backdrop-blur-sm transition-colors duration-200 hover:border-ink hover:text-ink max-md:min-h-11"
              >
                {paused ? "Play" : "Pause"}
                <span className="sr-only"> the diamond animation</span>
              </button>
            </div>
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

/** The current stage's title and description. No stage number or counter. */
function StageCaption({
  stage,
  compact = false,
}: {
  stage: (typeof STAGES)[number];
  compact?: boolean;
}) {
  return (
    // Polite live region on the stable wrapper: the caption changes on its own,
    // and a region inserted fresh with each stage would often go unannounced.
    <div className={compact ? "pt-4" : "border-t border-hairline pt-6"} aria-live="polite">
      {/*
        Cross-fade: keyed on the stage id, so React swaps the node and the CSS
        animation replays on every stage change.
      */}
      <div key={stage.id} className="animate-[fadeIn_520ms_ease-out]">
        <h2 className="font-display text-[clamp(1.4rem,2.4vw,2rem)]">{stage.title}</h2>
        <p
          className={`measure mt-2 text-ink-muted ${compact ? "line-clamp-3 text-[14px]" : "text-[15px]"}`}
        >
          {stage.body}
        </p>
      </div>
    </div>
  );
}
