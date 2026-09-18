"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * The shell every modal game sits in: portal, backdrop, focus trap, scroll
 * lock, Escape, and a close button. Built once and reused, so a game file is
 * only ever the game.
 *
 * It follows the enquiry drawer's behaviour deliberately — same trap, same
 * scroll lock, same focus restore — because a hidden game that handles the
 * keyboard differently from the rest of the site is a hidden game that traps
 * somebody. No animation library: a CSS transition costs nothing and these
 * files are loaded on a trigger, where every kilobyte is one the visitor is
 * waiting on.
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export function Overlay({
  title,
  onClose,
  children,
  /** Wider card for games that need the room. */
  wide = false,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  footer?: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;

    const { body } = document;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = body.style.overflow;
    const prevPadding = body.style.paddingRight;
    body.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const raf = requestAnimationFrame(() => {
      setShown(true);
      panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    });

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      cancelAnimationFrame(raf);
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPadding;
      restoreFocusRef.current?.focus?.();
    };
  }, [mounted]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[80] flex items-center justify-center p-4 transition-opacity duration-200 sm:p-6 ${
        shown ? "opacity-100" : "opacity-0"
      }`}
    >
      <button
        type="button"
        aria-label={`Close ${title}`}
        onClick={onClose}
        tabIndex={-1}
        className="absolute inset-0 h-full w-full cursor-default bg-ink/45 backdrop-blur-[2px]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative flex max-h-[min(90vh,900px)] w-full flex-col overflow-hidden rounded-[28px] border border-hairline bg-porcelain shadow-[0_24px_80px_-24px_rgba(23,24,27,0.45)] ${
          wide ? "max-w-[680px]" : "max-w-[520px]"
        }`}
      >
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-hairline px-6 py-4">
          <h2 className="font-display text-[22px] leading-none">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="-mr-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors duration-200 hover:bg-panel hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M5 5 19 19M19 5 5 19" />
            </svg>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">{children}</div>

        {footer ? (
          <footer className="shrink-0 border-t border-hairline px-6 py-4">{footer}</footer>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

/** The button shape the games share, so every game's call to action matches. */
export function GameButton({
  children,
  onClick,
  variant = "solid",
  type = "button",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "solid" | "outline";
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full px-5 py-2.5 text-[14px] transition-colors duration-200 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
        variant === "solid"
          ? "bg-ink text-white hover:opacity-85"
          : "border border-hairline hover:border-ink"
      }`}
    >
      {children}
    </button>
  );
}
