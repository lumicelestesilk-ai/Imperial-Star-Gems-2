"use client";

import { useEffect, useRef } from "react";

/**
 * Holds the latest callback in a ref.
 *
 * Every trigger hook binds a long-lived document listener, and the handler it
 * should call changes identity on most renders. Without this, each hook either
 * re-binds its listener constantly — losing the partial sequence the visitor
 * was halfway through typing — or silently closes over a stale handler. One
 * helper, used by all of them, keeps both problems out of ten files.
 */
export function useEventCallback<A extends unknown[]>(fn: (...args: A) => void) {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  });
  const stable = useRef((...args: A) => ref.current(...args));
  return stable.current;
}

/** True when the keystroke belongs to something the visitor is typing into. */
export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  const tag = el.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable;
}
