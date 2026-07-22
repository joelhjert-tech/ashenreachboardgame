# Phone Action Priority Stack gameplay validation

## Test method

Validation combined three evidence layers:

1. Pure classifier and component tests for exact representation, ordering, disabled semantics, labels, and query-switch removal.
2. Canonical server/engine/integration suites for real intents, encounter lifecycle, turns, modes, privacy, reconnect, stale requests, rewards, payments, Scars, missions, shops, Equipment, Followers, and movement.
3. Browser QA through real HTTP/WebSocket sessions. The capture runner creates and configures games through the normal phone flow, uses the server QA endpoint only to place the same canonical projected state at difficult timing windows, and submits the real `START_TILE_ENCOUNTER` intent for the ready-to-active transition. Co-op waiting and Rivalry privacy use real two-player session setup.

## Gameplay matrix

| Area | Evidence | Result |
|---|---|---|
| Normal turns | `singlePlayerMovementLifecycle`, player-count matrix, tile-arrival lifecycle, engine turn tests | Ten single-player movements/turns complete; multiplayer advances to the next seat; no stale arrival ownership. |
| Encounter start | `tileEncounterStart`, Priority Stack component test, browser hazard ready/active | Start appears once, sends canonical ID/revision ownership, disappears after activation, stale/wrong owner/replay reject. |
| Hazard and Challenge | tile challenges, encounter lifecycle, item effects, Scar triggers, phone panel tests | Success/failure, modifiers, reactions, rewards/consequences, and continuation remain authoritative. |
| Battle | engine battle matrix, phone Battle tests, browser Battle capture | Dedicated Battle surface remains authoritative; general sector actions are not introduced into combat. |
| Salvage | phase 1F/1G, shop/economy, payment projections, browser payment capture | Gain/loss, floor-zero, optional payment, insufficient funds, reconnect, and result deltas remain correct. |
| Scars | Scar system, Scar triggers, owner control, browser third-Scar selector | Scar selector blocks unrelated actions; use limits and reconnect/replay protections remain intact. |
| Missions/Artifacts | mission reward/requisition suites, private projection, browser mission-ready state | Eligible voluntary completion is Optional; replacement and Artifact selectors keep their dedicated private flows. |
| Shops/services | engine shop matrix, shop projections, Host shop tests | Shop actions remain unavailable while mandatory encounters own continuation and reappear afterward. |
| Gear/Items/Followers | loaded QA operative, item/follower/Equipment suites | Legal encounter support is Useful; mismatched/timing-locked actions are Blocked with reasons; passive Gear is non-clickable. |
| Single-player | ten-turn movement lifecycle and 360×800 browser state | End Turn reads `Begin next round`; no bot or another-seat wait was introduced. |
| Co-op | real two-phone browser setup, player-count and assistance integration | Inactive phone shows Standby; active actions remain owner-scoped; End Turn copy passes control. |
| Rivalry | real two-phone Rivalry setup and private-agenda capture; rivalry projection suites | Owner sees private agenda only on their phone; TV and other phones do not receive that payload. |
| Reconnect/replay | room reconnect, encounter start replay, prompt suites, reconnect browser capture | Current required action restores; completed start/effects do not replay. |
| Error recovery | wrong/stale ownership, invalid target, insufficient currency, used actions, expired/replayed prompts | Server rejects invalid intent; refreshed projection retains unresolved gameplay and readable blocked reasons. |

## Encounter-start sequence verified

```text
arrival
→ revealed encounter projected
→ START_TILE_ENCOUNTER shown in Required now
→ owner submits canonical command
→ server validates owner, encounter, and resolution identity
→ active resolution advances to setup
→ start button disappears
→ roll/timing action appears
→ End Turn remains blocked until authoritative cleanup
```

The recurring Challenge path permits the rule's stable challenge ID and its separate art-card ID. This prevents the earlier false identity mismatch without loosening owner or replay validation.

