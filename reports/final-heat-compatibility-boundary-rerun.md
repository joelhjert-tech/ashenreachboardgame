# Final Heat compatibility boundary rerun

Date: 2026-07-16

Checkpoint: `91acd7f feat: retire final follower heat effects`

Phase: C6A

Scope: report-only repository audit

## Verdict

**CONDITIONAL PASS**

Active authored Heat is fully retired and the gameplay boundary is mechanically safe:

- active authored typed Heat effects: **0 across 0 IDs**;
- active gameplay reads of a Heat value: **0**;
- active gameplay writes of a Heat value: **0**;
- gameplay-mutating `HEAT_THRESHOLD_REACHED` paths: **0**;
- Heat-to-Scar, Heat-to-Wound, Heat-to-recall, or Heat-to-defeat paths: **0**;
- phone Heat fields, results, labels, and prompts: **0**;
- TV Heat fields, results, labels, and prompts: **0**;
- legacy save parsing failures in covered v0/v1/v2 fixtures: **0**;
- reconnect or replay reactivation of Heat: **0**.

PASS is not yet justified. Heat remains in broad shared/current schemas and protocol types, four canonical follower records retain compatibility-only `lossCondition: "heat"`, five Threat definitions retain stable Heat-shaped keys and four retain deprecated `heat` tags, dead client and asset residue remains, and six current documentation statements still teach Heat as active. These are contained, but not cleanly isolated enough for PASS.

No compatibility field, gameplay rule, content definition, schema, migration, validation rule, test, projection, UI component, or asset was changed in C6A.

## Search method

The audit used the tracked file set from `git ls-files` through:

```text
git grep -I -i -n -o -e heat -- .
```

This case-insensitive substring search deliberately includes:

- `heat`, `Heat`, and `HEAT`;
- snake/camel variants such as `gain_heat`, `heatThreshold`, and `heatDelta`;
- stable IDs such as `heat-sink-prayer`;
- ordinary words such as `heated`, `heat haze`, and the `heat` substring in prose;
- historical reports and tests.

Each physical substring occurrence was counted once. Targeted symbol searches then inspected typed effects, thresholds, actions, tags, follower loss conditions, result types, projections, migration fields, save fields, and UI branches. Binary files were excluded by `git grep -I`; tracked textual asset paths and prompt catalogs were included.

Result at the audited `91acd7f` checkpoint, before adding the self-referential C6A reports: **4,365 tracked Heat substrings across 261 tracked files**.

The earlier audit reported matching lines. C6A reports substring occurrences, so the totals are intentionally not comparable. The two new reports and two report updates are excluded from the corpus so their own wording cannot change the result they document.

## A-G classification

| Category | Occurrences | Files | Finding |
|---|---:|---:|---|
| A — Active authored gameplay | 0 | 0 | No canonical typed Heat effect, requirement, threshold, cost, reward, or rule remains. |
| B — Active player-facing presentation | 13 | 10 | All 13 are ordinary environmental/art language such as heat haze, heated chain, or heat bloom. Retired-resource presentation: **0**. |
| C — Required runtime compatibility | 299 | 34 | Parsers, no-op effects/actions, projection stripping, validation guards, stable IDs/keys, legacy metadata, and broad protocol/schema shapes. |
| D — Tests and fixtures | 915 | 65 | Boundary, migration, no-op, projection, follower, scenario, and historical regression coverage. |
| E — Documentation and history | 3,106 | 144 | Reports, current/deprecated docs, comments, and historical plans. Six current statements are misleading and need C6E cleanup. |
| F — Dead or obsolete residue | 32 | 11 | Dead UI branches, obsolete Heat art/prompt entries, misleading names, and a stale text classifier. |
| G — Ambiguous | 0 | 0 | Every tracked occurrence received an evidence-backed classification. |

Category file counts overlap where a file contains more than one category. Occurrence counts are mutually exclusive and sum to 4,365.

### Classification ledger

The following rules assign every tracked occurrence:

