# Code Review Log — Easter Egg Games

- **Date:** 2026-09-18
- **Branch reviewed:** `easter-egg-games`
- **Scope:** Diff introducing the easter-egg game system (`src/components/easter-eggs/**`)
- **Tool:** `/code-review` (inline pass)
- **Reviewer:** Claude (Sonnet 5)

## Summary

15 findings: 8 correctness bugs, 4 reuse/duplication issues, 2 dead-code/complexity issues, 1 performance issue.

---

## Correctness Bugs

### 1. `play <id>` console command bypasses replayability gating
- **File:** [src/components/easter-eggs/games/secret-console.tsx:112](src/components/easter-eggs/games/secret-console.tsx#L112)
- **Summary:** The secret console's `play <id>` command reopens any collected gem via the generic `open()` path with no gating for games that need extra context, so `play carat-guesser` renders a broken game.
- **Failure scenario:** After legitimately finding Carat Guesser once (via the 3s product hover, which supplies `carat`/`piece`), the visitor opens the secret console (long-press logo or `/`) and types `play carat-guesser`. `open(gem.id)` → `easter-egg-provider.tsx:157` `start({ id })` with no carat/piece → rendered with `carat={active.carat ?? 0}` and `piece={active.piece ?? ""}` (provider.tsx:218-219, both explicitly defined, not undefined). Because `piece` is `""` not `undefined`, CaratGuesser's own default `piece = "this piece"` never applies, so the heading is blank; with `carat=0`, the "real weight" always reveals as "0.00 ct" and any guess of 0.25 is scored as a win. `gem-tray.tsx`'s `REPLAYABLE` set deliberately excludes `carat-guesser` for exactly this reason, but `secret-console.tsx` has no equivalent check.

### 2. `play treasure-hunt` / `play diya-sequence` silently no-op
- **File:** [src/components/easter-eggs/games/secret-console.tsx:111](src/components/easter-eggs/games/secret-console.tsx#L111)
- **Summary:** These commands print a false "Opening …" confirmation and then do nothing.
- **Failure scenario:** Both ids are valid, collectible entries in `GEMS`, so they pass the console's only check (`gemsCollected.includes(gem.id)`) and print `Opening ${gem.name}…` before calling `open(gem.id)`. But `open()` (`easter-egg-provider.tsx:155-160`) only starts games whose id is a key of `load`, and treasure-hunt/diya-sequence are always-mounted ambient components that are never in `load` — so `open` is a documented no-op for them. The visitor sees a confirmation message and then nothing happens, with no error explaining why.

### 3. Ring Toss: `pull` is not actually clamped to 1
- **File:** [src/components/easter-eggs/games/ring-toss.tsx:62](src/components/easter-eggs/games/ring-toss.tsx#L62)
- **Summary:** `measure()` clamps the wrong sub-expression, so drag power (`pull`) is not capped despite the comment saying it is.
- **Failure scenario:** `Math.max(0, Math.min(1, 0.22 - fromLeft) / 0.22)` clamps `(0.22 - fromLeft)` to at most 1 *before* dividing by 0.22, then never re-clamps the quotient. Since `pointermove` is bound on `window` (lines 91-92), dragging left past the lane's own edge makes `fromLeft` negative (e.g. -1), yielding `pull ≈ 4.5` instead of ≤1. The displayed pull-strength bar shows nonsense like "450%" and the resulting throw (`landed = power * REACH`) flies far outside the scorable lane.

### 4. Ring Toss: arc-height formula divides `flight` by itself
- **File:** [src/components/easter-eggs/games/ring-toss.tsx:110](src/components/easter-eggs/games/ring-toss.tsx#L110)
- **Summary:** The parabolic arc collapses to ~0 for virtually the whole throw.
- **Failure scenario:** `ringAt = flight` whenever `flight !== null` (line 108, since `??` only falls back on null/undefined). `lift = Math.sin((flight / Math.max(1, ringAt || 1)) * Math.PI)` therefore reduces to `sin((flight/flight)*PI) = sin(PI) ≈ 1.2e-16 ≈ 0` for any flight distance ≥ 1 — which happens within the first ~2% of every throw's animation (since `landed` is usually well over 1). Every toss renders as a flat horizontal slide with no visible arc, contradicting the intended interpolated-arc behavior.

### 5. Ring Toss: flying ring uses a different coordinate system than pegs/landed shots
- **File:** [src/components/easter-eggs/games/ring-toss.tsx:186](src/components/easter-eggs/games/ring-toss.tsx#L186)
- **Summary:** The flying/idle ring is drawn at `12 + ringAt`%, while pegs and landed shots use the raw, unshifted percentage.
- **Failure scenario:** Pegs render at `left: ${peg.at}%` (line 154, e.g. 34/60/84) and landed shots at `left: ${shot.landed}%` (line 175, clamped 2-98), but the in-flight ring renders at `left: ${12 + ringAt}%` (line 186) where `ringAt` equals the same `flight`/`landed` value. At the end of any flight the ring visually sits at `12 + landed`%, then the moment `flight` clears to null (520ms later) the corresponding shot marker appears at plain `landed`% — 12 percentage points to the left — so the ring appears to teleport backward every time it lands. Combined with the unclamped-pull bug (#3), a hard drag can send the flying ring off past 100% and out of the `overflow-hidden` lane entirely before it "pops" back into view as a shot.

### 6. Vault Cracker: combination digit double-counts links when mobile nav is open
- **File:** [src/components/easter-eggs/games/vault-cracker.tsx:35](src/components/easter-eggs/games/vault-cracker.tsx#L35)
- **Summary:** The vault's first combination digit counts links across every DOM node matching `header nav[aria-label="Primary"]`, and `site-header.tsx` can have two such navs mounted at once.
- **Failure scenario:** `site-header.tsx` renders a desktop `<nav aria-label="Primary">` (line 120, always present, merely CSS-hidden below `xl`) plus a second `<nav aria-label="Primary">` that mounts only while the mobile/tablet menu is open (lines 191, 233). If a visitor on a narrow viewport opens the hamburger menu and then goes idle for 60s (the exact condition `useIdleTimer(60_000, ...)` needs to open the vault — opening the menu itself counts as "activity" but leaving it open afterward does not reset the timer again), `combination()` sums `<a>` tags from both navs simultaneously, doubling the digit the puzzle expects — breaking the file's own stated guarantee that "the answer is always derivable and never guessed."

### 7. `close()` schedules an uncancelable timeout that can clobber a newer game
- **File:** [src/components/easter-eggs/easter-egg-provider.tsx:122](src/components/easter-eggs/easter-egg-provider.tsx#L122)
- **Summary:** Closing a game with another queued behind it arms a 260ms timer with no stored handle, so nothing can cancel it.
- **Failure scenario:** Game A is active with Game B queued behind it. Visitor closes A: `setActive(null)` runs and `setQueued` immediately resets `queued` to null while arming `window.setTimeout(() => setActive(held), 260)` for B — the timer handle itself is never stored, so nothing can cancel it. If the visitor triggers Game C within that 260ms window (e.g. another Konami-code entry, or a hover trigger), `start()` sees `activeRef.current === null` and opens C directly. ~260ms after the original close, the stale timer still fires and force-replaces C with B, even though B was queued from an unrelated, earlier trigger the visitor may have forgotten about.

### 8. `bumpCounter` assumes stored counters are numbers without validating
- **File:** [src/components/easter-eggs/gem-store.ts:251](src/components/easter-eggs/gem-store.ts#L251)
- **Summary:** `read()` never validates that stored counter/score values are actually numbers, only that the containing object is non-null.
- **Failure scenario:** `read()` (lines 176-177) accepts `raw.counters` as-is once it's a non-null object, without checking each value's type (unlike `gemsCollected`, which is filtered element-by-element). If `isg_easter_eggs_v1` in localStorage ever contains `counters: {"treasure-hunt": "2"}` (hand-edited, or written by a future schema change reusing the same key), `bumpCounter`'s `(current.counters[key] ?? 0) + by` becomes `"2" + 1 = "21"` (string concatenation, not addition), and `treasure-hunt.tsx`'s `found >= TOTAL` check then coerces it back, reporting the hunt complete after a single further click instead of three.

### 9. Vault Cracker: clearing a digit input silently snaps it to 0
- **File:** [src/components/easter-eggs/games/vault-cracker.tsx:124](src/components/easter-eggs/games/vault-cracker.tsx#L124)
- **Summary:** `Number("")` returns `0`, not `NaN`, so clearing a wheel's input silently changes puzzle state.
- **Failure scenario:** `Number(e.target.value.replace(/\D/g, "").slice(-1))`: if the stripped string is empty (user selects and deletes the digit), `Number("")` is `0`, and `Number.isFinite(0)` is `true`, so the wheel immediately becomes `0` instead of being left unchanged or rejected — a minor but real `Number("")` foot-gun that silently changes the puzzle state without the visitor typing a digit.

---

## Reuse / Duplication

### 10. Overlay re-implements focus-trap/scroll-lock logic instead of sharing it
- **File:** [src/components/easter-eggs/shared/overlay.tsx:45](src/components/easter-eggs/shared/overlay.tsx#L45)
- **Summary:** A third near-identical copy of modal focus-trap/scroll-lock/Escape logic now exists alongside `enquiry-dialog.tsx` and `site-header.tsx`'s mobile drawer.
- **Failure scenario:** `overlay.tsx`'s own doc comment admits it "follows the enquiry drawer's behaviour deliberately — same trap, same scroll lock, same focus restore" and indeed duplicates `enquiry-dialog.tsx`'s identical `FOCUSABLE` selector string and identical scrollbar-width `paddingRight` compensation (`enquiry-dialog.tsx` lines 12, 47-51) verbatim instead of extracting a shared `useFocusTrap`/`useModalBehavior` hook. A future accessibility fix (e.g. handling `inert`, or a focus-trap edge case) now has to be found and applied in three separate places or it silently drifts out of sync in two of them.

### 11. Three trigger hooks duplicate the identical sliding-window counting snippet
- **File:** [src/components/easter-eggs/triggers/use-key-press-count.ts:34](src/components/easter-eggs/triggers/use-key-press-count.ts#L34)
- **Summary:** The same counting logic is copy-pasted verbatim across three hooks instead of being shared.
- **Failure scenario:** `hits.current = [...hits.current.filter((t) => now - t < withinMs), now]; if (hits.current.length >= count) { hits.current = []; fire(); }` appears byte-for-byte in `use-key-press-count.ts:34`, `use-triple-click.ts`, and `use-logo-click-burst.ts`, all new in this diff, alongside the already-extracted shared `useEventCallback`/`isTypingTarget` helpers. A future change to the reset-on-fire policy (or a fix to a timing edge case) must be applied three times and can easily drift out of sync between the three trigger hooks.

### 12. `useHydrated` in `gem-store.ts` duplicates `use-shortlist.ts`'s implementation
- **File:** [src/components/easter-eggs/gem-store.ts:269](src/components/easter-eggs/gem-store.ts#L269)
- **Summary:** A byte-for-byte copy of an existing hook, part of a larger duplicated localStorage/`useSyncExternalStore` pattern.
- **Failure scenario:** `gem-store.ts`'s own doc comment says it uses "the same store pattern as the shortlist," but rather than reusing or factoring a shared `createLocalStore` helper, it re-implements the full cache/listeners/read/write/subscribe/getSnapshot/useHydrated plumbing a third time (`use-shortlist.ts` and `use-saved-builds.ts` already each have their own copy). Any future fix to the storage-event or SSR-safety handling needs to be repeated in a third file.

### 13. Seasonal route-gating regexes hand-encode slugs instead of deriving them from the seasonal registry
- **File:** [src/components/easter-eggs/easter-egg-provider.tsx:64](src/components/easter-eggs/easter-egg-provider.tsx#L64)
- **Summary:** WINTER/LUNAR/DIWALI regexes were hand-assembled rather than generated from `src/lib/seasonal/`.
- **Failure scenario:** The regexes were assembled by manually reading every seasonal page's folder name (christmas, christmas-eve, boxing-day, heiligabend, natale, reveillon-noel, dia-de-reyes, chinese-new-year) rather than being generated from `src/lib/seasonal/*.ts`, which already models regions/occasions. Adding a new seasonal Christmas-family or Lunar-New-Year page later (e.g. a new locale) will silently fail to light up Snow Globe/Lantern Match — no build error, no runtime warning, the regex simply won't match — exactly the kind of drift the file's own DIWALI comment already concedes happens for the India region case.

---

## Dead Code / Unnecessary Complexity

### 14. `SHOW_COMPLETION_CODE` is a permanently-false flag threaded through two files
- **File:** [src/components/easter-eggs/gem-tray.tsx:222](src/components/easter-eggs/gem-tray.tsx#L222)
- **Summary:** A discount-code display path gated behind a flag that's documented as permanently off.
- **Failure scenario:** `gem-store.ts` documents that the flag is off because "nothing on this site carries a price" and should only be turned on if the business changes that. Until then, `gem-tray.tsx` carries a full conditional branch and an unused `COMPLETION_CODE` import/render path that always evaluates to the same "no code" message — dead complexity that a future maintainer has to read through to confirm it truly never fires.

### 15. Idle timer resets on every mousemove/scroll with no throttling, running site-wide
- **File:** [src/components/easter-eggs/triggers/use-idle-timer.ts:50](src/components/easter-eggs/triggers/use-idle-timer.ts#L50)
- **Summary:** High-frequency events trigger unthrottled timer resets on nearly every page view.
- **Failure scenario:** `ACTIVITY` includes `mousemove`, `touchmove`, `scroll`, `wheel` (lines 50-51), each bound at the `window` level, and `onActivity` calls `window.clearTimeout` + `window.setTimeout` on every single firing with no throttling. Since `EasterEggProvider` mounts this hook globally whenever no game is active and the page isn't excluded by `NO_VAULT`, ordinary cursor movement or scrolling on any page now does two Timer-API calls per animation frame's worth of mouse events, for a feature that only needs to know whether 60 seconds have passed.

---

## Suggested Priority

1. **Fix first (visible bugs on the golden path):** #3, #4, #5 (Ring Toss is visibly broken — no arc, wrong clamp, teleporting ring), #1 and #2 (secret console commands break/no-op), #6 (vault combination can be undeterminable).
2. **Fix soon (state integrity):** #7 (game-switch race), #8 (counter type safety), #9 (input UX).
3. **Cleanup when convenient:** #10–#13 (duplication), #14 (dead flag), #15 (perf/hygiene).
