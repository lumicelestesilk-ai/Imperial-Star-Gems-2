"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { frameCount, frameUrl } from "@/lib/sequence";

const COUNT = frameCount("spin");

/**
 * Drag-to-rotate preview of the polished stone, driven by the same frame
 * sequence technique as the hero — just the tail of the turn, at a smaller size.
 *
 * The frames are a continuous turn rather than a seamless loop, so the index
 * clamps at both ends instead of wrapping.
 */
export function SpinViewer({ label }: { label: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imagesRef = useRef<(HTMLImageElement | null)[]>(new Array(COUNT).fill(null));
  const indexRef = useRef(COUNT - 1);
  const dragRef = useRef<{ startX: number; startIndex: number } | null>(null);

  const [index, setIndex] = useState(COUNT - 1);
  const [ready, setReady] = useState(false);
  const [hinted, setHinted] = useState(true);

  const draw = useCallback((i: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const images = imagesRef.current;
    let img = images[i] ?? null;
    if (!img) {
      for (let step = 1; step < COUNT; step++) {
        img = images[i - step] ?? images[i + step] ?? null;
        if (img) break;
      }
    }
    if (!img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = (i: number) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => {
          if (!cancelled) {
            imagesRef.current[i] = img;
            if (i === indexRef.current) {
              draw(indexRef.current);
              setReady(true);
            }
          }
          resolve();
        };
        img.onerror = () => resolve();
        img.src = frameUrl("spin", i);
      });

    const run = async () => {
      // The face-up frame first — that is what the card opens on.
      await load(COUNT - 1);
      if (cancelled) return;
      setReady(true);
      // Then the rest, in four lanes, so a drag has frames to land on quickly.
      const queue = Array.from({ length: COUNT - 1 }, (_, i) => COUNT - 2 - i);
      await Promise.all(
        Array.from({ length: 4 }, async () => {
          while (queue.length && !cancelled) {
            const next = queue.shift();
            if (next === undefined) return;
            await load(next);
          }
        }),
      );
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [draw]);

  const setFrame = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(COUNT - 1, next));
      if (clamped === indexRef.current) return;
      indexRef.current = clamped;
      setIndex(clamped);
      draw(clamped);
    },
    [draw],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startIndex: indexRef.current };
    setHinted(false);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const width = e.currentTarget.clientWidth || 1;
    // One full drag across the viewer covers the whole turn.
    const delta = ((e.clientX - drag.startX) / width) * COUNT;
    setFrame(Math.round(drag.startIndex - delta));
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
      dragRef.current = null;
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 8 : 2;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setFrame(indexRef.current - step);
      setHinted(false);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setFrame(indexRef.current + step);
      setHinted(false);
    } else if (e.key === "Home") {
      e.preventDefault();
      setFrame(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setFrame(COUNT - 1);
    }
  };

  return (
    <div className="relative">
      <div
        role="slider"
        tabIndex={0}
        aria-label={`Rotate ${label}`}
        aria-valuemin={0}
        aria-valuemax={COUNT - 1}
        aria-valuenow={index}
        aria-valuetext={`Rotation ${Math.round((index / (COUNT - 1)) * 100)} percent`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        className="relative aspect-square w-full touch-none select-none overflow-hidden rounded-[22px] border border-hairline bg-porcelain active:cursor-grabbing"
        style={{ cursor: "grab" }}
      >
        <canvas
          ref={canvasRef}
          className="h-full w-full"
          role="img"
          aria-label={`${label}, shown face up`}
        />
        {!ready ? (
          <div
            aria-hidden
            className="absolute inset-0 animate-pulse bg-gradient-to-br from-panel via-porcelain to-panel"
          />
        ) : null}
      </div>

      <p
        className={`mt-2 text-center text-[12px] text-ink-muted transition-opacity duration-300 ${
          hinted ? "opacity-100" : "opacity-0"
        }`}
      >
        Drag to rotate
      </p>
    </div>
  );
}
