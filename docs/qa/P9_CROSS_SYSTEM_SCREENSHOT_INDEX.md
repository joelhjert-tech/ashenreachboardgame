# P9 Cross-System Screenshot Index

## Audit campaign

Fresh evidence was captured on 2026-07-21 with the current dirty P0-P8 worktree. Successful campaigns produced 273 screenshots. The P2 and P3 harnesses additionally produced 71 accepted partial screenshots before their repeatable observation checks failed, for 344 fresh screenshots total. Fourteen curated recordings were completed; raw Playwright fragments are excluded from that count.

All evidence remains under `docs/qa`; nothing was placed in production assets.

## Session A: setup and first-turn boundary

Source: `docs/qa/p5-setup-lobby/`

- Empty/join lobby: `phone/join-room-360x800.png`, `phone/join-room-390x844.png`
- Joined lobby: `tv/one-joined-player-1366x768.png`, `tv/one-joined-player-1920x1080.png`
- Mode: `phone/co-op-selected-390x844.png`, `phone/rivalry-selected-390x844.png`
- Mission: `phone/mission-selection-390x844.png`, `tv/mission-selection-1366x768.png`
- Operative: `phone/operative-selection-360x800.png`, `phone/operative-selection-390x844.png`
- Ready/start: `phone/start-available-390x844.png`, `tv/start-available-1366x768.png`
- Reduced motion: `phone/reduced-motion-ready-390x844.png`, `tv/reduced-motion-lobby-1366x768.png`
- Recordings: `recordings/join-through-ready.webm`, `mode-and-scenario-selection.webm`, `operative-selection.webm`, `full-room-to-start.webm`, `reconnect-during-setup.webm`, `reduced-motion-setup.webm`

Result: 46/46 captures completed; zero browser errors.

## Session B: movement, encounter, and battle

Current cross-feature evidence: `docs/qa/p8-shared-presentation/`

- Required action: `phone/required-action-430x932.png`
- Movement selection: `phone/movement-selection-430x932.png`, `tv/movement-markers-1600x900.png`
- Encounter/battle: `phone/battle-comparison-430x932.png`, `tv/encounter-focus-1600x900.png`, `tv/battle-comparison-1600x900.png`
- Result: `phone/battle-result-430x932.png`, `tv/battle-result-1600x900.png`
- Recording: `recordings/cross-feature-phone-430x932.webm`, `recordings/cross-feature-tv-1600x900.webm`

Current partial P2 evidence: `docs/qa/p2-movement/screenshots/`

- Destination and route states through `tv-final-movement-step-1920x1080.png`
- The final screenshot already shows the following Hazard result; `.is-arrived` was never observed in two unchanged runs.
- 31 screenshots were refreshed before the check stopped. No completed current P2 recording was produced.

Current partial P3 evidence: `docs/qa/p3-encounter-battle/`

- 40 phone/waiting captures were refreshed before the host image-stability check stopped.
- The same host check failed twice because it waits for every document image, including intentional fallback/failure imagery. Current P8 host battle captures provide accepted host evidence instead.

## Session C: shop and inventory

Shop source: `docs/qa/p6-shop-presentation/`

- Categories: `phone/categories-390x844.png`, `tv/categories-1366x768.png`
- Offer: `phone/equipment-390x844.png`, `tv/equipment-1366x768.png`
- Purchase: `phone/purchase-result-390x844.png`, `tv/purchase-result-1366x768.png`
- Sell/service/sold out: matching `phone`, `waiting-phone`, and `tv` files
- Reconnect/reduced motion: `phone/reconnect-browsing-390x844.png`, `phone/reduced-motion-390x844.png`, `tv/reduced-motion-1366x768.png`
- Recording: `recordings/shop-entry-browse-purchase.webm`

Result: 72/72 captures completed; zero horizontal overflow.

Inventory source: `docs/qa/p7-inventory-player-card/`

- Player card: `phone/basic-player-card-390x844.png`
- Relevant Now: `phone/relevant-now-one-390x844.png`, `phone/relevant-now-many-390x844.png`
- Full inventory: `phone/many-owned-objects-360x800.png`, `phone/many-owned-objects-390x844.png`
- Return: `phone/return-to-required-action-390x844.png`
- Reconnect/missing art/reduced motion: corresponding phone/TV files
- Recording: `recordings/player-card-inventory-relevance.webm`

Result: 62/62 captures completed.

## Session D: result, waiting, handoff, and recovery

Source: `docs/qa/p4-waiting-handoff/`

- Result/Continue/End Turn: `phone/result-390x844.png`, `phone/result-with-continue-390x844.png`, `phone/end-turn-available-360x800.png`
- Waiting: `waiting-phone/private-choice-waiting-390x844.png`, `waiting-phone/private-reward-waiting-390x844.png`
- Public-safe TV: `tv/private-choice-public-safe-1366x768.png`, `tv/public-consequence-1366x768.png`
- Reconnect/stale recovery: `phone/reconnect-result-390x844.png`, `phone/stale-continue-recovery-390x844.png`, `phone/stale-end-turn-recovery-390x844.png`
- Handoff: `tv/turn-handoff-1366x768.png`
- Recordings: `recordings/result-to-continue.webm`, `result-to-end-turn.webm`, `human-to-human-handoff.webm`, `reduced-motion-handoff.webm`

Result: 60/60 captures completed; zero browser/page errors.

## Session E: rivalry privacy

- Fresh Rivalry setup: `docs/qa/p5-setup-lobby/phone/rivalry-selected-390x844.png`
- Fresh owner/private, waiting-phone, and public-safe host evidence: P4 private-choice and private-reward files above.
- Active authored Rivalry-agenda progression was not reached in the browser campaign. It was not fabricated; projection/privacy verification remains covered by the integration suite.

## Session F: reduced motion and shared failure states

Source: `docs/qa/p8-shared-presentation/`

- Phone: `phone/reduced-motion-430x932.png`
- TV: `tv/reduced-motion-1600x900.png`
- Missing art and long copy at all required sizes:
  - `phone/shared-missing-art-and-long-copy-360x800.png`
  - `phone/shared-missing-art-and-long-copy-390x844.png`
  - `phone/shared-missing-art-and-long-copy-430x932.png`
  - `tv/shared-missing-art-and-long-copy-1366x768.png`
  - `tv/shared-missing-art-and-long-copy-1600x900.png`
  - `tv/shared-missing-art-and-long-copy-1920x1080.png`

Result: 33/33 captures completed; zero overflow, undersized measured controls, image escapes, or console errors.

## Accepted visual findings

1. Movement selection is legible and synchronized between phone and TV.
2. The P2 journey’s arrival state is not visible before the next Hazard replaces it.
3. Battle result arithmetic and outcome remain visible on both surfaces.
4. The phone Shop’s sticky Leave Shop control overlaps Previous/Next navigation at 390x844 and is more constrained at 360x800.
5. Waiting phones repeat actor/context in two framed blocks.
6. The TV battle opponent calculation exposes the technical label `BATTLE 0` instead of a player-facing enemy-roll label.
7. Missing-art fallbacks are contained, meaningful, and free of IDs/paths.
8. No accepted screenshot contains private owner options on TV.

## Evidence limitations

- Headless Chromium only; no claim of complete screen-reader or physical-device compliance.
- Connection loss is fixture/reload driven rather than a measured real LAN outage.
- The P8 file named `reconnecting-restored` shows Join Room because its URL deliberately retained `resetAuth=1`; P4 reconnect evidence is used instead. This is a capture-script issue, not runtime reconnect evidence.
- Endgame and active Rivalry-agenda flows are outside the reached browser states.