| Match family | Count | Category | Evidence |
|---|---:|---|---|
| All `reports/**`, `docs/**`, and `README.md` occurrences | 3,103 | E | Documentation or history; current misleading statements are identified below. |
| All `__tests__`/test-directory occurrences | 914 | D | Tests and fixtures. |
| `scripts/validate-six-scenario-e2e.ts` legacy `heat: 0` fixture | 1 | D | QA compatibility fixture, not production state. |
| Current validation and authoring guard symbols | 126 | C | `scripts/legacy-heat-validation.ts` and `scripts/validate-content.ts`. |
| Canonical stable IDs, Threat keys/tags, follower metadata, and Scar-Sink Prayer references | 17 | C | Required until explicit content/state migration. |
| Production schemas, migrations, no-op reducers, projection stripping, protocol types, and defensive filters | 156 | C | Required or conservatively retained until C6C/C6F. |
| Legacy Threat resolver aliases | 19 | C | Stable keys resolve inertly; stale pending-state deletion needs migration tests. |
| Ordinary environmental content/art language | 13 | B | No resource semantics or Heat UI. |
| Current-code boundary comments outside docs | 3 | E | Historical/deprecation explanation only. |
| Dead client branches, obsolete art prompts, stale naming/classification | 32 | F | No supported save parser depends on these exact presentation/naming branches. |

The C totals are 126 + 17 + 156 = 299. Category F is not deleted in this pass.

## Canonical content proof

Canonical content was inspected through both JSON loaders and direct searches.

| Content family | Files/records validated | Typed Heat | Heat IDs | Lexical matches | Classification |
|---|---:|---:|---:|---:|---|
| Characters | 17 | 0 | 0 | 0 | Clean current authoring |
| Equipment/Gear | 71 | 0 | 0 | 1 | Stable `heat-sink-prayer` ID only |
| Artifacts | 30 | 0 | 0 | 3 | Stable Scar-Sink Prayer IDs plus `heat-clean` prose |
| Threats | 109 | 0 | 0 | 10 | Five stable keys, four tags, one `heated` lore use |
| Board/space effects | canonical graph and board effect catalog | 0 | 0 | 0 mechanical | Board Heat retirement remains complete |
| Scenarios | 6 | 0 | 0 | 1 | Scenario-art prompt says `heat bloom` |
| Escalations | 16 | 0 | 0 | 0 | Escalation Heat retirement remains complete |
| Followers | 24 | 0 | 0 | 6 | Four legacy loss conditions, one deprecated tag, one art prompt |
| Missions/Contracts | 30 missions / 36 Contracts | 0 | 0 | 1 | Mission art prompt says `heat haze` |
| Anomalies | 20 | 0 | 0 | 1 | Ordinary `heat haze` text |
| Scars | 15 | 0 | 0 | 0 | Active lasting-injury system |
| Afflictions | 30 | 0 | 0 | 0 | Heat-free |
| Services/Shops | current service/shop catalogs | 0 | 0 | 0 authored | Compatibility fields remain in shared result/cost types |
| Notes/Challenges | current typed note/challenge catalogs | 0 | 0 | 0 mechanical | Heat-free |

The 13 Category B occurrences are descriptive environmental or visual terms. None names a player resource, amount, threshold, cost, status, icon, or result.

## Runtime mechanical reads and writes

### Active Heat value access

No current authoritative character or game state contains a playable Heat value. Current character construction omits Heat. The only numeric Heat reads occur while importing old snapshots:

- `src/game/persistence/sessionSnapshot.ts` removes legacy `character.heat` and archives positive values in `legacyCompatibility.characterHeat`;
- `src/game/persistence/sessionSnapshot.ts` maps legacy `heatThreshold` to current `reflectionPressureThreshold`;
- `src/game/schema/session.schema.ts` validates the old shapes and archival metadata.

Those values are not reinserted into current `GameState`.

### Generic effect compatibility

`src/game/rules/legacyHeatCompatibility.ts` recognizes `gain_heat`, `gain_heat_all`, and `lose_heat` only as compatibility effects. `applyLegacyHeatNoop` returns the same player. The reducer produces the explicit summary `no additional status change`.