## Mode and privacy findings

- Single-player, Co-op, and Rivalry use the same classifier.
- Waiting phones do not receive the active owner's action controls.
- Owner-only event, payment, mission, Scar, Artifact, and Rivalry data remains private.
- The TV remains a public-safe projection and never receives the private action model.
- The private Rivalry agenda is rendered as passive information, not an actionable or public card.

## Reconnect and replay findings

- Reconnecting at encounter reveal restores the start action with the same authoritative encounter and resolution IDs.
- Starting it once moves to the next timing action; the old command is rejected if replayed.
- Pending payments, Scar choices, mission choices, modifiers, and item windows are restored by their existing canonical projections.
- End Turn never becomes legal merely because a phone reconnects or changes tabs.

## Responsive and browser results

- 20 screenshots captured at 360×800, 390×844, 412×915, and 430×932.
- Required actions remain above the fold in ready and active encounter states.
- Long labels wrap; the sticky bottom tabs remain reachable.
- All automated width checks passed: document width never exceeded viewport width.
- No page errors or browser console errors were captured.
- A first visual pass found duplicate labels and a narrow two-column card treatment. The corrective pass made action controls full-width, removed duplicate visible action names, retained accessible reasons, and allowed long names to wrap. The final archive reflects the corrected pass.

## Four-seat critique

### New player

Finding: the former category accordions made the next action compete with inventory browsing. Correction: Current Context and Required Now are first, and the canonical next button is the first actionable control. In reviewed captures the required action is identifiable without opening another section.

### Optimizer

Finding: aggressively hiding mismatched support would make it hard to understand why an owned tool was absent. Correction: legal support is Useful and invalid/timing-locked support is preserved in collapsed Blocked with the server reason. Stable IDs and one-group deduplication prevent duplicates.

### Family/casual player

Finding: repeating the action title beside its button made the stack tall and visually noisy. Correction: each actionable card now uses one full-width labeled button; Passive and Blocked start collapsed; End Turn explains why it is unavailable.

### Rules lawyer

Finding: the UI must not infer legality from card prose or independently advance an encounter. Correction: the classifier receives existing projected action builders, forwards typed intents unchanged, and never calculates outcomes. Specialized mandatory selectors retain their existing authoritative components.

## Commands and results

- `npm.cmd run validate:content` — pass; 18 characters, 71 gear, 109 threats, 36 contracts, 20 anomalies, 30 artifacts, 24 followers, 24 scars, 16 escalations, 30 afflictions.
- `npm.cmd run typecheck` — pass.
- `npm.cmd run test:engine` — 70 files, 763 tests passed.
- `npm.cmd run test:rules` — 12 files, 64 tests passed.
- `npm.cmd run test:integration` — 39 files, 341 tests passed.
- `npm.cmd run test:client` — 45 files, 387 tests passed.
- Focused Priority Stack and panel run — 2 files, 76 tests passed.
- `npm.cmd run test` — 154 files, **1,491/1,491 tests passed**.
- `npm.cmd run audit:assets` — **435/435 present**, zero missing/invalid/placeholders/blockers.
- `npm.cmd run build` — pass; 549 modules transformed.
- Browser QA — 20/20 captures, zero horizontal overflow, console errors, or page errors.

Expected stderr from deliberate missing-art fallback tests remains unchanged and is not a runtime asset-audit failure.

## Remaining limitations

- The approved dedicated Battle and Scar selectors intentionally take over the phone instead of rendering inside Priority Stack. Priority Stack still represents the ordinary Action surface and encounter-support state; this avoids regressing the separately approved battle/Scar layouts.
- Mission replacement and Artifact choice remain dedicated private selectors rather than being duplicated in the stack.
- Browser QA uses canonical projections and real commands for representative timing windows; exhaustive combinatorial behavior is covered by automated engine/server suites rather than by hundreds of manual screenshots.
