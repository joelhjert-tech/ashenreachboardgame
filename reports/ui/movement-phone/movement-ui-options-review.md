# Ashen Reach Phone Movement UI Options Review

## Scope and prototype access

These are development-only comparison prototypes. They do not replace the production movement UI and are ignored by production builds.

- Option A: `/?movementUi=option-a`
- Option B: `/?movementUi=option-b`
- Production/current UI: omit `movementUi`

Both options consume the same `PublicMovementPlannerState`, active Contract projection, tile asset resolver, and existing `MOVEMENT_ROLL_REQUESTED`, `MOVEMENT_DESTINATION_PREVIEWED`, and `MOVE_REQUESTED` intents. The QA fixture places the operative at the canonical `ashwake-crossing` graph node with a movement value of one; the server planner produces the four real adjacent destinations.

## Baseline problems

Reviewed screenshots: `baseline/01-roll-required-390x844.png` through `baseline/05-destination-selected-390x844.png`.

- The roll instruction appeared in the transient required-action panel, the green movement guidance panel, and the movement card.
- The completed movement roll remained a combat dice presentation with `ATTACK`, `DEFENSE`, and `A 2 / D - / +0` labels.
- The current tile, dice, movement totals, destination count, and legal-route heading consumed most of the first viewport before a destination could be compared.
- Destination selection opened a separate long detail view, moving other choices out of context.
- The confirmation label was generic (`CONFIRM MOVE`) instead of naming the destination.
- The global `MOVE / Show Tabs` dock competed with the movement action.
- Technical copy such as stored-roll legality, exact-route diagnostics, and server-record language was visible before it was useful.

## Option A — Tactical Destination List

### Interaction flow

1. Roll from the single sticky movement action.
2. Tap any legal destination card in the shared list.
3. Review the selected gold frame and optional collapsed details.
4. Confirm the named destination in the persistent action dock.

### Strengths

- Fastest side-by-side comparison of danger, shop/service, reward, and mission markers.
- One tap selects a destination while retaining nearby alternatives.
- Four or more destinations remain a conventional single-page list; no carousel memory is required.
- The entire decision surface is tappable while details remain a separate 44 px control.

### Weaknesses

- Artwork is smaller than Option B.
- Long lists still require vertical scrolling.
- The information density is better for optimizers than for players who prefer one choice at a time.

At 390×844, two complete destination cards and most of a third are visible before scrolling. Four destinations require one short vertical scroll to inspect the final card.

Screenshots:

- `option-a/01-roll-required-390x844.png`
- `option-a/02-roll-completed-390x844.png`
- `option-a/03-four-legal-destinations-390x844.png`
- `option-a/04-destination-selected-390x844.png`
- `option-a/05-details-expanded-390x844.png`
- `option-a/06-long-destination-name-390x844.png`
- `option-a/07-special-ring-transition-390x844.png`
- `option-a/08-selected-{360x800,390x844,412x915,430x932}.png`
- `option-a/09-movement-confirmed-390x844.png`

## Option B — Focused Destination Deck

### Interaction flow

1. Roll from the single sticky movement action.
2. Compare the focused destination using previous/next controls or a direct route indicator.
3. Select the focused destination from the persistent action.
4. Confirm the named destination from the same action region.

### Strengths

- Strongest visual focus and largest use of canonical tile artwork.
- A single destination’s danger, reward/service, mission state, and lore are easy to parse.
- Previous/next controls and direct route indicators work without horizontal page scrolling.
- The deck better resembles a board-game choice than a web results list.

### Weaknesses

- Comparing all four destinations takes more interaction and working memory.
- Sequential previous/next comparison can require three focus changes; direct route indicators reduce this to one tap per destination.
- Long lore and expanded special-route details require vertical scrolling, although the confirmation action remains visible.

To compare four destinations exhaustively, a player can use up to three next taps, then one selection and one confirmation. Direct route indicators reduce non-adjacent comparison to one focus tap.

Screenshots:

- `option-b/01-roll-required-390x844.png`
- `option-b/02-roll-completed-390x844.png`
- `option-b/03-four-legal-destinations-390x844.png`
- `option-b/04-destination-selected-390x844.png`
- `option-b/05-details-expanded-390x844.png`
- `option-b/06-long-destination-name-390x844.png`
- `option-b/07-special-ring-transition-390x844.png`
- `option-b/08-selected-{360x800,390x844,412x915,430x932}.png`
- `option-b/09-movement-confirmed-390x844.png`

## Screenshot review and corrective pass

The first prototype render exposed four concrete issues:

1. The existing `Required now` strip still duplicated the prototype instruction.
2. Option B’s first artwork height pushed its route controls too close to the sticky dock on 360×800.
3. A native expanded-details state could persist when Option B focused a new authoritative destination.
4. Scrolling a long or special route into view could leave the next movement state above the visible phone frame; the travel header also contradicted the travel body by saying `Roll required`.

Corrections made after visual review:

- Suppressed the transient required-action strip only while a development movement prototype is active.
- Reduced Option B artwork height at normal and short-phone breakpoints.
- Keyed the focused details panel by stable destination ID so each destination starts collapsed.
- Reset both movement scroll regions on authoritative origin/roll changes and disabled scroll anchoring inside the prototype.
- Added an explicit `Travel confirmed` header with the real origin and destination.
- Recaptured all Option A and Option B states after the corrective pass.

Final browser assertions passed for 360×800, 390×844, 412×915, and 430×932: no horizontal overflow, the primary action remains inside the viewport, and the action and contextual navigation occupy separate non-overlapping regions.

## Four critique seats

### New player

Option B makes the immediate next action clearest because only one destination is dominant. Option A remains understandable, but its simultaneous cards ask the player to scan more labels at once.

### Optimizer

Option A makes destination comparison materially faster. Danger, mission, and service differences are visible without changing focus.

### Family player

Option B requires less reading at one time and provides larger artwork and controls. Direct route indicators avoid demanding precise swipe gestures.

### Rules lawyer

Both preserve exact route details without putting them in the default hierarchy. Option A makes it easier to compare several routes while Option B gives a cleaner reading of one route’s gates, services, and authored rule.

## Recommendation

Use **Option A** if the priority is fast tactical comparison and lower interaction count. Use **Option B** if the priority is cinematic focus, larger artwork, and new-player comprehension.

The recommendation for general mixed groups is **Option B**, provided playtesting confirms that sequential comparison is not frustrating with five or more routes. For optimizer-heavy sessions, Option A is the stronger default. No option has been selected or promoted to production by this prototype task.

## Remaining risks

- A real session with more than four destinations should be playtested for list length (Option A) and comparison fatigue (Option B).
- The development fixture proves a canonical ring transition and four-route graph state, but rare simultaneous Route Star, Void Key, and compass prompts still need final-design playtesting after an option is selected.
- Production code deliberately ignores both query parameters; choosing an option will require a separate implementation pass and removal or promotion of the development gate.

## Verification results

- `npm.cmd run validate:content` — passed; 17 characters, 71 gear, 109 threats, 36 contracts, 20 anomalies, 30 artifacts, 24 followers, 15 scars, 16 escalations, and 30 afflictions validated.
- `npm.cmd run typecheck` — passed after the final screenshot correction.
- Focused prototype, phone navigation, QA fixture, and movement/Route Star tests — 147 tests passed during development; final prototype/navigation/fixture rerun passed 73 tests.
- `npm.cmd run test:client` — 28 files / 306 tests passed.
- `npm.cmd run test` — 121 files / 1,299 tests passed.
- `npm.cmd run audit:assets` — 418/418 assets present; zero missing, invalid, placeholder, or release-blocking assets.
- `npm.cmd run build` — passed after final changes; 147 modules transformed.
- Browser capture — 24 final option screenshots, four responsive sizes, zero console errors, zero horizontal overflow, and no action/navigation overlap.
- `git diff --check` and `git diff --cached --check` — passed (line-ending conversion warnings only; no whitespace errors).