The `gain_heat_all` reducer branch iterates players but applies the same no-op. It changes no character or shared state. No canonical authored content can create these effects.

### Heat threshold action

`HEAT_THRESHOLD_REACHED` remains in the action union for serialized-event compatibility. Its reducer branch is:

```ts
return { ok: true, state, emitted: [] };
```

It preserves object identity and changes none of:

- sequence or event log;
- operative location, status, recall, or defeat;
- Wounds, Scars, or pending Scar state;
- Salvage, items, followers, or modifiers;
- Global Escalation or scenario Loss Pressure;
- movement, prompts, victory, or loss;
- phone/TV result state.

Repeated and reconnected legacy actions remain the same exact no-op. No secondary middleware or server handler processes this action.

### Misleading non-Heat runtime names

`getGlobalHeatLevel` in `src/game/rules/nemesisRelay.ts` is reachable through Nemesis movement logic but reads only:

- maximum current Scar count; and
- `state.escalationLevel`.

It never reads legacy Heat metadata. Its name and the stable `heat_on_threat_defeat` special-rule ID are Category F cleanup candidates, not Heat mechanics.

`src/game/rules/shopCategories.ts` still includes `heat` in a text-classification regex for consumable categorization. No current authored item relies on it. It is a reachable but obsolete lexical classifier, not a read of Heat state; remove it in C6B with shop-category regression coverage.

## Heat-to-Scar boundary

No production call graph maps Heat values or Heat effects to:

- direct Scars;
- pending Scars;
- Wounds;
- recall;
- replacement operatives;
- defeat;
- trauma/corruption conversion.

Legacy snapshot migration archives Heat separately and never consults it when building current Scars. Paired legacy snapshots with Heat 0 and Heat 7 produce identical current game state and Scar state. Normal Wound → recall → pending Scar behavior remains the only relevant tested lifecycle.

The Scar-Sink Prayer stable ID includes `heat`, but its active name and behavior are Scar-based. It does not consume or inspect Heat.

## Projection and UI boundary

Both authoritative projection constructors call `stripLegacyHeatProjection`:

- `createPhoneProjection`;
- `createTvProjection`.

The strip boundary removes:

- Heat-shaped field names;
- Heat effect records;
- Heat result rows;
- exact `heat` tags;
- follower `lossCondition: "heat"`.

Stable IDs such as `heat-sink-prayer` remain intact while the displayed name is Scar-Sink Prayer.

Owner phone, other phones, TV, lobby, active resolution, movement, scenario, shop, reconnect, follower notes, and legacy-result fixtures all pass deep serialized-key scans.

Current client code still contains defensive Heat filters and dead formatting branches. They receive no live Heat projection and display no Heat. They are C/F cleanup candidates rather than active presentation.

## Save and reconnect compatibility

| Legacy shape | Current behavior | Gameplay effect | Client exposure |
|---|---|---|---|
| v0 `character.heat` | Strictly parsed; positive values archived in `legacyCompatibility.characterHeat` | None | Stripped/not projected |
| v0/v1 `heatThreshold` | Strictly parsed and migrated to Reflection pressure threshold | Current Reflection behavior, not Heat behavior | No Heat key |
| `gain_heat` / `gain_heat_all` / `lose_heat` | Parsed by broad compatibility effect schema | Exact no-op | No Heat result |
| `HEAT_THRESHOLD_REACHED` | Parsed by action union | Exact no-op | No event/result |
| follower `lossCondition: "heat"` | Parsed on four canonical/legacy-compatible followers | No active loss handling found | Stripped |
| follower `heat` tag | Parsed as metadata | No active mechanic found | Exact tag stripped |
| Heat result/cost fields | Accepted by broad shared protocol types | No current server generation | Stripped or defensively filtered |
| stable Heat-shaped Threat keys | Resolve through inert compatibility aliases | No additional status change | No Heat row |

Covered migration and reconnect tests pass. Current content remains authoritative after migration, and completed retired consequences do not replay.

Minimum compatibility currently required:

