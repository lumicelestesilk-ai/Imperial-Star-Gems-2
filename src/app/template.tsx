"use client";

import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";

/**
 * Cross-fades the page view on every navigation.
 *
 * This lives in template.tsx rather than layout.tsx because layouts persist
 * across routes — a wrapper there mounts once and the animation would only
 * ever play on the first load. Templates are re-keyed per navigation, so the
 * incoming view mounts fresh and its `initial` state actually runs.
 *
 * The fade is one-sided by design. Next keeps the outgoing page painted until
 * the incoming route commits, so raising the new view from transparent reads
 * as a cross-fade over the old one without a blank frame in between. An
 * AnimatePresence exit half is not worth chasing here: the old page's tree is
 * replaced by the router, so holding it on screen means absolutely positioning
 * both halves, which collapses page height and breaks scroll restoration.
 */

// Opacity only. Several pages (build-a-ring, jewelry/[sku], shapes) rely on
// position: sticky, and a transform on an ancestor — even a transient one —
// re-parents the containing block and makes those elements judder mid-fade.
const FADE = { opacity: 0 };
const SETTLED = { opacity: 1 };

// Slower than the in-page transitions (~0.28s) so a whole-view change feels
// like a considered turn rather than a component swapping out. The easing is
// the house curve: quick to commit, long and soft to arrive.
const TRANSITION = { duration: 0.45, ease: [0.22, 0.61, 0.36, 1] as const };

// The first paint is not a navigation — fading it in would only hold the hero
// back. Module scope, because the template itself remounts on every route
// change and cannot remember across one.
let renderedPath: string | null = null;

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const isNavigation = renderedPath !== null && renderedPath !== pathname;

  useEffect(() => {
    renderedPath = pathname;
  }, [pathname]);

  // globals.css neutralises CSS animations under prefers-reduced-motion, but
  // Framer drives this one from JS, so it has to opt out on its own. The
  // wrapper itself stays either way: useReducedMotion only resolves after
  // hydration, and dropping the element then would remount every page child.
  const animate = isNavigation && !reduceMotion;

  return (
    <motion.div
      initial={animate ? FADE : false}
      animate={SETTLED}
      transition={TRANSITION}
    >
      {children}
    </motion.div>
  );
}
