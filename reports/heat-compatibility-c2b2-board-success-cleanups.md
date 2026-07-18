# Heat Compatibility Phase C2B2 board success cleanups

Date: 2026-07-15

Approvals: `5138f70 docs: approve board heat retirements`; prior implementation checkpoint `a3baf4b feat: remove simple board heat clauses`.

## Exact scope and sequence changes

| Stable ID | Original success sequence | Removed Heat clause(s) | Final success sequence | Failure preserved |
|---|---|---|---|---|
| `outer_emberSanctumRest` | heal 1 Wound → `lose_heat 1` | success `lose_heat 1` | heal 1 Wound | no test or failure branch |
| `outer_glassmereChorus` | `lose_heat 1` → stable-relay note | success `lose_heat 1`; failure `gain_heat 1` | stable-relay note | no additional personal effect; local Anomaly unchanged |
| `outer_waymarketExchange` | `lose_heat 1` → Waymarket favor note | success `lose_heat 1`; failure `gain_heat 1` | Waymarket favor note | no additional consequence; local Contract unchanged |
| `outer_saltCrossing` | `lose_heat 1` → void-salt note | success `lose_heat 1` | void-salt note | existing `take_wound 1`; local Anomaly unchanged |
| `outer_surgeryTreatment` | heal 1 Wound → `gain_heat 1` → Cinder Surgeon → surgery note | success `gain_heat 1` | heal 1 Wound → Cinder Surgeon → surgery note | existing `take_wound 1`; local Artifact unchanged |

Exactly seven typed Heat occurrences were removed. Every surviving effect retains its original relative order and resolves through the existing `SPACE_TEXT_RESOLVED` sequence authority. No replacement or compensation was added.

## Final approved rules

- `outer_emberSanctumRest`: `Heal 1 Wound.`
- `outer_glassmereChorus`: `Resolve the local Anomaly and test Signal 7. On success, record the stable-relay note. On failure, no additional effect.`
- `outer_waymarketExchange`: `Resolve the local Contract lead and test Guile 6. On success, record the Waymarket favor. On failure, no additional effect.`
- `outer_saltCrossing`: `Resolve the local Anomaly and test Forge 7. On success, record the void-salt note. On failure, suffer 1 Wound.`
- `outer_surgeryTreatment`: `Resolve the local Artifact and test Forge 7. On success, heal 1 Wound, gain Cinder Surgeon, and record the surgery note. On failure, suffer 1 Wound.`

## Wording cleanup

Only the three C2A-approved clarifications changed:

- `outer_emberSanctumRest` now uses the exact approved `Heal 1 Wound.` wording and no longer implies a Scar-pressure mechanic.
- `outer_glassmereChorus` failure now says the relay line is `unstable`, replacing the ambiguous “too hot to trust” status implication.
- `outer_surgeryTreatment` now says the operative walked away `patched`, removing the false “marked” implication.

Ordinary environmental fire, ash, burning, furnace, and thermal language elsewhere remains untouched.

## Preserved identity and behavior

- All stable IDs, linked outer-ring board spaces, topology, movement, tests, difficulties, local-deck kinds, failures, notes, followers, and services remain authoritative and unchanged except for the approved summaries above.
- Glassmere, Waymarket, and Salt retain their note rewards exactly.
- Surgery retains heal → follower → note order. Cinder Surgeon is still gained once, and the receipt note remains last.
- Salt Crossing and Surgery retain their existing one-Wound failure effects exactly; neither was weakened, duplicated, or converted into a Scar.
- Group 1 remains implemented. Groups 3–5 and the seven separately blocked IDs remain unchanged.
- Compatibility parsing, legacy metadata, runtime no-op handling, phone/TV projection code, and save/reconnect code are unchanged.

## Validation and focused coverage

The authored-effect manifest now pins 21 remaining imported board/scenario Heat effects. The canonical scan finds **27 authored typed Heat occurrences across 16 IDs**: 18 `gain_heat`, 3 `gain_heat_all`, and 6 `lose_heat`.

Focused tests prove:

- exactly five unique Group 2 IDs and their exact linked outer-ring locations;
- exact stats, difficulties, summaries, local-deck metadata, failure effects, and surviving success effects;
- exact surgery heal → follower → note ordering;
- success state changes and result rows occur once without Heat;
- failure Wounds remain exact for Salt Crossing and Surgery;
- owner phone, other phone, TV, and reconstructed reconnect projections contain no scoped Heat result or empty row;
- duplicate submissions cannot replay a completed sequence;
- Group 1 and the remaining authored population stay pinned.

## Remaining authored Heat

Before C2B2: **34 occurrences across 21 IDs**.

After C2B2: **27 occurrences across 16 IDs**:

- C2A Groups 3–5: 20 board-text occurrences across 9 IDs;
- separately blocked: 7 occurrences across `scenario_mirror_of_false_heroes`, `escalation-blackstar-hunger`, `escalation-choir-feedback`, `escalation-marrow-surgery-debt`, `escalation-saltwind-lockdown`, `crownless-advocate`, and `saltflat-bone-reader`.

The audit verdict remains **FAIL** while these authored effects remain.

## Remaining C2A groups

1. Group 3 — `outer_brokenCausewayShortcut`, `middle_scarSurgery`, `inner_blackstarShortcut`.
2. Group 4 — `middle_shardSprawlBargain`, `middle_webglassFracture`, `inner_veilRiftEntry`.
3. Group 5 — `middle_guardianSpanThreshold`, `inner_cinderLatticeTrial`, `inner_gateOfCindersTrial`.

No topology, scenario, escalation, follower, Threat, mission, Contract, item, economy, movement, server, client, schema, asset, or compatibility implementation changed in C2B2.

## Verification record

- `npm.cmd run validate:content` passed: 17 characters, 71 gear entries, 109 Threats, 36 Contracts, 20 anomalies, 30 Artifacts, 24 followers, 15 Scars, 16 escalations, and 30 afflictions.
- `npm.cmd run typecheck` passed.
- Focused C2B2, C2B1, C1-containment, and authored-Heat validation coverage passed: 4 files, 43 tests.
- `npm.cmd run test:engine` passed: 53 files, 637 tests.
- `npm.cmd run test:integration` passed in an uncontended process: 27 files, 233 tests, including the reconnect timing coverage.
- `npm.cmd run test:client` passed: 26 files, 258 tests.
- `npm.cmd run test` passed: 106 files, 1,128 tests; the reconnect timing coverage also passed in the aggregate run.
- `npm.cmd run audit:assets` passed with 404 of 404 assets present and no blockers.
- `npm.cmd run build` passed.
- Repository classification found 27 remaining authored typed Heat occurrences across 16 IDs; none belong to the five C2B2 IDs.
- `git diff --check` and `git diff --cached --check` passed.
