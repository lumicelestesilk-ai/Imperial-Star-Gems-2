"use client";

import { useId, useState } from "react";
import { faceUpSize, formatFaceUp } from "@/lib/carat-size";
import type { GameProps } from "../shared/context";
import { GameButton, Overlay } from "../shared/overlay";

/**
 * How heavy is that centre stone?
 *
 * The answer comes off the product itself — the provider reads it from the card
 * the visitor was resting on — so this is never a made-up number, and it is
 * always shown whether the guess was close or not. The point is the reveal, not
 * the pass mark: nobody should feel caught out by a piece of jewellery.
 *
 * Only the centre stone is asked about, because the total carat weight is
 * already printed on the card. See product-marker.ts for the rest of that
 * reasoning.
 */

/** Within a quarter carat is a good eye. */
const TOLERANCE = 0.25;

export function CaratGuesser({ onClose, onWin, carat = 0, piece = "this piece" }: GameProps) {
  const [guess, setGuess] = useState(1.5);
  const [revealed, setRevealed] = useState(false);
  const sliderId = useId();

  const off = Math.abs(guess - carat);
  const close = off <= TOLERANCE;

  const reveal = () => {
    if (revealed) return;
    setRevealed(true);
    if (close) onWin();
  };

  // The same face-up estimate the carat chart uses, so the sizes quoted here
  // agree with the ones quoted everywhere else on the site.
  const spread = faceUpSize("round", carat);

  return (
    <Overlay
      title="Guess the carat"
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-4">
          <p className="text-[13px] text-ink-muted">Centre stone only.</p>
          {revealed ? (
            <GameButton onClick={onClose}>Close</GameButton>
          ) : (
            <GameButton onClick={reveal}>Reveal</GameButton>
          )}
        </div>
      }
    >
      <p className="text-[12px] text-ink-muted">You were looking at</p>
      <h3 className="mt-1 line-clamp-2 font-display text-[22px] leading-tight">{piece}</h3>
      <p className="measure mt-3 text-[14px] text-ink-muted">
        Its centre stone has a weight the card does not print. What would you say it is?
      </p>

      <div className="mt-6">
        <div className="flex items-baseline justify-between gap-4">
          <label htmlFor={sliderId} className="text-[12px] text-ink-muted">
            Your guess
          </label>
          <output htmlFor={sliderId} className="font-display text-[30px] leading-none tabular-nums">
            {guess.toFixed(2)}
            <span className="text-[15px] text-ink-muted"> ct</span>
          </output>
        </div>
        <input
          id={sliderId}
          type="range"
          min={0.25}
          max={5}
          step={0.05}
          value={guess}
          disabled={revealed}
          onChange={(e) => setGuess(Number(e.target.value))}
          className="mt-3 w-full accent-[var(--color-ink)]"
        />
        <div className="mt-1 flex justify-between text-[12px] tabular-nums text-ink-muted">
          <span>0.25</span>
          <span>5.00</span>
        </div>
      </div>

      {revealed ? (
        <div role="status" className="mt-6 rounded-[18px] bg-panel px-5 py-5">
          <p className="text-[12px] text-ink-muted-panel">The real weight</p>
          <p className="mt-1 font-display text-[32px] leading-none tabular-nums">
            {carat.toFixed(2)}
            <span className="text-[16px] text-ink-muted-panel"> ct</span>
          </p>
          <p className="mt-3 text-[15px] text-ink-muted-panel">
            {close
              ? `Within ${off.toFixed(2)} ct. That is a trained guess — the gem is yours.`
              : `You were ${off.toFixed(2)} ct ${guess > carat ? "over" : "under"}. Most people are.`}
          </p>
          <p className="mt-3 border-t border-hairline pt-3 text-[14px] text-ink-muted-panel">
            For scale: a round of that weight faces up around {formatFaceUp(spread)}. Weight and
            width are not the same thing — proportions decide how much of it you see.
          </p>
        </div>
      ) : null}
    </Overlay>
  );
}
