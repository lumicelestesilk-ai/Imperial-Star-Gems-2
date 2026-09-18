"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { awardGem, useGemState, useHydrated } from "./gem-store";
import { EasterEggContext } from "./shared/context";
import { confettiFall, sparkleBurst } from "./shared/sparkle";
import { useFastMouseMove } from "./triggers/use-fast-mouse-move";
import { useHoverDuration } from "./triggers/use-hover-duration";
import { useIdleTimer } from "./triggers/use-idle-timer";
import { useKeyPressCount } from "./triggers/use-key-press-count";
import { useKonamiCode } from "./triggers/use-konami-code";
import { LOGO_SELECTOR, useLogoClickBurst } from "./triggers/use-logo-click-burst";
import { useShakeOrDrag } from "./triggers/use-shake-or-drag";
import { useShiftClickLogo } from "./triggers/use-shift-click-logo";
import { useTripleClick } from "./triggers/use-triple-click";
import { useTypedWord } from "./triggers/use-typed-word";

/**
 * The one piece of the easter-egg system that every page carries.
 *
 * It is deliberately thin: a handful of passive listeners, the progress store,
 * and a table of dynamic imports. No game, no overlay and not even the gem tray
 * is in this bundle — each arrives only once something has asked for it, so a
 * visitor who never finds anything never downloads anything.
 *
 * Exactly one game is open at a time. A trigger that fires while another game
 * is up is queued rather than stacked, and the queue holds one, because being
 * handed a third game on closing the second is a nuisance rather than a
 * delight.
 */

/* ------------------------------------------------------------ dynamic games */

const load = {
  "diamond-catch": dynamic(() => import("./games/diamond-catch").then((m) => m.DiamondCatch), { ssr: false }),
  "gem-memory": dynamic(() => import("./games/gem-memory").then((m) => m.GemMemory), { ssr: false }),
  "lantern-match": dynamic(() => import("./games/lantern-match").then((m) => m.LanternMatch), { ssr: false }),
  "four-cs-quiz": dynamic(() => import("./games/four-cs-quiz").then((m) => m.FourCsQuiz), { ssr: false }),
  "spot-the-flaw": dynamic(() => import("./games/spot-the-flaw").then((m) => m.SpotTheFlaw), { ssr: false }),
  "carat-guesser": dynamic(() => import("./games/carat-guesser").then((m) => m.CaratGuesser), { ssr: false }),
  "ring-toss": dynamic(() => import("./games/ring-toss").then((m) => m.RingToss), { ssr: false }),
  "gem-cut-puzzle": dynamic(() => import("./games/gem-cut-puzzle").then((m) => m.GemCutPuzzle), { ssr: false }),
  "vault-cracker": dynamic(() => import("./games/vault-cracker").then((m) => m.VaultCracker), { ssr: false }),
  "snow-globe": dynamic(() => import("./games/snow-globe-shake").then((m) => m.SnowGlobeShake), { ssr: false }),
  "secret-console": dynamic(() => import("./games/secret-console").then((m) => m.SecretConsole), { ssr: false }),
};

type GameId = keyof typeof load;

const GemTray = dynamic(() => import("./gem-tray").then((m) => m.GemTray), { ssr: false });
const SparkleTrail = dynamic(() => import("./games/sparkle-trail").then((m) => m.SparkleTrail), { ssr: false });
const TreasureHunt = dynamic(() => import("./games/treasure-hunt").then((m) => m.TreasureHunt), { ssr: false });
const DiyaSequence = dynamic(() => import("./games/diya-sequence").then((m) => m.DiyaSequence), { ssr: false });

/* ------------------------------------------------------------ page gating */

/**
 * Midwinter pages, in every language the seasonal routes speak. A snow globe is
 * a Christmas object rather than a weather report, so the southern-hemisphere
 * pages get one too.
 */
const WINTER =
  /^\/seasonal\/[^/]+\/(christmas|christmas-eve|boxing-day|heiligabend|natale|reveillon-noel|dia-de-reyes)(-en)?$/;

const LUNAR = /^\/seasonal\/[^/]+\/chinese-new-year(-en)?$/;

/**
 * Diwali has no landing page in this codebase yet — the seasonal regions run
 * us, uk, eu and its four languages, jp, kr, cn and anz, with no India. The
 * game is built and this gate is live, so it lights up the day such a page
 * ships; until then it is correctly inert.
 */
const DIWALI = /^\/seasonal\/in\/(diwali|deepavali)(-en)?$/;

/**
 * Where the vault stays shut. There is no cart or checkout on this site — every
 * stone is quoted on enquiry — so the pages to leave alone are the ones where
 * somebody is in the middle of asking us something.
 */
const NO_VAULT = /^\/(contact|shortlist|build-a-ring)(\/|$)/;

/* ------------------------------------------------------------ provider */

type Active = { id: GameId; carat?: number; piece?: string };

