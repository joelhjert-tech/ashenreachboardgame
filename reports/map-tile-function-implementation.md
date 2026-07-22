# Map Tile Function Implementation

## Outcome

All 49 active tiles now produce one canonical executable function model. The model is derived from stable board-space IDs, typed recurring challenges, printed Threat symbols, registered board-text effect keys, shop/service authority, movement requirements, and scenario metadata. Lore remains presentation-only.

The pre-change audit recorded 18 functional, 20 partially functional, and 11 display-only tiles. After repair, all 49 definitions pass the executable-rule validator. No unsupported active rule remains and no topology, geometry, save version, or Heat behavior changed.

## Canonical arrival sequence

```text
MOVEMENT_RESOLVED
→ location updated and stable arrival ID created
→ recurring typed tile challenges in authored order
→ printed Threat slots evaluated against existing lane blockers
→ each unfilled lane resolved once in printed order
→ fixed/scenario requirement where authored
→ action phase unlocks
→ optional board action and services become available
→ canonical canEndTurn check
→ end-turn resolution
```

`GameRoomServer.runAutomaticPhases` remains the sole automatic sequencer. The phone and TV receive `tileArrival`; they do not calculate rule order or completion. `ENCOUNTER_DRAWN` records the visit’s due lanes, stable rule IDs, and next index in the append-only event stream. Reconnect resumes the same index. A no-card draw produces an explicit visible result and continues to the next due symbol after confirmation.

## Typed rule model

`src/game/rules/tileFunctions.ts` defines the shared read/validation model:

- arrival rules: recurring challenge, Threat draw, scenario confrontation;
- optional actions: registered board-text action and service;
- persistent rules: movement route and entry gate;
- deterministic order, mandatory flag, repeat policy, runtime marker, support status;
- server-derived current/pending/completed/optional status;
- detached `simulateTileArrival` trace for Admin Map Inspector;
- centralized `canEndTurn` result and player-readable reason.

Repeat policies are explicit in the derived model. Threats, ordinary board actions, services, and recurring challenges use `EVERY_ARRIVAL`; movement restrictions use `WHILE_PRESENT`; the Core uses `SCENARIO_CONTROLLED`.

## Content repair

Thirty-two tiles had presentation copy normalized to the already-registered executor. This did not add speculative mechanics. The eleven material repairs were:

- `votive-engine-room`
- `kettleward-foundry`
- `north-dock-bastion`
- `coldwind-wharf`
- `sunken-pier`
- `black-relay-spire`
- `the-salt-archive`
- `red-lantern-trenches`
- `weeping-ammunition-shrine`
- `the-bone-meridian`
- `choir-execution-court`

Additional partial copy was corrected where it promised a different skill, reward, penalty, or choice than the typed executor. The validator now rejects the known obsolete mechanical phrases and verifies every tile’s rule IDs, references, repeat policy, runtime support, artwork, and deterministic order.

No unclear rule was converted into a new gameplay mechanic. No tile remains `NEEDS DESIGN DECISION` for release correctness; future bespoke tile identities are balance/content proposals, not missing runtime behavior.

## Threats, Hazards, Challenges, and services

- Printed Threat icons are executable and lane-specific. Existing unresolved lane occupants fill matching printed slots.
- Multiple unfilled symbols resolve one at a time, in printed order, with durable progress.
- The canonical fixed recurring challenge remains `rift-whispers-ashen-chapel`; it resolves before the chapel’s printed Blue Threat.
- Drawn Hazard, Enemy, Event, Anomaly, and discovery cards continue through their canonical encounter resolvers.
- No active tile currently authors a direct fixed-card encounter.
- Board-text actions remain optional after mandatory resolution and execute through registered typed effect keys.
- Shops, healing, Scar purification, Trophy advancement, and Artifact requisition retain their existing server validators and costs.

## End-turn guard

`canEndTurn(state, seatId)` rejects the active player while any mandatory owner action remains: tile challenge, Threat, active resolution, enemy roll, effect, assistance/test, encounter choice, payment, forced destination/displacement, Equipment suppression/equip choice, failure reaction, Scar lifecycle, or replacement Mission selection. It also blocks `sector` and `resolution` phases. Optional unused services do not block.

## Phone and TV

The phone shows tile name, lore, current rule, remaining mandatory/optional counts, and the exact blocked reason. Screenshot review found the first full stack pushed the Challenge action below the 360×800 fold. The correction keeps the current rule visible and places the remaining queue in a collapsed 44px details control.

The TV now places a concise public-safe arrival stack directly over the board because the former right sidebar is intentionally absent during active play. It shows rule order/status without private choices.

## Map Inspector

Selecting a tile now shows executable arrival rules, order, mandatory/optional status, repeat policy, marker, references, services, and source paths. `SIMULATE ARRIVAL` uses a detached cloned state/read model and displays generated rules, mandatory prompts, final state, trace, and warnings. It sends no gameplay command and mutates no room.

## Mode and lifecycle findings

- Single-player uses the same resolver. Ten consecutive synthesized arrivals completed without a pending multiplayer helper or target.
- Existing blockers, mixed lanes, empty decks, successful encounters, and shops retain their established behavior.
- Rivalry receives the same public rule stack; no private mission, agenda, target, choice ID, or prompt option is added to TV projection.
- Save schema remains version 2. The new visit progress fields are optional, so v0–v2 normalization remains supported.
- Movement topology and all 49 tile positions are unchanged.

## Four-seat critique

### New player

The current rule and next action are now explicit on phone; board markers originate from executable data. Correction: collapsed the remaining queue so it no longer hides the primary action.

### Optimizer

Stable arrival IDs and event-recorded lane progress prevent refresh, animation, reconnect, and repeated prompt submissions from redrawing completed slots. Existing blockers fill only matching lanes.

### Family/casual player

The mandatory/optional distinction and blocked reason explain why End Turn is unavailable. Optional services remain skippable.

### Rules lawyer

Displayed order is challenge → unfilled printed lanes → optional board action/service. Prose is never parsed. Every displayed mechanical rule is derived from executable data or aligned to its registered executor.

## Verification status

All requested verification passed. The first integration run exposed two Mirror confrontation regressions because the new end-turn guard also intercepted an internal scenario transition. Phase advancement now distinguishes real player end-turn requests from explicit automatic resolution transitions. The exact failing tests, the complete integration suite, and the aggregate suite all pass after that correction.

The aggregate result is 152 files and 1,481 tests passed. Final command results are recorded in `reports/ui/map-tile-function-qa-index.md`.
