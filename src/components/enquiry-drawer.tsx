"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { StoneModel } from "./stone-model";
import { EnquiryForm } from "./enquiry-form";
import type { Stone } from "@/lib/stones";
import { enquiryBody, mailtoHref, stoneDescriptor, whatsappHref } from "@/lib/contact";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export function EnquiryDrawer({ stone, onClose }: { stone: Stone | null; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!stone) return;

    restoreFocusRef.current = document.activeElement as HTMLElement | null;

    // Hold the page still behind the drawer without the layout shifting as the
    // scrollbar disappears.
    const { body } = document;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = body.style.overflow;
    const prevPadding = body.style.paddingRight;
    body.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
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
    // Move focus into the drawer once it exists.
    const raf = requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    });

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      cancelAnimationFrame(raf);
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPadding;
      restoreFocusRef.current?.focus?.();
    };
  }, [stone, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {stone ? (
        <motion.div
          key="enquiry"
          className="fixed inset-0 z-[70] flex justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            aria-label="Close enquiry"
            onClick={onClose}
            className="absolute inset-0 h-full w-full cursor-default bg-ink/25 backdrop-blur-[2px]"
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="enquiry-title"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 36, mass: 0.9 }}
            className="relative flex h-full w-full max-w-[560px] flex-col overflow-y-auto border-l border-hairline bg-porcelain"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-hairline bg-porcelain/90 px-6 py-4 backdrop-blur-md">
              <p className="text-[12px] tabular-nums text-ink-muted">{stone.sku}</p>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-hairline px-4 py-1.5 text-[13px] transition-colors duration-200 hover:border-ink"
              >
                Close
              </button>
            </div>

            <div className="px-6 pb-10 pt-6">
              <h2 id="enquiry-title" className="font-display text-[32px] leading-tight">
                {stone.shapeName} {stone.carat.toFixed(2)} ct
              </h2>
              <p className="mt-1.5 text-[15px] text-ink-muted">
                {stone.color} colour, {stone.clarity} clarity,{" "}
                {stone.origin === "natural" ? "natural" : "lab-grown"}
              </p>

              <div className="mt-6">
                <StoneModel
                  stone={stone}
                  label={`the ${stone.shapeName} ${stone.carat.toFixed(2)} carat diamond`}
                />
              </div>

              <dl className="mt-7 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-hairline pt-6">
                <Row label="Shape" value={stone.shapeName} />
                <Row label="Carat" value={stone.carat.toFixed(2)} />
                <Row label="Colour" value={stone.color} />
                <Row label="Clarity" value={stone.clarity} />
                <Row label="Cut" value={stone.cut} />
                <Row label="Polish" value={stone.polish} />
                <Row label="Symmetry" value={stone.symmetry} />
                <Row label="Fluorescence" value={stone.fluorescence} />
                <Row label="Table" value={`${stone.tablePercent}%`} />
                <Row label="Depth" value={`${stone.depthPercent}%`} />
                <Row label="Measurements" value={stone.measurements} wide />
                <Row
                  label="Certificate"
                  value={`${stone.lab}. Report number supplied on enquiry.`}
                  wide
                />
              </dl>

              <div className="mt-8 border-t border-hairline pt-6">
                <h3 className="font-display text-xl">Enquire on this stone</h3>
                <p className="measure mt-1.5 text-[14px] text-ink-muted">
                  Reach us the quickest way for you. Each option arrives with the SKU and
                  specification already attached.
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <a
                    href={whatsappHref(stone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-ink px-6 py-3 text-center text-[15px] text-white transition-opacity duration-200 hover:opacity-85"
                  >
                    WhatsApp
                  </a>
                  <a
                    href={mailtoHref(stone)}
                    className="rounded-full border border-ink px-6 py-3 text-center text-[15px] transition-colors duration-200 hover:bg-ink hover:text-white"
                  >
                    Email
                  </a>
                </div>

                <div className="mt-8 border-t border-hairline pt-6">
                  <h3 className="font-display text-xl">Or send it from here</h3>
                  <div className="mt-4">
                    <EnquiryForm
                      sku={stone.sku}
                      defaultMessage={enquiryBody(stone)}
                      compact
                    />
                  </div>
                </div>

                <p className="mt-6 text-[12px] text-ink-muted">
                  Reference: {stone.sku} ({stoneDescriptor(stone)})
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

function Row({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2" : undefined}>
      <dt className="text-[12px] text-ink-muted">{label}</dt>
      <dd className="mt-0.5 text-[15px]">{value}</dd>
    </div>
  );
}