- v0/v1 snapshot schemas and migrations;
- `legacyCompatibility.characterHeat`;
- legacy effect/action discriminators and exact no-op handling;
- projection stripping while broad/stale payload shapes remain supported;
- stable Scar-Sink Prayer IDs;
- follower loss-condition parsing until migrated;
- stable Threat-key aliases until pending-state compatibility is resolved.

## Current-model and compatibility-model separation

The separation is behavioral but not structural.

Current canonical authoring is protected by content validation and an empty typed-effect approval manifest. New authored Heat effects fail validation.

However:

- `EncounterEffect` and `simpleEffectSchema` still include Heat variants;
- follower schemas still admit `lossCondition: "heat"`;
- gear schemas still admit `heatCost`;
- current client/server shared types still include Heat result/cost shapes;
- compatibility parsing and current authoring share several unions.

This is the primary reason for CONDITIONAL PASS. C6C must create a clean current-versus-legacy type boundary before PASS.

## Validation boundary

Validation is effective but layered:

- canonical characters must omit Heat;
- new typed `gain_heat`, `gain_heat_all`, and `lose_heat` authoring is rejected;
- board/scenario runtime-effect signature approval is empty;
- stable compatibility IDs do not authorize Heat effects;
- historical reports and test fixtures are outside canonical content validation.

The guard is sufficient for current content but fragile because the general schema still compiles Heat. Two lexical approvals remain for ordinary prose:

- `anomaly-cinder-mirage-lane`;
- `artifact-cinder-suture-kit`.

These are not mechanical exceptions. C6C should distinguish resource language from ordinary lowercase environmental prose and remove the stale approvals.

## Follower compatibility residue

Four followers retain `lossCondition: "heat"`:

- `black-lantern-broker`;
- `choir-defector`;
- `gate-saint-acolyte`;
- `saltflat-bone-reader`.

`lucy-hell-puppy` retains a `heat` tag.

No production follower-use path reads these values to apply a consequence. Server projection stripping removes them. Deleting them now would change canonical serialized shapes and requires a deliberate migration/compatibility decision.

C5B remains exact:

- `crownless-advocate` uses its approved explicit owner-private `gain_note`;
- `saltflat-bone-reader` uses its approved explicit owner-private `gain_note`;
- both retain server-enforced stable-ID `oncePerRound`;
- no generic role fallback is used;
- reconnect preserves the private note and use boundary without replay.

## Threat compatibility residue

The following stable keys remain:

- `threat_force_choose_heat_or_wound`;
- `threat_force_discard_gear_or_gain_heat`;
- `threat_combat_plus_one_if_player_has_heat`;
- `threat_pay_heat_or_enemy_plus_two`;
- `threat_defeat_reduce_heat`.

Four corresponding Threat records retain `heat` tags. The current resolver aliases return no additional status change or otherwise avoid Heat mutation. These keys may exist in pending saved resolution state, so they are Category C until stale pending-Threat migration/reconnect fixtures prove safe replacement. Their generic unused sibling handlers and helper names are later cleanup candidates.

## Dead and obsolete residue

The 32 Category F occurrences are grouped as:

| Group | Occurrences | Disposition |
|---|---:|---|
| Deprecated Heat card/deck/template/icon prompts | 24 | Safe after reference audit; no save dependency |
| Dead phone/TV reward/shop formatting branches | 3 | Safe after stale payload fixtures and projection tests |
| Misnamed Nemesis helper/import and stable unused special rule | 4 | Behavior-preserving rename/alias decision; keep save ID if serialized |
| Obsolete shop text classifier | 1 | Safe with shop-category tests |

No Category F item was deleted in C6A.

## Documentation findings

Historical Heat reports are correctly retained as history. `docs/ASSET_PIPELINE.md` correctly marks Heat assets deprecated/reference-only.

Six current statements can mislead:

- `README.md`: describes persistent Wound / Heat scars;
- `docs/MOTION_BIBLE.md`: includes Heat result chips;
- `docs/MVP_RULES.md`: says failure adds Heat, lists adding Heat, and teaches Heat as an active system.

