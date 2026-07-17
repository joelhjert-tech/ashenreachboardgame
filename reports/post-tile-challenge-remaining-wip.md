# Post-Tile-Challenge Remaining WIP Inventory

## Scope and baseline

This inventory classifies the dirty worktree after `b56db83` (persistent tile challenges), `26c29f9` (mission integration), and `e5c254d` (slow shop-test hardening). It is report-only: none of the seven inspected source files were changed during classification.

The intended next extraction boundary is: **TV movement journey uses canonical board-tile artwork and presents origin, route steps, destination, and arrival challenges without changing movement rules.**

## File and hunk classification

| File / hunk | Group | Intended feature | Overlap with landed work | Completeness | Extraction risk | Recommended commit | Dependencies | Tests required |
|---|---|---|---|---|---|---|---|---|
| `src/client/tv/HostMovementJourney.tsx` (untracked) | A | Dedicated tile-by-tile host journey; origin, route, current step, destination, arrival challenges, focus | Consumes already-landed public `tileChallenges`; does not duplicate lifecycle mechanics | Substantially implemented, but contains visibly mis-decoded glyphs (`â†’`, `â—`, `Â·`) that must be corrected before extraction | Medium | `feat: add host movement journey presentation` | `PublicMoveDestination`, `PublicTileChallenge`, canonical board tile renderer | Component tests for ordered route, one/long route, focus, arrival reveal, fallback art, reduced motion |
| `src/client/tv/TalismanBoardSurface.tsx` export/className hunk | B | Reuse the production board's canonical `BoardTileImage` resolver and fallback inside journey tiles | No mechanics overlap; this is the correct synchronization point with board assets | Small and coherent | Low | Same movement-journey commit | Existing tile manifest/resolver and missing-art fallback | Distinct canonical paths, fallback behavior, origin/intermediate/destination images |
| `src/client/tv/TvApp.tsx` movement-arrival model, event identity, journey state/timing, journey rendering, completion focus | A/C | Detect accepted authoritative movement from consecutive public projections; play once by sequence/seat/destination; hand off public destination challenges; restore focus | Reads landed challenge projection only; no challenge or mission mutation | Functionally broad but incomplete as an isolated slice: arrival detection depends on prior planner projection and route data; needs focused fake-timer coverage and review of battle/encounter handoff priority | High | Same movement-journey commit, movement hunks only | `HostMovementJourney`, existing public movement planner, canonical projection sequence | No replay on patches/rerender, new movement replay, board absence, focus restoration, direct encounter/battle handoff, missing-route fallback |
| `src/client/tv/TvApp.tsx` `DedicatedBattleStage` and battle focus-return hunks | C, separate | Dedicated host battle chamber and post-battle focus restoration | Unrelated to movement and tile-challenge commits | Appears implemented and tested but is a separate accepted feature | High if mixed into journey extraction | Separate battle-presentation commit | `HostBattleOverlay`, `isHostBattleActive` | Battle entry/exit, board absence, waiting/resolution/result, responsive/browser transition |
| `src/client/tv/__tests__/TvApp.test.tsx` journey assertion replacement | A/C | Assert canonical tile art, missing-art fallback, board absence, arrival, and journey focus | Uses landed challenge/public projection; no mechanics duplication | Partial: covers one flow with real timers, but not the requested journey matrix | Medium | Same movement-journey commit after strengthening | Movement component and TvApp wiring | Fake-timer route steps, no restart, long/direct routes, challenge reveal, handoffs, focus |
| `src/client/tv/__tests__/TvApp.test.tsx` removed recurring-challenge separation test | C / landed-feature regression | Removes a focused projection/UI regression from the dirty version | Directly overlaps the landed tile-challenge foundation test coverage | Not appropriate for the movement slice; deletion would weaken landed regression protection | High | Exclude; retain the existing test from HEAD | Landed tile challenge foundation | Existing recurring challenge versus threat test must remain green |
| `src/client/tv/__tests__/TvApp.test.tsx` battle-stage and focus-return assertions | C, separate | Verify dedicated battle chamber and board focus restoration | Unrelated to movement journey | Coherent battle test work | High if bundled | Separate battle-presentation commit | Dedicated battle hunks in `TvApp` and styles | Focused TV and deterministic same-session transition coverage |
| `src/client/phone/PhoneInventoryPanel.tsx` | D | Collapsible inventory groups with `aria-expanded` and group counts | None | Small and coherent, but requires its own UX/tests | Low alone; high if mixed into TV slice | `feat: add collapsible phone inventory groups` | Phone inventory view models and associated CSS | Expand/collapse, accessible state, retained actions, long names, mobile layout |
| `scripts/validate-content.ts` | E | Phase 1 passive Equipment validation with an explicit deferred allowlist | None; predates tile challenge work | Coherent but belongs to item-effect normalization | Low alone | Item-effect validation commit | Gear schema/content classifications | Validation accepts allowlist and rejects undeclared passive Equipment |
| `src/client/styles.css` movement journey selectors | F/A | Route tiles, canonical art viewport, current/completed/upcoming state, destination and challenge layout | Presentation only; consumes public challenge data | Broad initial implementation; responsive/reduced-motion/long-route rules need precise extraction and verification | High because the file contains many unrelated hunks | Same movement-journey commit, patch-stage only these selectors and required shared tokens | `HostMovementJourney` markup and established Ashengate tokens | 1280/1440/1920 layout, overflow, long route, reduced motion, arrival challenges |
| `src/client/styles.css` dedicated battle selectors | F/C, separate | Centered battle chamber | None | Separate feature | High if included | Separate battle-presentation commit | Dedicated battle stage | Responsive battle QA |
| `src/client/styles.css` phone/inventory selectors | F/D, separate | Phone visual system and inventory disclosures | None | Separate UI work | High if included | Phone inventory/design commit | `PhoneInventoryPanel` | 390x844 interaction and accessibility QA |
| `src/client/styles.css` global command-board/token restyling | F, separate | Wider approved host/phone visual treatment | None | Large cross-surface design WIP | Very high | Separate reviewed design-system commit(s) | Multiple host and phone components | Full responsive visual regression suite |

