# Heat Compatibility Phase C2B5 final board approach cleanups

Date: 2026-07-15

Approvals: `5138f70 docs: approve board heat retirements`; prior implementation checkpoint `1d869d0 feat: clean board route choice heat clauses`.

## Exact scope and retired clauses

| Stable ID | Original rule | Heat removed | Final rule |
|---|---|---:|---|
| `middle_guardianSpanThreshold` | Choose Command 9 seal alignment or Signal 9 ghost marker; either success grants `guardian-span-clearance` plus its descriptive note; either failure requested `gain_heat 1` | 2 | Both successes and exact notes remain; failure withholds clearance and has no additional consequence |
| `inner_cinderLatticeTrial` | Choose Signal 10 ember trace or Guile 10 ghost angles; either success grants its approach note; ghost-angles success first requested `lose_heat 1`; either failure requested `gain_heat 1` | 3 | Both selected approach notes remain; failure grants no note and has no additional consequence |
| `inner_gateOfCindersTrial` | Choose Grit, Signal, or Guile 12; every success grants `gate-of-cinders-breached` plus its descriptive note; every failure requested `gain_heat 1` | 3 | All three success sequences remain; failure withholds breach clearance and has no additional consequence |

Exactly eight typed Heat leaves were removed without replacement: seven `gain_heat 1` failures and one `lose_heat 1` success.

## Wording cleanup

Only the two C2A-approved false Scar implications changed:

- `inner_cinderLatticeTrial`: “rising scar pressure” became “rising interference.”
- `inner_gateOfCindersTrial`: “static scar pressure” became “static backlash.”

Descriptive cinder, burn, fireline, and “running hot” language remains environmental prose. No option label, success summary, note text, board-space text, or lore text changed.

## Clearance and trial preservation

- Guardian Span still grants the exact owner note `guardian-span-clearance` only after a successful Command 9 or Signal 9 test.
- Cinder Lattice still grants only the selected approach note after a successful Signal 10 or Guile 10 test. These notes do not alter scenario preparation, confrontation progress, or victory state.
- Gate of Cinders still grants `gate-of-cinders-breached` only after a successful difficulty-12 Grit, Signal, or Guile test.
- Existing option IDs, order, labels, summaries, descriptive notes, source-event handling, owner storage, reconnect reconstruction, and duplicate rejection remain unchanged.
- Failure grants no clearance, no route note, and no replacement consequence.

## Route and center-tile protection

- `inner_veil_rift` remains reachable from `middle_guardian_span` only with `guardian-span-clearance`.
- `center_cinder_gate` remains reachable only from `inner_gate_of_cinders` or `inner_blackstar_shortcut`, and still requires `gate-of-cinders-breached`.
- The Ashen Reach Core remains the canonical scenario-confrontation space.
- Board adjacency, topology, movement allowance, route generation, scenario preparation, confrontation state, scenario art, and victory handling did not change.
- Focused tests exercise the authoritative movement-step gate both without and with each required note.

## Runtime, replay, and presentation

This was a content-only retirement. The existing board-choice, test, note, movement, scenario, reducer, reconnect, and projection paths were reused unchanged.

- Successful note sequences resolve once and retain their authored order.
- Failed tests resolve with an empty consequence list and finalize once.
- Duplicate post-resolution submissions remain rejected.
- Owner note state remains private; active resolution feedback remains public-safe.
- Phone and TV active result surfaces contain no Heat or empty result rows.
- Legacy Heat metadata remains inert and cannot change a trial or gate outcome.

## Authored Heat recount

Before C2B5: **15 occurrences across 10 IDs**.

After C2B5: **7 occurrences across 7 IDs**:

- board-authored Heat: **0 occurrences across 0 IDs**;
- scenario: `scenario_mirror_of_false_heroes` — one `gain_heat`;
- escalations: `escalation-blackstar-hunger`, `escalation-choir-feedback`, `escalation-marrow-surgery-debt`, `escalation-saltwind-lockdown` — four occurrences;
- followers: `crownless-advocate`, `saltflat-bone-reader` — two `lose_heat` occurrences.

All 19 C2A board IDs are now implemented. The audit verdict remains **FAIL** until the seven separately gated effects receive their own approvals and implementations.

## Focused coverage

Focused tests pin:

- all three stable IDs, linked sectors, choice IDs/order/labels, stats, difficulties, summaries, and exact note sequences;
- successful note ownership and unchanged scenario preparation, confrontation, result, winner, and session state;
- consequence-free failures that withhold every clearance/note;
- exact Guardian Span and center movement requirements, including blocked and allowed authoritative movement-step checks;
- reconnect-equivalent reconstruction, duplicate rejection, owner privacy, and Heat-free active phone/TV results;
- zero remaining board Heat and the exact seven-ID authored remainder.

No replacement, compensation, topology change, scenario change, runtime change, UI change, or unrelated gameplay change was made in C2B5.

## Verification record

- `npm.cmd run validate:content`: passed; canonical totals remain 17 characters, 71 gear, 109 Threats, 36 Contracts, 20 anomalies, 30 Artifacts, 24 followers, 15 Scars, 16 escalations, and 30 afflictions.
- `npm.cmd run typecheck`: passed.
- Focused C2B5/board/movement/scenario/projection slice: 10 files and 174 tests passed, including 11 dedicated C2B5 tests.
- `npm.cmd run test:engine`: passed.
- `npm.cmd run test:client`: 26 files and 258 tests passed.
- Initial `npm.cmd run test:integration`: 27 files and 233 tests passed.
- `npm.cmd run test`: 1,160 of 1,161 tests passed; only the known reconnect timing test flaked because one extra status callback arrived (`expected 5`, observed `6`). No product assertion failed.
- Required follow-up: the exact reconnect test passed 1/1 in isolation, then the full uncontended integration suite passed 27 files and 233 tests. No retries, waits, or assertions were added.
- `npm.cmd run audit:assets`: passed with 404/404 assets present.
- `npm.cmd run build`: passed.
- `git diff --check` and `git diff --cached --check`: passed before commit.

During focused-test authoring, an initial test-only assertion scanned the entire projection and encountered unrelated historical descriptive Heat text. The guard was narrowed to the active resolution and result surfaces, matching the established C1/C2B4 projection boundary. No runtime or projection behavior changed.
