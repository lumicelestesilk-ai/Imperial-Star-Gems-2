"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GEMS, GEM_TOTAL, getState } from "../gem-store";
import { useEasterEggs, type GameProps } from "../shared/context";
import { sparkleBurst } from "../shared/sparkle";
import { SHAPES } from "@/lib/shapes";

/**
 * A prompt, bottom-left, for people who press `/` on every site they visit.
 *
 * Deliberately not a modal — unlike every other game here it has no Overlay
 * around it, because half of what it does is describe the page behind it and a
 * dimmed backdrop would be working against that. Escape and the ✕ both close
 * it, and focus is not trapped: clicking back into the page is allowed and
 * expected.
 *
 * The command list is a hardcoded table. There is no `eval`, nothing is
 * interpolated into markup, and an unrecognised line is echoed back as plain
 * text through React — which escapes it — so the worst a typed string can do is
 * be unhelpful.
 */

const PROMPT = "isg:~$";

type Line = { kind: "in" | "out"; text: string };

const HELP: [string, string][] = [
  ["help", "this list"],
  ["shapes", "the cuts we carry"],
  ["gems", "your progress through the hidden games"],
  ["play <id>", "open a game you have already found"],
  ["sparkle", "for its own sake"],
  ["clear", "empty the console"],
];

export function SecretConsole({ onClose, onWin, reducedMotion }: GameProps) {
  const { open } = useEasterEggs();
  const [lines, setLines] = useState<Line[]>([
    { kind: "out", text: "Imperial Star Gems. Type `help`." },
  ]);
  const [value, setValue] = useState("");
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);
  const rewarded = useRef(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mounted, onClose]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [lines]);

  const say = (...text: string[]) =>
    setLines((current) => [...current, ...text.map((t) => ({ kind: "out" as const, text: t }))]);

  const run = (raw: string) => {
    const input = raw.trim();
    if (!input) return;
    setLines((current) => [...current, { kind: "in", text: input }]);

    const [command, ...rest] = input.toLowerCase().split(/\s+/);
    const argument = rest.join(" ");
    let understood = true;

    switch (command) {
      case "help":
        say(...HELP.map(([name, what]) => `  ${name.padEnd(12)} ${what}`));
        break;

      case "shapes":
        say(
          `  ${SHAPES.length} cuts, all held loose:`,
          ...SHAPES.map((s) => `  ${s.code}  ${s.name.padEnd(10)} ${s.cutFamily.toLowerCase()}, ${s.ratio}`),
          "  /shapes has the full notes on each.",
        );
        break;

      case "gems": {
        const { gemsCollected } = getState();
        say(
          `  ${gemsCollected.length} of ${GEM_TOTAL} found.`,
          ...GEMS.map(
            (gem) => `  ${gemsCollected.includes(gem.id) ? "◆" : "◇"}  ${gemsCollected.includes(gem.id) ? gem.name : "— locked —"}`,
          ),
        );
        break;
      }

      case "play": {
        const gem = GEMS.find((g) => g.id === argument);
        if (!gem) {
          say(`  No game called \`${argument}\`. Try \`gems\` for the list.`);
        } else if (!getState().gemsCollected.includes(gem.id)) {
          say("  Not found yet. A hint, then:", `  ${gem.hint}`);
        } else {
          say(`  Opening ${gem.name}…`);
          window.setTimeout(() => open(gem.id), 260);
        }
        break;
      }

      case "sparkle":
        sparkleBurst({
          x: window.innerWidth / 2,
          y: window.innerHeight * 0.6,
          reducedMotion,
          count: 30,
          spread: 170,
        });
        say(reducedMotion ? "  (held back — you asked for less movement)" : "  ✦");
        break;

      case "clear":
        setLines([]);
        break;

      default:
        understood = false;
        say(`  \`${input}\` is not a command. Try \`help\`.`);
    }

    // Finding the console is the achievement; using it correctly once proves it.
    if (understood && !rewarded.current) {
      rewarded.current = true;
      onWin();
    }
  };

  if (!mounted) return null;

  return createPortal(
    <section
      aria-label="Secret console"
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-[75] w-[min(30rem,calc(100vw-2rem))] overflow-hidden rounded-[18px] border border-hairline bg-ink text-white shadow-[0_20px_60px_-20px_rgba(23,24,27,0.6)] sm:left-6"
    >
      <header className="flex items-center justify-between gap-3 border-b border-white/15 px-4 py-2.5">
        <p className="font-mono text-[12px] tracking-[0.08em] text-white/70">{PROMPT}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close the console"
          className="-mr-1 flex h-7 w-7 items-center justify-center rounded-full text-white/70 transition-colors duration-200 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M5 5 19 19M19 5 5 19" />
          </svg>
        </button>
      </header>

      <div
        ref={logRef}
        role="log"
        aria-live="polite"
        className="max-h-[min(46vh,320px)] overflow-y-auto px-4 py-3 font-mono text-[12.5px] leading-[1.55]"
      >
        {lines.map((line, i) => (
          <p key={i} className={line.kind === "in" ? "text-white" : "whitespace-pre-wrap text-white/70"}>
            {line.kind === "in" ? `${PROMPT} ${line.text}` : line.text}
          </p>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(value);
          setValue("");
        }}
        className="flex items-center gap-2 border-t border-white/15 px-4 py-2.5"
      >
        <label htmlFor="isg-console" className="font-mono text-[12.5px] text-white/50">
          {PROMPT}
        </label>
        <input
          id="isg-console"
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          maxLength={60}
          className="min-w-0 flex-1 bg-transparent font-mono text-[12.5px] text-white outline-none placeholder:text-white/30"
          placeholder="help"
        />
      </form>
    </section>,
    document.body,
  );
}