## WIP groups

- **A — Movement journey presentation:** `HostMovementJourney.tsx`; movement-specific `TvApp.tsx` state/wiring; journey tests; journey CSS.
- **B — Tile-art/board rendering:** the small `BoardTileImage` export and optional-class hunk in `TalismanBoardSurface.tsx`. This is a dependency of A, not a separate asset catalog.
- **C — TV integration:** movement event detection, presentation priority/focus, and tests. Dedicated battle-stage hunks in the same files are separate WIP and must not be pulled into the movement commit.
- **D — Phone inventory:** all current `PhoneInventoryPanel.tsx` changes plus its matching CSS. Exclude from movement extraction.
- **E — Validation:** all current `scripts/validate-content.ts` changes. Exclude from movement extraction.
- **F — Shared styling:** `styles.css` is heavily mixed. Extract only movement selectors and the minimum already-established tokens they reference; leave battle, phone, inventory, and broad command-board restyling behind.

## Recommended extraction boundary

The next clean presentation commit should include:

1. `src/client/tv/HostMovementJourney.tsx` after fixing encoding artifacts and adding focused component coverage.
2. Only the `BoardTileImage` reuse hunk from `src/client/tv/TalismanBoardSurface.tsx`.
3. Only movement-event identity, journey lifecycle, public challenge handoff, and focus behavior from `src/client/tv/TvApp.tsx`.
4. Only movement-journey tests from `src/client/tv/__tests__/TvApp.test.tsx`, while retaining the existing recurring-challenge regression and excluding battle-only assertions.
5. Only movement-journey selectors and necessary responsive/reduced-motion rules from `src/client/styles.css`.

Suggested commit: `feat: add host movement journey presentation`.

Do **not** include `PhoneInventoryPanel.tsx`, passive-equipment validation, dedicated battle-stage changes, unrelated global restyling, tile-challenge mechanics, mission lifecycle code, item mechanics, QA captures, visual-exploration material, `.codex-safety/`, or Relic references.

## Extraction risks and next verification

- `TvApp.tsx`, its test, and `styles.css` contain interleaved movement, battle, and broader design changes. Use patch-mode staging or reconstruct the movement slice in a clean worktree; do not stage whole files.
- Preserve the landed recurring-challenge TV test. Its deletion in dirty WIP is not part of movement presentation.
- Correct the mojibake in `HostMovementJourney.tsx` before committing.
- Confirm the movement event identity cannot replay on unrelated patches and that authoritative route order—not an inferred path—is rendered.
- Add deterministic fake-timer tests and browser captures for departure, mid-route, arrival, challenge reveal, direct next-state handoff, board restoration, long routes, and reduced motion.
- Verify the existing dedicated battle transition still passes after extracting movement wiring, but keep battle implementation changes outside this commit.

## Repository hygiene at classification time

No source file was modified by this inventory pass. The index was clean after the isolated shop-test commit. QA captures/logs, visual-exploration files, `.codex-safety/`, and `HostMovementJourney.tsx` remained untracked; Relic references were not staged or committed.
