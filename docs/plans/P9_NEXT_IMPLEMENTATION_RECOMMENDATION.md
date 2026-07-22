# P9 Next Implementation Recommendation

## Recommendation

Proceed with one bounded slice: **P10 — Transition Continuity and Responsive Recovery**.

This is the smallest slice that materially improves a complete live turn. It repairs two observed player-facing defects, removes three recurring clarity costs, and restores dependable audit coverage without reopening the rules or redesigning a system that already works.

## In scope

1. Keep the completed TV movement route and destination visibly settled before the following encounter presentation takes focus.
2. Remove the phone Shop collision between stock navigation and the sticky Leave Shop action at 360×800, 390×844, 412×915, and 430×932.
3. Consolidate duplicated phone waiting context into one authoritative status block.
4. Move focus once to the new required setup stage when operative or mission selection appears.
5. Shorten the TV supporting status line so it never repeats or truncates essential context at 1366×768.
6. Replace `BATTLE 0` with an accurate player-facing enemy calculation label.
7. Repair the P2 and P3 capture waits and correct the P8 reconnect capture URL so future evidence measures stable product states.

## Evidence supporting the slice

- Two independent fresh P2 campaigns failed at the same arrival observation while the captured TV frame had already advanced to the destination Hazard.
- Fresh P6 captures show the Shop bottom-control collision at both 390×844 and 360×800.
- Fresh P4 waiting captures show duplicate actor/context framing.
- Fresh P5 setup inspection found focus remaining on the document when a new required selection appeared.
- Fresh P8 host captures show supporting status truncation and the technical `BATTLE 0` label.
- No P0 authority, privacy, replay, save, or phone/TV disagreement was found, so a larger mechanical slice is not justified.

## Required server work

None is expected. If implementation discovers that a stable transition revision is not projected, expose only the existing authoritative transition identity; do not introduce client-owned progression, timers, or outcomes.

## Required phone work

- Reserve one coherent bottom safe-area region for Shop navigation and exit.
- Consolidate waiting status without losing actor or public-safe reason.
- Apply focus once when the authoritative setup-stage revision changes.

## Required host work

- Present completed arrival once before the next focused encounter takes visual priority.
- Keep primary public status complete and secondary copy concise.
- Relabel enemy calculation inputs without changing their values.

## Privacy boundaries

- TV must remain public-only.
- Waiting phones must not receive the acting player's choices, stock, inventory, rewards, or Rivalry state.
- Shortened status copy must not infer private activity more specifically than the projection permits.

## Reconnect requirements

- A completed movement must not replay.
- An in-progress authoritative route may restore at the correct current segment or reduced-motion equivalent.
- Shop state, waiting reason, setup stage, and battle result must restore from projection without a local synthetic revision.

## Reduced-motion requirements

- Arrival remains visible as a restrained destination emphasis and text state rather than continuous travel.
- No essential origin, destination, actor, result, or next-action information may be removed.
- Shop, waiting, focus, and battle-label corrections must be identical in information content.

## Explicitly out of scope

- Gameplay rules, movement duration on the server, movement topology, encounter order, battle math, tie behavior, shops/economy, missions, saves, or event schemas.
- Any new animation that blocks gameplay.
- Phone navigation redesign, TV map redesign, objectives/endgame redesign, or Rivalry UX.
- New fixtures that fabricate private or unreachable states.
- Heat, new cards, new assets, or content changes.

## Implementation guardrails

- Read the completed authoritative state; never make animation the source of truth.
- A reconnect into a completed route must show the current encounter, not replay travel.
- Reduced motion must retain origin, destination, and arrival information without continuous travel.
- Use a single phone bottom safe-area contract for Shop controls.
- Waiting copy must retain actor, required action, and privacy-safe reason.
- Focus may move only on a genuinely new authoritative setup stage.
- TV secondary status may truncate; the primary state and acting player may not.

## Acceptance gates

### Movement

- Every route segment matches the authoritative route.
- A completed arrival is visually observable once in normal motion.
- The next Hazard, Challenge, Threat, or Action state appears once.
- Reconnect does not replay a completed route or result.
- No client callback advances gameplay.

### Shop

- Stock Previous/Next and Leave Shop never overlap at all four phone widths.
- Primary action remains above browser controls and safe areas.
- Affordable, unaffordable, sold-out, unrevealed, purchase, sale, and reconnect states remain unchanged mechanically.

### Shared clarity

- Waiting state names the actor and required action once.
- Setup stage focus is deterministic and does not oscillate.
- TV primary status remains fully readable at 1366×768 with the longest valid player name.
- Battle arithmetic labels are player-facing while values remain identical.

### QA harness

- P2 and P3 campaigns pass twice consecutively.
- Intentional missing-art fallbacks do not block capture completion.
- All helper-started servers stop after each campaign.

## Required evidence

- Phone: 360×800, 390×844, 412×915, 430×932.
- TV: 1366×768, 1600×900, 1920×1080.
- Standard and reduced-motion movement arrival.
- Shop carousel at first, middle, and last offers plus Leave Shop.
- Public wait, private-decision wait, setup operative selection, setup mission selection, and battle result.
- Console, overflow, privacy, replay, and reconnect review.

## Required fixtures

- Canonical multi-segment movement ending in a Hazard or Challenge.
- Reduced-motion version of the same route.
- Shop with at least four offers plus affordable, unaffordable, sold-out, and unrevealed states.
- Public waiting, owner-private decision, longest valid player name, setup stage changes, and resolved battle arithmetic.

Fixtures may select authoritative state but may not bypass reducers, project private fields to TV, or make animation determine progression.

## Required tests

- TV route segment order, arrival-once behavior, encounter-once behavior, reconnect, and reduced motion.
- Phone Shop no-overlap geometry and safe-area behavior at every target width.
- Waiting projection/privacy and live-region deduplication.
- Setup focus changes once per authoritative stage revision.
- TV longest-name/status fit and unchanged battle totals/outcomes.
- Two consecutive clean P2/P3 audit campaigns with all helper-started services stopped.

## Risks

- Holding an old presentation too long could make TV appear behind the phone.
- Local animation memory could replay after reconnect if it is not keyed to authoritative revisions.
- Bottom safe-area changes could reduce visible Shop content or overlap browser chrome.
- Focus correction can become focus stealing if tied to renders instead of stage identity.
- Shortened TV copy can become ambiguous or accidentally reveal a private action.

## Why not a larger feature next

The complete journey is already coherent: setup, legal movement, battle calculation, consequences, results, shop authority, inventory return, and handoff all work. Starting a new feature now would leave two visible interaction defects in the main loop and keep the audit harness unreliable. P10 closes those seams with low authority risk, after which full-session playtesting becomes more valuable than another isolated redesign.
