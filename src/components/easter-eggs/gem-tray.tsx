"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  COMPLETION_CODE,
  GEMS,
  GEM_TOTAL,
  SHOW_COMPLETION_CODE,
  resetAll,
  useGemState,
} from "./gem-store";
import { useEasterEggs } from "./shared/context";
import { Overlay, GameButton } from "./shared/overlay";

/**
 * The hunter's tally: a small mark in the bottom-left corner — the corner the
 * shortlist tray and the flag badge leave free — that opens a list of what has
 * been found and what is still out there.
 *
 * Locked entries show a silhouette and a hint rather than a name, so the list
 * is a map rather than a spoiler. It is only mounted once the first gem is
 * found, so it never advertises a hunt to somebody who hasn't started one.
 */

const REPLAYABLE = new Set([
  "diamond-catch",
  "gem-memory",
  "lantern-match",
  "four-cs-quiz",
  "spot-the-flaw",
  "ring-toss",
  "gem-cut-puzzle",
  "vault-cracker",
  "snow-globe",
  "secret-console",
]);

/** The mark itself: a small brilliant, drawn rather than imported. */
function GemMark({ lit, className = "" }: { lit: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path
        d="M6 4h12l4 6-10 12L2 10Z"
        fill={lit ? "var(--color-facet)" : "none"}
        stroke={lit ? "var(--color-ink)" : "var(--color-metal)"}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      {lit ? (
        <path
          d="M6 4l2 6 4 12 4-12 2-6M2 10h20"
          fill="none"
          stroke="var(--color-ink)"
          strokeWidth="0.9"
          opacity="0.55"
        />
      ) : null}
    </svg>
  );
}

export function GemTray({
  celebrate,
  onDismissCelebration,
}: {
  celebrate: boolean;
  onDismissCelebration: () => void;
}) {
  const { state, count } = useGemState();
  const { open } = useEasterEggs();
  const [showList, setShowList] = useState(false);
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  // A popover, not a dialog: clicking away or pressing Escape puts it away, and
  // nothing behind it is blocked while it is up.
  useEffect(() => {
    if (!showList) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setShowList(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setShowList(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [showList]);

  return (
    <>
      <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-40 print:hidden sm:left-6">
        {showList ? (
          <div
            ref={panelRef}
            id={panelId}
            className="mb-3 max-h-[min(70vh,540px)] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-[22px] border border-hairline bg-porcelain p-4 shadow-[0_18px_50px_-18px_rgba(23,24,27,0.35)]"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-[19px] leading-none">Hidden gems</h2>
              <p className="text-[13px] tabular-nums text-ink-muted">
                {count} / {GEM_TOTAL}
              </p>
            </div>

            <ul className="mt-3 space-y-1.5">
              {GEMS.map((gem) => {
                const found = state.gemsCollected.includes(gem.id);
                const best = state.bestScores[gem.id];
                return (
                  <li
                    key={gem.id}
                    className={`flex gap-3 rounded-[14px] px-2.5 py-2 ${found ? "bg-panel" : ""}`}
                  >
                    <GemMark lit={found} className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      {found ? (
                        <>
                          <p className="text-[14px] leading-tight">{gem.name}</p>
                          <p className="mt-0.5 text-[12px] text-ink-muted-panel">
                            {best !== undefined ? `Best ${best}${gem.unit ?? ""}` : "Found"}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-[14px] leading-tight text-ink-muted">
                            {"—".repeat(3)}
                          </p>
                          <p className="mt-0.5 text-[12px] text-ink-muted">{gem.hint}</p>
                          {gem.seasonal ? (
                            <p className="mt-0.5 text-[12px] text-ink-muted">
                              Only on {gem.seasonal.toLowerCase()}.
                            </p>
                          ) : null}
                        </>
                      )}
                    </div>
                    {found && REPLAYABLE.has(gem.id) ? (
                      <button
                        type="button"
                        onClick={() => {
                          setShowList(false);
                          open(gem.id);
                        }}
                        className="shrink-0 self-center text-[12px] text-ink-muted-panel underline underline-offset-4 transition-colors duration-200 hover:text-ink"
                      >
                        Play<span className="sr-only"> {gem.name} again</span>
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>

            <button
              type="button"
              onClick={() => {
                resetAll();
                setShowList(false);
              }}
              className="mt-3 w-full rounded-full border border-hairline px-4 py-2 text-[12px] text-ink-muted transition-colors duration-200 hover:border-ink hover:text-ink"
            >
              Start the hunt over
            </button>
          </div>
        ) : null}

        <button
          ref={buttonRef}
          type="button"
          onClick={() => setShowList((v) => !v)}
          aria-expanded={showList}
          aria-controls={showList ? panelId : undefined}
          className="flex items-center gap-2 rounded-full border border-hairline bg-porcelain/90 px-3.5 py-2 text-[13px] tabular-nums shadow-[0_6px_20px_-10px_rgba(23,24,27,0.4)] backdrop-blur-sm transition-colors duration-200 hover:border-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <GemMark lit className="h-4 w-4" />
          <span>
            {count} / {GEM_TOTAL}
          </span>
          <span className="sr-only">hidden gems found. Open the list.</span>
        </button>
      </div>

      {celebrate ? <CompletionModal onClose={onDismissCelebration} /> : null}
    </>
  );
}

function CompletionModal({ onClose }: { onClose: () => void }) {
  return (
    <Overlay
      title="Every gem found"
      onClose={onClose}
      footer={
        <div className="flex justify-end">
          <GameButton onClick={onClose}>Close</GameButton>
        </div>
      }
    >
      <div className="text-center">
        <div className="mx-auto flex w-fit gap-1">
          {Array.from({ length: 5 }, (_, i) => (
            <GemMark key={i} lit className="h-6 w-6" />
          ))}
        </div>
        <h3 className="mt-5 font-display text-[28px] leading-tight">
          All {GEM_TOTAL}, found and kept
        </h3>
        <p className="measure mx-auto mt-3 text-[15px] text-ink-muted">
          Somewhere between the Konami code and a vault that only opens when nobody is
          watching, you turned over every stone on this site. That is a properly obsessive
          piece of browsing, and we are delighted.
        </p>
        {SHOW_COMPLETION_CODE ? (
          <p className="mt-5 rounded-[16px] bg-panel px-5 py-4 text-[15px] text-ink-muted-panel">
            Mention{" "}
            <span className="tracking-[0.12em] text-ink">{COMPLETION_CODE}</span> when you
            enquire.
          </p>
        ) : (
          <p className="mt-5 rounded-[16px] bg-panel px-5 py-4 text-[15px] text-ink-muted-panel">
            Tell us you found all {GEM_TOTAL} when you enquire — we would genuinely like to
            know somebody did.
          </p>
        )}
      </div>
    </Overlay>
  );
}