export function EasterEggProvider() {
  const pathname = usePathname() ?? "/";
  const hydrated = useHydrated();
  const { count, total } = useGemState();

  const [active, setActive] = useState<Active | null>(null);
  const [queued, setQueued] = useState<Active | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [trailing, setTrailing] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const activeRef = useRef<Active | null>(null);
  activeRef.current = active;

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  /** Opens a game, or holds it until the current one is closed. */
  const start = useCallback((next: Active) => {
    if (activeRef.current) {
      if (activeRef.current.id === next.id) return;
      setQueued((held) => held ?? next);
      return;
    }
    setActive(next);
  }, []);

  const close = useCallback(() => {
    setActive(null);
    setQueued((held) => {
      if (held) window.setTimeout(() => setActive(held), 260);
      return null;
    });
  }, []);

  /**
   * Awards a gem and celebrates it — once. A replay of a game already won is
   * still a game worth playing, it just doesn't rain confetti a second time.
   */
  const win = useCallback(
    (id: string) => {
      if (!awardGem(id)) return;
      const fresh = count + 1;
      sparkleBurst({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        reducedMotion,
        count: 26,
        spread: 140,
      });
      if (fresh >= total) {
        confettiFall(reducedMotion);
        setCelebrate(true);
      }
    },
    [count, reducedMotion, total],
  );

  /**
   * Replaying from the tray or the console. Ids that aren't openable games —
   * the treasure hunt, the diya strip — are simply ignored rather than
   * throwing: they have no overlay to show.
   */
  const open = useCallback(
    (id: string) => {
      if (id in load) start({ id: id as GameId });
    },
    [start],
  );

  /* ---------------------------------------------------------- triggers */

  const lunar = LUNAR.test(pathname);
  const idle = !active && !NO_VAULT.test(pathname);

  useKonamiCode(() => start({ id: "diamond-catch" }), hydrated);
  useLogoClickBurst(() => start({ id: lunar ? "lantern-match" : "gem-memory" }), hydrated);
  useShiftClickLogo(() => start({ id: "four-cs-quiz" }), hydrated);
  useTypedWord("loupe", () => start({ id: "spot-the-flaw" }), hydrated);
  useKeyPressCount("c", 3, 2000, () => start({ id: "gem-cut-puzzle" }), hydrated);
  useKeyPressCount("/", 1, 1000, () => start({ id: "secret-console" }), hydrated);
  useTripleClick("footer", () => start({ id: "ring-toss" }), hydrated);
  useIdleTimer(60_000, () => start({ id: "vault-cracker" }), hydrated && idle);
  useShakeOrDrag(() => start({ id: "snow-globe" }), hydrated && WINTER.test(pathname));

  useHoverDuration(
    '[data-easter-egg="product"]',
    3000,
    (element) => {
      const carat = Number(element.dataset.carat);
      if (!Number.isFinite(carat)) return;
      start({ id: "carat-guesser", carat, piece: element.dataset.piece ?? "this piece" });
    },
    hydrated,
  );

  /*
    A way in for phones.

    Four of these games are opened by the keyboard — the Konami code, a typed
    word, a repeated key, a slash — and none of those exist on a touchscreen.
    A long press on the logo opens the console instead, and the console's own
    `gems` command lists the hints for everything else, so a visitor with no
    keyboard has a door into the hunt rather than a locked half of it.
  */
  useHoverDuration(LOGO_SELECTOR, 800, () => start({ id: "secret-console" }), hydrated, true);

  // The trail is the one effect with no overlay and no gem. The listener is
  // cheap and lives here; the renderer only loads once somebody flourishes.
  useFastMouseMove(
    '[data-easter-egg="hero"]',
    () => setTrailing(true),
    hydrated && !reducedMotion && !trailing,
  );

  if (!hydrated) return null;

  const Game = active ? load[active.id] : null;

  return (
    <EasterEggContext.Provider value={{ reducedMotion, open }}>
      {Game && active ? (
        <Game
          onClose={close}
          onWin={() => win(active.id)}
          reducedMotion={reducedMotion}
          carat={active.carat ?? 0}
          piece={active.piece ?? ""}
        />
      ) : null}

      {trailing ? <SparkleTrail reducedMotion={reducedMotion} /> : null}

      <TreasureHunt
        reducedMotion={reducedMotion}
        onWin={() => win("treasure-hunt")}
        paused={Boolean(active)}
      />

      {DIWALI.test(pathname) ? (
        <DiyaSequence reducedMotion={reducedMotion} onWin={() => win("diya-sequence")} />
      ) : null}

      {/*
        The tray stays out of the way until there is something in it. A counter
        reading "0 / 13" on a first visit would advertise the hunt and spoil it;
        the first gem is the invitation.
      */}
      {count > 0 ? (
        <GemTray celebrate={celebrate} onDismissCelebration={() => setCelebrate(false)} />
      ) : null}
    </EasterEggContext.Provider>
  );
}
