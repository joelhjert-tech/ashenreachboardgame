# Heat Compatibility Phase C2B3 board severe-consequence cleanups

Date: 2026-07-15

Approvals: `5138f70 docs: approve board heat retirements`; prior implementation checkpoint `6667ea2 feat: clean board success heat clauses`.

## Exact scope

| Stable ID | Original complete rule | Removed Heat clause | Retained severe consequence | Final rule |
|---|---|---|---|---|
| `outer_brokenCausewayShortcut` | Resolve the local Escalation and test Grit 8. Success records the dangerous-shortcut note. Failure resolves `gain_heat 1` then `take_wound 1`. | failure `gain_heat 1` | failure `take_wound 1`, exactly once | Resolve the local Escalation and test Grit 8. On success, record the dangerous-shortcut note. On failure, suffer 1 Wound. |
| `middle_scarSurgery` | Resolve the local Escalation and test Forge 9. Success resolves heal 1 Wound, `gain_heat 1`, then the field-surgery note. Failure resolves `gain_scar scar-wound-1`. | success `gain_heat 1` | failure direct Ash-Lanced `gain_scar scar-wound-1`, exactly once | Resolve the local Escalation and test Forge 9. On success, heal 1 Wound and record the field-surgery note. On failure, gain the Ash-Lanced Scar. |
| `inner_blackstarShortcut` | Resolve the local Artifact and test Guile 11. Success records the Blackstar route note then resolves `gain_heat 1`. Failure resolves `take_wound 1`. | success `gain_heat 1` | failure `take_wound 1`, exactly once | Resolve the local Artifact and test Guile 11. On success, record the Blackstar shortcut note. On failure, suffer 1 Wound. |

Exactly three typed `gain_heat 1` leaves were removed without replacement.

## Sequence and lifecycle preservation

- `outer_brokenCausewayShortcut` failure was pruned from Heat → Wound to the existing one-Wound effect. Its trigger, amount, failure position, acting-owner scope, result order, note success, and local Escalation deck association are unchanged.
- `middle_scarSurgery` success was pruned from heal → Heat → note to heal → note. Its failure still adds only `scar-wound-1`; no Wound conversion, second Scar, pending-Scar duplication, or Heat-to-Scar mapping was added.
- `inner_blackstarShortcut` success was pruned from note → Heat to the existing note. Its failure still applies only the existing one-Wound effect, and its local Artifact association is unchanged.
- The current authoritative `SPACE_TEXT_RESOLVED` behavior is preserved. These existing board `take_wound` and `gain_scar` effects remain immediate space-text consequences; C2B3 adds no prevention window, pending lifecycle, recall rule, or reconnect state and does not alter their established preventability.
- Repeated space-text resolution remains rejected after the first completion. Reconstructed state retains the completed severe result and does not restore the removed Heat leaf.

## Wound and Scar boundaries

- Both Wound failures retain requested amount 1 and actual authored delta 1. Each result contains one Wound effect and no second Wound consequence.
- `middle_scarSurgery` retains the existing direct Ash-Lanced Scar exactly as authored. It produces one `scar-wound-1` result and no pending or duplicate Scar state.
- C2B3 does not modify Wound thresholds, recall, defeat, Scar mechanics, prevention mechanics, or projection code.
- The pre-existing board-copy/stat presentation mismatches called out by C2A are outside this Heat-only phase and remain unchanged.

## Identity and wording

Stable IDs, summaries, failure summaries, locations, rings, topology, stats, difficulties, note text, local Escalation/Artifact associations, movement boxes, and board copy remain unchanged. None of the three existing summaries contained player-resource Heat wording, so no prose rewrite was required. Environmental cinder, pressure, surgery, and dead-star language remains lore.

## Authored Heat recount

Before C2B3: **27 occurrences across 16 IDs**.

After C2B3: **24 occurrences across 13 IDs**:

- 15 `gain_heat`;
- 3 `gain_heat_all`;
- 6 `lose_heat`;
- C2A Groups 4–5: 17 board-text occurrences across 6 IDs;
- separately blocked: 7 occurrences across `scenario_mirror_of_false_heroes`, `escalation-blackstar-hunger`, `escalation-choir-feedback`, `escalation-marrow-surgery-debt`, `escalation-saltwind-lockdown`, `crownless-advocate`, and `saltflat-bone-reader`.

The audit verdict remains **FAIL** while these authored effects remain.

## Focused coverage

Focused guards pin:

- exactly three Group 3 definitions, their linked locations, stats, difficulties, summaries, deck associations, and surviving effects;
- one Wound result and one actual Wound delta for each Wound failure;
- exactly one direct `scar-wound-1` result for `middle_scarSurgery`, with no duplicate pending Scar;
- exact heal → note success order for `middle_scarSurgery`;
- note-only success for the two route entries;
- owner phone, other phone, TV, and reconnect reconstruction without Heat or empty result rows;
- duplicate resolution rejection;
- the remaining authored Heat population and compatibility boundary.

## Remaining C2A groups

1. Group 4 — `middle_shardSprawlBargain`, `middle_webglassFracture`, `inner_veilRiftEntry`.
2. Group 5 — `middle_guardianSpanThreshold`, `inner_cinderLatticeTrial`, `inner_gateOfCindersTrial`.

No replacement, rebalance, topology change, runtime change, or unrelated gameplay change was made in C2B3.

## Verification record

- Repository authored-effect classification found exactly 24 remaining typed Heat occurrences across 13 IDs; none belong to the three C2B3 IDs.
- `npm.cmd run validate:content` passed: 17 characters, 71 gear entries, 109 Threats, 36 Contracts, 20 anomalies, 30 Artifacts, 24 followers, 15 Scars, 16 escalations, and 30 afflictions.
- `npm.cmd run typecheck` passed.
- Focused C2B3, C2B2, C2B1, C1-containment, and authored-Heat validation coverage passed: 5 files, 53 tests. The initial focused run exposed one test-only wording mismatch; the expectation was corrected to the existing authoritative `Success: heal 1 wound.` output and the unchanged implementation reran green.
- `npm.cmd run test:engine` passed: 54 files, 647 tests, including current Wound, recall, Scar, replay, and reconnect regressions.
- `npm.cmd run test:integration` passed: 27 files, 233 tests; the reconnect timing test passed without retry.
- `npm.cmd run test:client` passed: 26 files, 258 tests. Known fixture fallback warnings were non-blocking, and the asset audit remained green.
- `npm.cmd run test` passed: 107 files, 1,138 tests; reconnect timing also passed in the aggregate run.
- `npm.cmd run audit:assets` passed with 404 of 404 assets present and no blockers.
- `npm.cmd run build` passed.
- `git diff --check` and `git diff --cached --check` passed.
