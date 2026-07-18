# Heat Compatibility Phase C2B4 board route-choice cleanups

Date: 2026-07-15

Approvals: `5138f70 docs: approve board heat retirements`; prior implementation checkpoint `39cb597 feat: remove heat from severe board consequences`.

## Exact scope and choices

| Stable ID | Original Choice A | Final Choice A | Original Choice B | Final Choice B | Heat removed |
|---|---|---|---|---|---|
| `middle_shardSprawlBargain` | `stock`, Command 8: `lose_heat 1` then passage-stock note; failure `gain_heat 1` | passage-stock note; failure no additional effect | `gossip`, Guile 8: gossip note; failure `gain_heat 1` | gossip note; failure no additional effect | 3 |
| `middle_webglassFracture` | `hidden-lane`, Guile 9: `lose_heat 1` then hidden-lane note; failure `gain_heat 1` | hidden-lane note; failure no additional effect | `relay-splice`, Signal 9: relay-splice note; failure `gain_heat 1` | relay-splice note; failure no additional effect | 3 |
| `inner_veilRiftEntry` | `anchor-surge`, Signal 10: `lose_heat 1` then anchor note; failure `gain_heat 1` | anchor note; failure no additional effect | `slip-fold`, Guile 10: slip-fold note; failure `gain_heat 1` | slip-fold note; failure no additional effect | 3 |

Exactly nine typed Heat leaves were removed without replacement: six `gain_heat 1` failures and three `lose_heat 1` successes.

## Preserved route and note behavior

- All six option IDs, option order, board labels, stats, difficulties, summaries, failure summaries, and exact note strings remain unchanged.
- Each selected option still grants only its own note on success. The non-selected note is not granted, and failure grants neither note nor another consequence.
- `middle_shardSprawlBargain` remains linked to Chain-Maul Yard, The Salt Archive, and Blastworks.
- `middle_webglassFracture` remains linked to Grave-Rail Junction and retains its scenario-objective identity.
- `inner_veilRiftEntry` remains linked to Melted Gate. Entering still requires origin `middle_guardian_span` and owner note `guardian-span-clearance`.
- No choice moves the operative, spends movement allowance, changes a route, grants Contract progress, or opens the center tile.
- Center entry remains restricted to the existing Last Signal Well/Dead Star Reliquary origin and `gate-of-cinders-breached` requirement.

## Ordering, lifecycle, and privacy

- The first option in each definition was pruned from Heat → note to the existing note effect. The second option’s note effect remains unchanged.
- Both failure branches now resolve with no additional effect, as approved. The existing test result still finalizes once.
- Board choices remain immediate server-authored options. No pending-choice schema or runtime state was added: before selection, reconnect reconstructs both options from current board/action state; after resolution, the existing phase and source-event guard prevent reopening or replay.
- Notes remain stored only on the affected owner. The existing public active-resolution summary still states which note was added; C2B4 does not change that established projection boundary.
- Missing or forged option IDs continue to be rejected by the existing resolver/server boundary.

## Wording decisions

No summary or board-space prose required editing because none describes the retired Heat resource. The phrases “flared too hot” and “running dangerously hot” remain approved environmental/anomaly language. No empty option, dangling clause, or Heat result row remains.

## Authored Heat recount

Before C2B4: **24 occurrences across 13 IDs**.

After C2B4: **15 occurrences across 10 IDs**:

- 9 `gain_heat`;
- 3 `gain_heat_all`;
- 3 `lose_heat`;
- C2A Group 5: 8 board-text occurrences across 3 IDs;
- separately blocked: 7 occurrences across `scenario_mirror_of_false_heroes`, `escalation-blackstar-hunger`, `escalation-choir-feedback`, `escalation-marrow-surgery-debt`, `escalation-saltwind-lockdown`, `crownless-advocate`, and `saltflat-bone-reader`.

The audit verdict remains **FAIL** while these authored effects remain.

## Focused coverage

Focused tests pin:

- exactly three definitions and their five linked locations;
- two ordered choices, exact option IDs/labels, stats, difficulties, summaries, notes, and consequence-free failures;
- selection isolation, note ownership, reconnect reconstruction, and duplicate rejection;
- no movement, topology, Melted Gate gate, or center-access change;
- no Heat or empty result row in owner phone, other phone, TV, or reconnect projection;
- exact remaining authored Heat population and validation manifest.

## Remaining C2A scope

Group 5 remains unchanged:

- `middle_guardianSpanThreshold`
- `inner_cinderLatticeTrial`
- `inner_gateOfCindersTrial`

No replacement, rebalance, topology change, runtime change, UI change, or unrelated gameplay change was made in C2B4.

## Verification record

- `npm.cmd run validate:content`: passed; canonical totals remain 17 characters, 71 gear, 109 Threats, 36 Contracts, 20 anomalies, 30 Artifacts, 24 followers, 15 Scars, 16 escalations, and 30 afflictions.
- `npm.cmd run typecheck`: passed.
- Focused C2B4/containment/board/projection slice: 8 files and 143 tests passed, including 12 dedicated C2B4 tests.
- `npm.cmd run test:engine`: passed.
- `npm.cmd run test:integration`: 27 files and 233 tests passed; the reconnect timing test passed without a retry.
- `npm.cmd run test:client`: 26 files and 258 tests passed.
- The first combined `test`/asset/build wrapper was stopped by its outer command timeout before results. Its exact commands were then run independently: `npm.cmd run test` passed 108 files and 1,150 tests; `npm.cmd run audit:assets` passed with 404/404 assets present; `npm.cmd run build` passed.
- `git diff --check` and `git diff --cached --check`: passed before commit.

During focused-test authoring, an initial test-only expectation incorrectly treated the active-resolution note summary as owner-private. The assertion was corrected to preserve the established projection boundary: note state is owner-only, while the active resolution publicly reports the note that was added. No runtime or projection behavior changed.
