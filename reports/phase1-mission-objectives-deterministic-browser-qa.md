# Phase 1 Mission Objectives Deterministic Browser QA

Date: 2026-07-10

Commit under test: `036fec8 test: add deterministic phase 1 mission qa fixture` on top of `84904f8`

Environment: fresh single-player Broken Seal room, Bjornis, Chromium, TV 1366x768, phone 390x844

## Fixture and production guard

The QA endpoint is disabled by default and returns 404 unless the server is started with the explicit dev flag `ASHEN_REACH_QA_FIXTURES=1`. The dev launcher maps that flag to the server option; production/default startup does not enable it. Requests also require the current room code and a valid seat token. The fixture only prepares deterministic contract, position, roll, shop, and handoff state; movement, shop transactions, mission progression, completion, and rewards still use normal server-authoritative intents.

Automated guards verify that the endpoint is unreachable while disabled, reachable only when enabled, and can prepare route/shop states without changing normal rules.

## Browser results

| Check | Result | Evidence |
| --- | --- | --- |
| Route contract available and presented | Pass | Echo Triangulation rendered on phone; mission targets rendered on TV. |
| First route target | Pass | Real confirmed movement to Glass Signal Pier advanced 0/3 to 1/3. |
| Duplicate suppression | Pass | Revisit of Glass Signal Pier remained 1/3. |
| Ordered wrong target | Pass | Three Lantern Circuit visit to Anchor Market out of order remained 0/3. |
| Final route target | Pass | Real confirmed movement to Sunken Pier advanced 2/3 to 3/3. |
| Route reward exactly once | Pass | One completion action was available; after use it disappeared and scenario progress increased once. |
| Route completed inventory | Pass | Inventory showed Echo Triangulation and 1/3 toward an Artifact trade. |
| New mission after route completion | Pass | After Continue, the Contracts section exposed new Accept actions. |
| Wrong shop | Pass | Old Mercy Bay exposed no valid repair action and Foundry Proof Marks remained unadvanced. |
| First valid shop transaction | Pass | Repair Gear at Kettleward Foundry advanced 0/2 to 1/2. |
| Final valid shop transaction | Pass | A second real Repair Gear action advanced the objective to completion. |
| Shop reward exactly once | Pass | One completion action was available; after use it disappeared. |
| Shop completed inventory | Pass | Inventory showed both completed cards and 2/3 toward an Artifact trade. |
| TV mission visibility | Pass | The route target markers and movement state were readable at 1366x768 with no horizontal overflow. |

The wrong-shop browser check exercised the rejection boundary by confirming that the required action was unavailable outside the required forge/armoury. Automated server tests continue to cover failed and blocked transaction attempts without progress.

## Screenshots and diagnostics

QA screenshots and the local result JSON are stored under `qa-artifacts/phase1-mission-browser-qa-2026-07-10/`. They remain untracked. Captures include the first, duplicate, ordered-wrong, and final route states; both completed-inventory states; and the TV fixture state.

No horizontal TV overflow was observed. No normal movement roll override or player-visible QA control was added.

## Verdict

Phase 1 mission objectives pass deterministic browser QA. `multiStopRoute` progresses through real arrival, protects against duplicate and wrong-order progress, completes once, grants its reward, stores the completed card, and restores mission availability. `shopTransaction` ignores the wrong shop boundary, progresses through successful authoritative repair actions, completes once, grants its reward, and stores its completed card.

The fixture is QA-only. Normal gameplay randomness, movement authority, shop validation, contract rules, balance, and player-facing production UI are unchanged.