These do not affect runtime correctness but prevent PASS. C6E should update current rules and motion documentation without rewriting historical reports.

## Zero-boundary matrix

| Boundary | Expected | Actual | Evidence | Status |
|---|---:|---:|---|---|
| Authored typed Heat effects | 0 | 0 | Canonical loader scan and containment tests | PASS |
| Authored Heat IDs | 0 | 0 | No canonical typed-effect owner | PASS |
| Runtime mechanical Heat reads | 0 | 0 | Production call-site trace; migration reads excluded | PASS |
| Runtime mechanical Heat writes | 0 | 0 | Reducer/server trace | PASS |
| Heat threshold gameplay mutations | 0 | 0 | Exact no-op reducer identity test | PASS |
| Heat-to-Scar paths | 0 | 0 | Migration and Scar call-graph/test review | PASS |
| Phone Heat fields/results | 0 | 0 | Deep projection scans | PASS |
| TV Heat fields/results | 0 | 0 | Deep projection scans | PASS |
| Current-rulebook Heat mechanics | 0 | 6 misleading statements | README/MVP rules/motion docs | CONDITION |
| Legacy save parsing failures | 0 | 0 | v0/v1/v2 migration tests | PASS |
| Reconnect Heat replays | 0 | 0 | threshold, effect, follower, and reconnect tests | PASS |
| Required compatibility references | report count | 299 occurrences / 34 files | C ledger | CONTAINED |
| Dead/obsolete references | report count | 32 occurrences / 11 files | F ledger | CONDITION |
| Ambiguous references | 0 preferred | 0 | Full occurrence assignment | PASS |

## Four critique seats

### New player

The live phone, TV, cards, and active rules delivered by the game do not expose Heat. Wounds and Scars are the active injury systems. The stale MVP/readme prose is the remaining learning risk.

### Optimizer

Legacy Heat values cannot change current state, thresholds, rewards, followers, or Scars. No-op actions cannot generate sequence increments, events, rewards, or repeatable notes. C5B notes remain once-per-round and owner-authoritative.

### Family/casual player

Retired Heat bookkeeping is absent from play and compatibility behavior is invisible. Defensive client filters and retained metadata require no player action.

### Rules lawyer

New authored Heat fails validation, but broad shared schemas still technically represent Heat. Old actions parse and are exact no-ops. Projection stripping is complete in covered states. Full deletion requires a declared save/protocol boundary and migration-only types.

## Verification

Passed:

- tracked repository classification: 4,365 occurrences / 261 files;
- `npm.cmd run validate:content`: 17 characters, 71 gear, 109 Threats, 36 Contracts, 20 anomalies, 30 Artifacts, 24 followers, 15 Scars, 16 escalations, 30 afflictions;
- `npm.cmd run typecheck`;
- focused compatibility, migration, follower, projection, and Nemesis set: 8 files / 69 tests;
- focused Wound/Scar, scenario, escalation, and reconnect set: 11 files / 125 tests;
- `npm.cmd run test:engine`: 60 files / 712 tests;
- `npm.cmd run test:integration`: 27 files / 233 tests;
- `npm.cmd run test:client`: 26 files / 260 tests;
- `npm.cmd run test`: 113 files / 1,205 tests;
- reconnect timing regression passed in focused, integration, and aggregate runs without retry;
- `npm.cmd run audit:assets`: 422 / 422 present, zero missing/invalid/placeholders/release blockers;
- `npm.cmd run build`.

Existing test-only missing-art fallback diagnostics remained non-failing. They are unrelated to Heat and the asset audit passed.

## Scope conclusion

C6A changes reports only. Authored typed Heat remains zero. Crownless Advocate and Saltflat Bone-Reader retain their exact approved notes. No gameplay, content, schema, migration, compatibility field, validation rule, test, phone/TV code, asset, save format, reconnect behavior, or expansion status changed.

The previously recorded quarantined-audit hashes remain the historical baseline. No quarantined report was present as a stageable worktree file in this checkout, and the ignored research tree was not modified.
