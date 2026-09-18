"use client";

/**
 * The sparkle burst every game reaches for when something goes right.
 *
 * Drawn straight into a detached DOM node and removed when it finishes, rather
 * than held in React state: a burst is forty short-lived elements that nothing
 * else needs to know about, and re-rendering a game thirty times a second to
 * animate them would be the wrong trade.
 *
 * `pointerEvents: none` throughout — a celebration must never eat a click — and
 * every call is a no-op under reduced motion, which is why the flag is a
 * required argument instead of something a caller can forget.
 */

export type BurstOptions = {
  /** Page coordinates, as from a click event. */
  x: number;
  y: number;
  reducedMotion: boolean;
  count?: number;
  color?: string;
  /** How far the furthest particle travels, in pixels. */
  spread?: number;
};

export function sparkleBurst({
  x,
  y,
  reducedMotion,
  count = 18,
  color = "#c9a227",
  spread = 90,
}: BurstOptions) {
  if (reducedMotion || typeof document === "undefined") return;

  const layer = document.createElement("div");
  layer.style.cssText =
    "position:fixed;inset:0;pointer-events:none;z-index:95;contain:strict;";
  document.body.appendChild(layer);

  let settled = 0;
  const done = () => {
    settled += 1;
    if (settled >= count) layer.remove();
  };

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const distance = spread * (0.45 + Math.random() * 0.55);
    const size = 3 + Math.random() * 4;

    const dot = document.createElement("span");
    dot.style.cssText =
      `position:absolute;left:${x}px;top:${y}px;width:${size}px;height:${size}px;` +
      `margin:${-size / 2}px 0 0 ${-size / 2}px;border-radius:1px;background:${color};` +
      `transform:rotate(45deg);will-change:transform,opacity;`;
    layer.appendChild(dot);

    const animation = dot.animate(
      [
        { transform: "translate(0,0) rotate(45deg) scale(1)", opacity: 1 },
        {
          transform: `translate(${Math.cos(angle) * distance}px, ${
            Math.sin(angle) * distance + 26
          }px) rotate(200deg) scale(0.2)`,
          opacity: 0,
        },
      ],
      { duration: 520 + Math.random() * 360, easing: "cubic-bezier(0.22, 0.61, 0.36, 1)" },
    );
    animation.onfinish = done;
    animation.oncancel = done;
  }

  // Belt and braces: if the document is hidden the animations may never run
  // their callbacks, and an orphaned layer would sit over the page forever.
  window.setTimeout(() => layer.remove(), 1600);
}

/**
 * The full-screen fall for finishing the set. Same rules as a burst — decorative,
 * click-through, and nothing at all under reduced motion.
 */
export function confettiFall(reducedMotion: boolean, colors = ["#c9a227", "#dceaf0", "#b9b6ae"]) {
  if (reducedMotion || typeof document === "undefined") return;

  const layer = document.createElement("div");
  layer.style.cssText =
    "position:fixed;inset:0;pointer-events:none;z-index:95;overflow:hidden;contain:strict;";
  document.body.appendChild(layer);

  const count = 70;
  for (let i = 0; i < count; i++) {
    const size = 5 + Math.random() * 7;
    const piece = document.createElement("span");
    piece.style.cssText =
      `position:absolute;top:-20px;left:${Math.random() * 100}%;width:${size}px;height:${size}px;` +
      `background:${colors[i % colors.length]};border-radius:1px;will-change:transform,opacity;`;
    layer.appendChild(piece);

    piece.animate(
      [
        { transform: "translateY(-20px) rotate(0deg)", opacity: 1 },
        { transform: `translateY(102vh) rotate(${520 + Math.random() * 520}deg)`, opacity: 0.9 },
      ],
      {
        duration: 2600 + Math.random() * 1800,
        delay: Math.random() * 900,
        easing: "cubic-bezier(0.3, 0.1, 0.5, 1)",
      },
    );
  }

  window.setTimeout(() => layer.remove(), 5600);
}
