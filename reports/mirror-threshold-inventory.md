# Mirror threshold inventory

Phase 1S is a report-only audit against `b856dd76bdd80606a044b350130c236761fed213`. Current code and tests are authoritative. No implementation is performed here.

## Executive finding

`heatThreshold` is not character Heat. It is a required, session-level configuration value whose sole production gameplay read gates confrontation with `scenario_mirror_of_false_heroes`. The server compares Mirror `scenarioProgress.mirrorPressure` (falling back to the requesting operative's Scar count) against the threshold when `SCENARIO_CONFRONTATION_REQUESTED` resolves. The canonical semantic name should be `reflectionPressureThreshold`.

The field is currently part of `GameState`, so it is present in current runtime state, strict unversioned/v0 snapshots, and current v1 snapshots. It is not authored in scenario content and is not sent through phone, TV, shop, or private projection contracts.

## Exact old-key inventory

| ID | Path | Symbol | Owning layer | Declares | Reads | Writes | Serializes | Projects | Tested |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| MT-01 | `src/game/schema/session.schema.ts` | `gameStateSchema.heatThreshold` | current runtime plus v0/v1 persisted state | yes | parser | parser | yes, through snapshot `state` | no | indirectly |
| MT-02 | `src/server/sessionState.ts` | `createInitialSessionState` | session construction | no | no | once | later through snapshot utility | no | yes |
| MT-03 | `src/game/rules/soloTuning.ts` | `SOLO_HEAT_THRESHOLD`, `getHeatThresholdForMode` | mode-derived initialization | alias/config | returns default | no state write | no | no | yes |
| MT-04 | `src/game/rules/legacyHeatCompatibility.ts` | `getMirrorReflectionPressureThreshold` | Mirror compatibility accessor | type-level old key | yes | no | no | no | yes |
| MT-05 | `src/server/roomServer.ts` | `resolveScenarioConfrontationIntent` | Mirror authoritative resolution | no | through accessor | no | no | no | yes |
| MT-06 | `src/game/persistence/sessionSnapshot.ts` | v0 migration, v1 parser, v1 serializer | snapshot boundary | implicit via schemas | copy/parse | copy/serialize | yes | no | yes |
| MT-07 | `scripts/legacy-heat-validation.ts` | `LegacyHeatConstruct`, recursive construct scan | validation compatibility classification | construct name | scans authored records | no | no | no | yes |
| MT-08 | seven focused/general test files under `src/**/__tests__` | state fixtures/assertions | tests and fixtures | fixture fields | yes | test-only | test-only | no | yes |
| MT-09 | `scripts/__tests__/legacy-heat-validation.test.ts` | validator fixtures | validation tests | fixture fields | yes | test-only | no | no | yes |

Production literal-token scan results (excluding reports, documentation, generated output, tests, `node_modules`, and `dist`): seven `heatThreshold` occurrences across four files. They comprise one schema declaration, one construction write, two validator classification occurrences, and three accessor signature/comment/read occurrences. The authoritative server comparison uses the semantic local `reflectionPressureThreshold` and therefore contains no old-key token.

Test literal-token scan results: eleven occurrences across seven runtime/server test files plus two occurrences in one validator test file. Seven test files contain GameState fixtures or assertions; the validator file contains two authored-content quarantine cases. There is no standalone snapshot fixture containing the spelling because snapshot tests construct state through `createInitialSessionState`; the nested state nevertheless carries the required key.

## Semantic proof

| Question | Current evidence-backed answer |
|---|---|
| Owner | Mirror-specific confrontation configuration stored globally in `GameState` |
| Scenario | Only `scenario_mirror_of_false_heroes` reads it |
| Default | 8 for single-player; 6 for every other `SessionMode` |
| Schema range | Integer, minimum 1, no maximum |
| Initialization | `createInitialSessionState` calls `getHeatThresholdForMode(sessionMode)` for every scenario |
| Content override | None; no scenario/content record authors the key |
| Compared value | `scenarioProgress.mirrorPressure`, or the requesting operative's Scar count when that counter is absent |
| Comparison timing | At authoritative Mirror confrontation request, before gate checks and confrontation-plan construction |
| Equality | Triggers because comparison is `mirrorPressure >= threshold` |
| Above threshold | Triggers identically |
| Below threshold | Normal Mirror gate and confrontation resolution continue |
| Effect at threshold | Ends that confrontation attempt immediately, creates an outcome summary, advances through resolution/broadcast, and awards no Mirror Break |
| Defeat | Does not directly end the session or set loss state |
| Repeatability | Every later confrontation request at/above the threshold is blocked; there is no one-time latch |
| Mutation/reset | No production mutation after initial construction and no reset behavior |
| Other systems | Does not mutate character state, Loss Pressure, Global Escalation, Win Progress, Wounds, Scars, or Salvage |

The scenario's authored `pressureTrack.max` is 8 and controls the public track display. It is a distinct value from this confrontation cutoff: multiplayer sessions currently cut off confrontation at 6 while the public Mirror Pressure track still has a maximum of 8. Phase 1T must preserve this distinction and must not replace the threshold with `pressureTrack.max`.

## Reflection Pressure flow

Mirror `scenarioProgress.mirrorPressure` begins absent/semantically zero. Current ambient hooks add one on Contract completion and add the number of gained gear entries on gear gain. Public pressure display reads the same counter, falling back to the highest Scar count when absent. The confrontation cutoff uses the counter, falling back specifically to the requesting player's Scar count. The confrontation plan separately uses that player's Scar count as its `mirrorPressure` difficulty input. These are existing semantics; Phase 1T is a field rename, not an opportunity to reconcile those proxies.

## Snapshot ownership

- Unversioned/v0: `legacyGameStateSchemaV0` extends the current `gameStateSchema`, so `heatThreshold` is required.
- v1: `sessionSnapshotSchema` embeds `gameStateSchema`, so the same key is required.
- v0 to v1: the Phase 1P migration copies all non-character-Heat state, including the threshold unchanged.
- v1 serialization: the pure serializer clones the entire `GameState`, including the threshold.
- Current runtime: `GameState` requires the field.
- Reconnection: reconnect attaches to an existing in-memory `GameRoomServer` and neither parses nor migrates a snapshot.
- Production persistence: no disk, database, cloud, or browser full-session caller exists. Snapshot utilities remain pure future restoration/serialization boundaries.

## Content, projection, and UI ownership

No canonical content file authors `heatThreshold`. Mirror's TypeScript scenario definition authors the public track name, maximum 8, rules text, and confrontation plan, but not this cutoff. Generated scenario catalogs contain no old-key field.

No current phone, TV, shop, host-phone, or private payload contains the threshold. Public UI exposes Mirror Pressure through `scenarioProgress`/the scenario pressure view and uses current Mirror/Reflection wording. No projection reads the legacy character-Heat archive. Phase 1R's projection Heat-key count remains zero.

## Git history

- `3b02f11` introduced `gameStateSchema.heatThreshold` in the initial import.
- `92250e6` introduced the Mirror scenario behavior that used the threshold.
- `71d49b5` centralized mode defaults at 8 solo and 6 multiplayer.
- `b9120ea` retired deprecated character-Heat status usage while retaining the Mirror comparison.
- `274ad94` placed the old-key read behind `getMirrorReflectionPressureThreshold` and explicitly documented its Reflection Pressure meaning.
- Phase 1P versioned the snapshot contract without renaming this unrelated field; Phase 1R removed the last projection Heat keys without touching it.

## Exact audit counts

| Measure | Count |
|---|---:|
| Production schema declarations of old field | 1 |
| Production gameplay reads of old field | 1, through one accessor |
| Production state writes | 1 initialization site; 0 mutations |
| Snapshot fields | 2 contracts: strict v0 and strict v1, sharing one schema declaration |
| Content fields | 0 |
| Projection fields | 0 |
| Canonical new field declarations | 0 |
| `reflectionPressureThreshold` exact occurrences | 3 local-variable uses in one server method; 0 field declarations |
| Scenario owners | 1 |
| Snapshot versions | 2 recognized inputs: unversioned v0 and literal v1 |
| Snapshot dispatcher | 1 |
| Migration functions | 1 (`v0 -> v1`) |
| Runtime threshold accessors | 1 |
| Tests directly protecting Mirror cutoff behavior | 1 |
| Tests directly protecting old-key serialization/accessor behavior | 1 |
| Test files with old-key state fixtures/assertions | 7 |
| Validator test files containing old key | 1 |

## Baseline containment

The rerun agrees with the Phase 1R baseline: current character Heat fields 0, current snapshot character Heat fields 0, projection Heat keys 0, legacy v0 character Heat declaration 1, save-version field 1, snapshot dispatcher 1, active character-Heat gameplay reads/writes 0/0, Heat-only content 29 IDs/32 branches/41 occurrences, and combined compatibility approval IDs 54. Mirror threshold validation remains a distinct compatibility construct and does not authorize character Heat.
