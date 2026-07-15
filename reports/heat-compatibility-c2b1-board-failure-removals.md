# Heat Compatibility Phase C2B1 board failure removals

Date: 2026-07-15

Approval: `5138f70 docs: approve board heat retirements`

Implementation disposition: the five Group 1 failure-only `gain_heat 1` clauses were removed without replacement. No Wound, Scar, Salvage, payment, movement, modifier, Equipment, escalation, persistent-state, choice, reward, schema, runtime, projection, or topology behavior was added or changed.

## Exact scope and results

| Stable ID | Removed clause | Final approved rule | Preserved behavior |
|---|---|---|---|
| `outer_ashwakeClearLane` | failure `gain_heat 1` | Test Guile 6. On success, record “Ashwake crossing cleared. The convoy lane is charted.” On failure, no additional effect. | route-note success; Guile 6; existing failure summary |
| `outer_mirecoilTraffic` | failure `gain_heat 1` | Resolve the local Contract lead and test Signal 8. On success, record the Mirecoil contract-lead note. On failure, no additional effect. | local Contract handling; note; Signal 8; existing failure summary |
| `outer_relayCrew` | failure `gain_heat 1` | Resolve the local Contract lead and test Command 6. On success, gain Grave Scribe and record the route-crew note. On failure, no additional effect. | local Contract handling; follower then note; Command 6; existing failure summary |
| `outer_oathpostWrit` | failure `gain_heat 1` | Resolve the local Contract lead and test Command 7. On success, record the faction writ. On failure, no additional effect. | local Contract handling; faction-writ note; Command 7; existing failure summary |
| `middle_redMarchBargain` | failure `gain_heat 1` | Resolve the local Contract lead and test Command 9. On success, gain Votive Gunner and record the military favor. On failure, no additional effect. | local Contract handling; follower then note; Command 9; existing failure summary |

All five stable IDs, board-space references, tests, difficulties, success sequences, local-deck metadata, summaries, and rewards remain unchanged. A failed check now resolves through the existing null-failure path, withholds the success reward, produces no substitute consequence, and completes normally.

## Wording and environmental language

The five stored failure summaries already contained no player-resource Heat wording, icons, dangling conjunctions, or empty clauses, so no prose rewrite was necessary. Descriptive ash, pressure, static, and relay-instability language remains because it describes the setting rather than a retired resource.

## Validation, runtime, and projection boundary

- The five signatures were removed from the exact C1 blocked authored-effect manifest.
- The manifest now pins 28 remaining imported board/scenario Heat effects.
- The canonical authored-content scan now finds 34 typed Heat effects across 21 IDs: 21 `gain_heat`, 3 `gain_heat_all`, and 10 `lose_heat`.
- Each scoped definition resolves with `failureEffect: null`; no compatibility Heat action or result row is emitted.
- Existing phone and TV compatibility stripping remains unchanged. Focused projections show the ordinary failed-check result with an empty effects list and no Heat text or key.
- Duplicate same-turn resolution remains rejected after the normal transition to broadcast. Reconnect reconstructs the completed Heat-free result without pending state.

## Focused coverage

The C2B1 regression suite proves:

- exactly five unique approved IDs;
- stable effect keys, stats, difficulties, success effects, local-deck metadata, and failure summaries;
- absence of typed Heat and replacement consequences;
- `resolveSpaceText` returns a null failure effect;
- failure changes no operative gameplay state and completes through the normal broadcast lifecycle;
- owner phone, other phone, and TV projections contain no Heat result or empty result row;
- duplicate resolution cannot create a second consequence;
- the remaining authored population and exact imported compatibility manifest remain pinned.

## Remaining C2A groups

1. Group 2 — success-sequence cleanup: `outer_emberSanctumRest`, `outer_glassmereChorus`, `outer_waymarketExchange`, `outer_saltCrossing`, `outer_surgeryTreatment`.
2. Group 3 — existing severe consequence cleanup: `outer_brokenCausewayShortcut`, `middle_scarSurgery`, `inner_blackstarShortcut`.
3. Group 4 — two-choice route-note cleanup: `middle_shardSprawlBargain`, `middle_webglassFracture`, `inner_veilRiftEntry`.
4. Group 5 — clearance/final-approach cleanup: `middle_guardianSpanThreshold`, `inner_cinderLatticeTrial`, `inner_gateOfCindersTrial`.

The seven separately blocked authored occurrences remain unchanged: `scenario_mirror_of_false_heroes`, `escalation-blackstar-hunger`, `escalation-choir-feedback`, `escalation-marrow-surgery-debt`, `escalation-saltwind-lockdown`, `crownless-advocate`, and `saltflat-bone-reader`.

## Current boundary status

C2B1 removed five authored occurrences, reducing the current population from 39 to **34 occurrences across 21 IDs**. The audit verdict remains **FAIL** because 27 approved board-text occurrences still await C2A Groups 2–5 implementation and seven non-board occurrences remain separately blocked.

No global compatibility field, parser, reducer, save adapter, projection implementation, board topology, or unrelated gameplay changed in this phase.

## Verification record

Passed:

- content validation: 17 characters, 71 gear, 109 Threats, 36 Contracts, 20 anomalies, 30 Artifacts, 24 followers, 15 Scars, 16 escalations, and 30 afflictions;
- TypeScript typecheck;
- focused C2B1/content-manifest/containment coverage: 3 files, 33 tests, followed by the final focused C2B1 run of 6 tests;
- engine and rules: 52 files, 627 tests;
- client: 26 files, 258 tests;
- aggregate repository suite: 105 files, 1,118 tests;
- production build and asset audit: 404/404 assets present, zero release blockers;
- diff whitespace checks.

The first standalone integration run passed 232 tests and hit the pre-existing reconnect-flapping timing assertion once (`statuses.length` 6 rather than 5). The exact reconnect test then passed independently, and it also passed in the green 1,118-test aggregate run. No reconnect code changed in C2B1.
