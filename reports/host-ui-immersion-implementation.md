# Host UI Immersion Implementation

## Scope

Focused host-only presentation changes were made. No server gameplay action, reducer result, phone UI, save schema, content definition, economy rule, Heat compatibility behavior, or canonical topology was changed.

## Files changed

- `src/client/tv/HostBattleOverlay.tsx`
- `src/client/tv/HostShopOverlay.tsx`
- `src/client/tv/TvApp.tsx`
- `src/client/styles.css`
- `src/client/tv/__tests__/TvApp.test.tsx`
- `src/server/phaseOneQaFixture.ts` (QA-only states)
- `scripts/capture-host-ui-qa.ts`
- `package.json`
- five host UI reports and QA screenshots

## Implemented changes

### Movement

- Repaired the final CSS cascade so the roll, destination and timeline HUDs stay centered and inside 1366x768.
- Kept the canonical board and route visible underneath the HUD.
- Added browser bounds assertions for both movement cards.
- Preserved canonical route planning, cross-ring edges, arrival timing and reconnect behavior.

### Battle

- Replaced the repeated enemy title in the center with `Battle resolution`; enemy identity remains on the enemy card.
- Added authoritative equal-total wording: `Tie succeeds` or `Tie fails` based on the projected outcome.
- Deduplicated repeated `threatDefeated` / `threatRemains` deltas for the same seat without combining Wound, Trophy or other additive deltas.
- Replaced `Preparing next phase...` with the named player and exact phone action.
- Constrained long result chips to the center instrument.

### Shop

- Removed three-way repetition of waiting/guidance copy.
- Market result footer now appears only for a real outcome, result delta or blocked state.
- Gave the sector identity a full-width status row to prevent awkward truncation.
- Preserved public stock, prices, Salvage, sold-out/blocked state, and phone-only interaction.

### Startup and reconnect

- Hid the raw LAN URL on the startup command display; room code, QR and concise scan instruction remain.
- Added an explicit active-operative disconnect state.
- Reconnect guidance takes precedence over stale shop framing, and the shop overlay is hidden until the active phone reconnects.

### QA

- Added repeatable capture tooling for real lobby setup plus deterministic server-projected gameplay states.
- Added QA-only scenario preparation, disconnect, victory and loss fixtures.
- Added automated assertions for overflow, canvas use, private strings, movement bounds, tie wording, duplicate battle results and reduced motion.

## Privacy

No private Artifact choice, follower note, hidden Contract objective, Rivalry target, or private route option was observed. The capture runner explicitly fails on representative private strings. The TV remains non-interactive.

## Four-seat result

- New player: movement, battle and reconnect next actions are now explicit.
- Optimizer: no animation alters authority or creates replay opportunities.
- Family/casual: duplication and long technical copy were reduced.
- Rules lawyer: visible results remain derived from public authoritative projections.

## Remaining limitations

The browser archive is deterministic QA evidence, not a human playtest. Several rare authored reaction combinations lack dedicated screenshot fixtures, but their projections and shared components remain covered by existing tests. No balance or gameplay change was inferred from visual evidence.

## Verification

- `npm.cmd run validate:content`: passed (17 characters, 71 gear, 109 Threats, 36 Contracts, 20 anomalies, 30 Artifacts, 24 followers).
- `npm.cmd run typecheck`: passed.
- Focused host/movement/shop/scenario/fixture run: 133 tests passed.
- `npm.cmd run test:engine`: 724 tests passed.
- `npm.cmd run test:rules`: 40 tests passed.
- `npm.cmd run test:integration`: 243 tests passed, including reconnect flapping.
- `npm.cmd run test:client`: 275 tests passed.
- `npm.cmd run test`: 1,242 tests passed.
- `npm.cmd run audit:assets`: 418 present, zero missing, invalid, placeholder, or release-blocking assets.
- `npm.cmd run build`: passed.
- Browser capture: 47 final images across 24 states, no horizontal overflow, canvas use, console/page errors, or representative private-string leakage.
- `git diff --check`: passed.

The initial combined engine/rules wrapper exceeded its five-minute command budget. Both suites were then run independently and passed; the later full aggregate suite also passed. All background Ashen Reach dev servers used or discovered during QA were stopped after capture.
