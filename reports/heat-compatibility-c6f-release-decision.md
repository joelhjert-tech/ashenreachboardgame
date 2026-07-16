# Heat Compatibility C6F — Release and Save-Version Decision

Date: 2026-07-17

Checkpoint: `fc486bf docs: remove current heat guidance`

Phase type: report-only release decision

Selected option: **Decision B — retain compatibility through a defined version cutoff**

Verdict at this checkpoint: **CONDITIONAL PASS**

## Executive decision

Ashen Reach will support unversioned v0, v1, and legacy-compatible v2 snapshot input for the lifetime of the save-version-2 line. Current code continues to write version 2. Removal or material narrowing of those import paths is allowed only with an explicit version-3 release decision, migration coverage, release notes, and a declared support cutoff.

Intentional, isolated, tested backward compatibility is compatible with a final **PASS** verdict. Historical parsers, adapters, projection stripping, tests, fixtures, and inert no-op handlers are not active gameplay defects. They do not need to be deleted merely to reduce repository search counts.

The current checkpoint remains **CONDITIONAL PASS** for one narrow reason: the current Dying Star Nemesis definition still authors the mechanically inert, Heat-named `specialRuleId` value `heat_on_threat_defeat`. It has no runtime reader and is safe to rename separately to a neutral current identifier while old snapshots continue accepting the historical string. Once that approved group lands and the zero boundary is rerun, retained v0–v2 compatibility does not by itself prevent PASS.

## Evidence and product assumptions

- The repository has a draft PR rather than a merged stable release for this work.
- Git tags describe playtest and feature checkpoints; no GitHub release establishes a public save-compatibility promise.
- The snapshot parser/serializer is implemented and heavily tested, but no server or client production module currently calls it as a public save/load endpoint.
- Current playtesters or local fixtures may still possess Heat-bearing snapshots, so silently dropping support has player and debugging cost without a demonstrated benefit.
- Cross-version client/server multiplayer is not negotiated by the repository. The server emits only the current projection protocol.
- Because external save circulation is not provable from repository evidence, the safe product decision is tested import support through v2 rather than an indefinite promise or immediate deletion.

## Actual save contract

| Question | Repository finding |
|---|---|
| Current writer version | `CURRENT_SAVE_VERSION = 2` in `src/game/persistence/sessionSnapshot.ts`. |
| Oldest accepted version | Unversioned v0 via `legacySessionSnapshotSchemaV0`. |
| Other accepted versions | v1 via `sessionSnapshotSchemaV1`; current and historical v2 via `legacyCompatibleSessionSnapshotSchemaV2`. |
| Formally documented before C6F | Parser error text and tests explicitly named v0/v1/v2, but there was no standalone release support policy. |
| Intended policy after C6F | v0/v1/v2 import is supported through the save-version-2 line. |
| Current save emission | Canonical v2 state; no operative Heat, threshold, Heat effects/actions/results, Heat shop/gear costs, or follower/Threat Heat metadata. |
| Archival emission | Clean new sessions omit `legacyCompatibility`. A migrated snapshot may preserve positive `legacyCompatibility.characterHeat` records when the caller passes the archival bag to the serializer. |
| Legacy event handling | Event-log entries are normalized, not replayed to reconstruct state. Heat effects become `legacy_compatibility_noop`; threshold and retired stabilize events become inert `LEGACY_COMPATIBILITY_EVENT` records. |
| Resave behavior | Retired active fields are dropped or normalized. Positive historical character values may round-trip only in the archival bag. Byte-for-byte legacy round-trip is not guaranteed. |
| Reconnect | Reconnect uses normalized current state and current projections; legacy residue is stripped before phone/TV payloads. |
| Cross-version clients | Not supported or negotiated. Old serialized snapshot input is distinct from old-client protocol support. |
| Public product promise | No prior public promise is proven. This policy creates the explicit repository contract for the v2 line. |

Parser acceptance, tested support, documented support, and release intent are therefore aligned by this phase: v0/v1/v2 snapshot import is tested and now documented as supported until a v3 boundary.

## Category C compatibility inventory

The 297 Category C references are retained based on function and risk, not raw count.

| Group | Exact files and principal symbols | Versions / callers | Input and output role | New-session need | Risk if deleted | Decision |
|---|---|---|---|---|---|---|
| 1. Legacy save schemas | `src/game/schema/character.schema.ts`: `legacyCharacterSchemaV0`, `legacyCompatibleCharacterSchema`, `normalizeLegacyCharacter`; `src/game/schema/session.schema.ts`: `legacyGameStateSchemaV0`, `legacySessionSnapshotSchemaV0`, `sessionSnapshotSchemaV1`, `legacyCompatibleSessionSnapshotSchemaV2` | v0/v1/v2 parser in `sessionSnapshot.ts` | Input-only legacy shapes; normalized output is canonical | No | High save-loss risk | Retain through v2 line |
| 2. Legacy effect types | `src/game/schema/card.schema.ts`: `GainHeatEffect`, `GainHeatAllEffect`, `LoseHeatEffect`, `LegacyCompatibleEncounterEffect`, `legacyCompatibleEffectSchema` | Embedded v0/v1/v2 state and events | Accepts historical leaves; output is current effect or explicit compatibility no-op | No | High pending-resolution risk | Retain through v2 line |
| 3. Legacy action types | `src/game/engine/actions.ts`: `HeatThresholdReachedAction`, `LegacyCompatibleGameAction`, legacy shop cost/result types | Historical event-log normalization only | Input union; current `GameAction` excludes Heat creation | No | Medium event-history risk | Retain through v2 line |
| 4. Legacy result/shop types | `src/game/engine/actions.ts`: `LegacyCompatibleShopServiceCost`, `LegacyCompatibleShopServiceResult`; `src/game/schema/session.schema.ts`: `legacyCompatibleShopStockRevealSchema` | Historical service, purchase, and reveal records | Removes `heat`, `heatDelta`, and old reveal costs during normalization | No | Medium stale-shop risk | Retain through v2 line |
| 5. Migration adapters | `src/game/persistence/sessionSnapshot.ts`: `migrateSessionSnapshotV0ToV1`, `migrateSessionSnapshotV1ToV2`, `parseAndMigrateSessionSnapshot`, `normalizeLegacyGameState`, `mergeLegacyCharacterHeat` | All supported snapshot imports | Converts legacy input into strict current v2 state | No | High corruption risk | Retain through v2 line |
| 6. Event-log normalization | `src/game/persistence/legacyGameActionCompatibility.ts`: `normalizeLegacyGameAction`, `normalizeLegacyEventLog`, `LegacyCompatibilityEventRecord` | v0/v1/v2 event logs | Normalizes known Heat actions/effects; does not execute them | No | High deduplication/history risk | Retain through v2 line |
| 7. Reconnect normalization | `src/game/persistence/sessionSnapshot.ts`; current `RoomServer` projection paths | Imported sessions and reconnect snapshots | Reconnect sees canonical state; no retired effect is re-applied | No | High duplicate-effect risk | Retain and keep covered |
| 8. Projection stripping | `src/server/legacyHeatProjection.ts`: `stripLegacyHeatProjection`; `src/server/roomServer.ts` public/private projection calls | Any stale or legacy-shaped projection input | Defense-in-depth removal before owner, other-phone, and TV output | No for clean state, yes for supported imports | Medium privacy/UI risk | Retain through v2 line |
| 9. Archival metadata | `src/game/schema/session.schema.ts`: `legacyCharacterHeatRecordSchema`, `legacyCompatibilityMetadataSchema`; `src/game/persistence/sessionSnapshot.ts`: `mergeLegacyCharacterHeat` | Positive historical v0/v1/v2 values | Optional archival bag; never copied into current character state | No | Low gameplay risk, medium round-trip risk | Retain for v2; revisit at v3 |
| 10. Follower/Threat legacy metadata | `src/game/schema/follower.schema.ts`: `legacyCompatibleFollowerSchema`, `normalizeLegacyFollowerMetadata`; `src/game/schema/card.schema.ts`: legacy tags/cards; `src/game/cards/threatEffectKeys.ts`; `src/game/rules/legacyHeatCompatibility.ts`: `normalizeLegacyThreatCard` | Embedded historical followers and pending Threats | Strips tags/loss conditions, maps two established keys, preserves one Wound, omits obsolete keys | No | High pending-encounter risk | Retain through v2 line |
| 11. Compatibility tests/fixtures | `src/game/persistence/__tests__/sessionSnapshot.test.ts`, C6C/C6D schema tests, containment/construction tests, server projection tests, validation tests | CI only | Proves acceptance, inertness, privacy, and current authoring rejection | Tests only | High regression-detection cost | Retain while support remains |
| 12. Serialization/version handling | `src/game/persistence/sessionSnapshot.ts`: `CURRENT_SAVE_VERSION`, `serializeSessionSnapshotV2`, `UnsupportedSnapshotVersionError`; `src/game/schema/session.schema.ts`: snapshot schemas | Current writer and all import callers | Writes canonical v2; accepts declared old inputs | Yes, serializer/version are current | High save-format risk | Keep v2 until explicit v3 |
| 13. Explicit no-op handlers and guards | `src/game/rules/legacyHeatCompatibility.ts`: `normalizeLegacyEncounterEffect`, `applyLegacyCompatibilityNoop`; `src/game/engine/reducer.ts`; `scripts/legacy-heat-validation.ts`; `scripts/validate-content.ts` | Migration boundary, current reducer sentinel, authoring validation | Converts legacy leaves to inert state and blocks new authored Heat | Compatibility plus current guard | High reintroduction risk | Retain; current authoring guards are permanent |

The compatibility types remain explicitly named. They are used by persistence, normalization, validation, and the one reducer compatibility sentinel. Normal content loaders and current action/result creators do not consume them.

## New-save emission audit

| Retired shape | Clean new v2 save | Resaved migrated v2 | Finding |
|---|---|---|---|
| Operative `heat` | Omitted | Omitted from character state | Canonical character schema is Heat-free |
| `heatThreshold` | Omitted | Omitted; old value becomes the already-established `reflectionPressureThreshold` migration input | No active Heat threshold |
| `gain_heat`, `gain_heat_all`, `lose_heat` | Omitted | Normalized to `legacy_compatibility_noop` if still pending | No active effect re-emission |
| `HEAT_THRESHOLD_REACHED` | Omitted | Normalized event history may retain `legacyType: "HEAT_THRESHOLD_REACHED"` inside an inert compatibility record | Not a current action |
| Heat result/shop fields | Omitted | Removed by action/state normalization | No current result union admits them |
| Follower Heat metadata | Omitted | Stripped during normalization | Current follower model rejects it |
| Threat Heat metadata | Omitted | Stripped, mapped, or omitted by the exact legacy adapter | Current Threat model rejects it |
| `legacyCompatibility.characterHeat` | Omitted for clean sessions | Preserved only when positive archival records exist and are supplied to serialization | Archival-only; never projected or interpreted |
| Legacy compatibility bag | Omitted when empty | Optional archival bag may remain | Safe to omit for clean sessions; dropping non-empty bags is deferred to v3 policy |

No version bump is required for clean v2 saves to omit retired active state; they already do. Removing non-empty archival metadata from migrated v2 round trips would change the declared v2 compatibility behavior and is deferred.

## Legacy-load behavior

| Legacy input | Parse and normalization | Canonical/resave result | Gameplay/projection result |
|---|---|---|---|
| v0 operative Heat and threshold | Strict v0 schema accepts valid nonnegative Heat and positive threshold | Character field removed; positive value archived; threshold consumed by existing migration | No mutation or display |
| v1 Heat threshold and archival values | Strict v1 schema accepts declared shape | Current v2 state plus optional archival bag | No mutation or display |
| v2 embedded Heat state/effects | Legacy-compatible v2 schema accepts supported forms | Current state excludes Heat; pending leaves become inert no-op | No mutation or display |
| `gain_heat`, `gain_heat_all`, `lose_heat` | Exhaustive effect adapter | Current no-op, with surviving sequence order preserved | No Wound, Scar, recall, reward, escalation, or movement |
| `HEAT_THRESHOLD_REACHED` | Legacy action adapter | Inert compatibility history record | Never reaches current reducer as a Heat action |
| Legacy Heat result/shop shapes | Accepted in declared legacy action/state locations | Retired fields dropped | No client row or prompt |
| Follower `lossCondition: "heat"` / tag | Legacy follower schema and normalizer | Follower remains attached; retired metadata omitted | No discard, exhaustion, transfer, or projection |
| Historical Threat keys/tags | Exact legacy key/tag schemas and normalizer | Two keys map to existing behavior, the mixed key preserves one Wound, obsolete keys disappear | No Heat result; encounter identity and remaining behavior survive |
| Positive archival metadata | Strict owner/identity validation | Optional bag round-trips | No gameplay reader or projection |
| Malformed structural Heat values | Zod validation rejects missing, negative, wrong-type, duplicate, or owner-invalid declared fields | No current state is produced | Safe failure; no partial mutation |
| Partial Heat event-log object | Event log is historical `unknown[]`; recognized type is normalized to an inert record even if optional historical detail is absent | Historical record only | No current logic matches `LEGACY_COMPATIBILITY_EVENT`; no reward or state mutation |

Legacy event logs are normalized as history rather than replayed to reconstruct the session. Current state is authoritative. Resaving is deterministic and idempotent in the covered fixtures.

## Compatibility isolation and import direction

PASS-quality boundaries are satisfied apart from the separate Category F name cleanup:

- authored schemas and current metadata schemas structurally reject Heat;
- current `GameAction`, client result types, shop costs, and gear types exclude Heat;
- old actions and effects enter through explicitly named `LegacyCompatible...` types and normalizers;
- current runtime does not import legacy Heat effect unions broadly;
- `sessionSnapshot.ts` owns legacy-to-current conversion;
- `legacyHeatProjection.ts` is a final defense before public/private payloads;
- current authored validation retains zero-authoring guards;
- compile-time, schema, migration, containment, reconnect, and projection tests cover the boundary.

One deliberate bridge remains: `reducer.ts` recognizes only the normalized `legacy_compatibility_noop` runtime sentinel and returns the player unchanged. It does not import or accept `gain_heat`, `gain_heat_all`, or `lose_heat`. This is explicit isolation, not a gameplay read/write path.

No ambiguous reachable Heat path was found.

## Classification after the report-only decision

No production, schema, migration, fixture, asset, or canonical-content file changes in C6F, so the comparable retirement corpus remains:

| Category | Occurrences | Finding |
|---|---:|---|
| A — Active authored gameplay | 0 | No canonical Heat mechanic |
| B — Environmental/art presentation | 13 | Mechanical exposure remains 0 |
| C — Required compatibility | 297 | Frozen v0–v2 schemas, adapters, guards, and projection defenses |
| D — Tests and fixtures | 971 | Compatibility and boundary evidence |
| E — Documentation/history | 2,816 | Historical and compatibility documentation; current misleading guidance remains 0 |
| F — Dead/obsolete residue | 1 | Final current Nemesis identifier approved for Group 1 rename |
| G — Ambiguous | 0 | Every reference remains classified |

These mutually exclusive counts sum to **4,098 occurrences across 240 files** under the established comparable-corpus method, which excludes phase implementation/decision reports and the living audit reports they update. The literal post-report tracked search is **4,865 matches across 248 files** because this decision and support policy intentionally document retired compatibility; that documentation growth does not represent gameplay residue.

## Final disposition of `HEAT_THRESHOLD_REACHED`

Retain until the v3 cutoff as a legacy event input only.

- It is absent from current `GameAction` and current command APIs.
- `LegacyCompatibleGameAction` accepts it for historical event parsing.
- `normalizeLegacyGameAction` converts it to `LEGACY_COMPATIBILITY_EVENT`.
- The current reducer never receives it.
- It changes no state, sequence, prompt, event reward, projection, Wound, Scar, recall, defeat, escalation, movement, or victory result.

At v3, either retain a one-way v0–v2 import adapter that consumes it or explicitly end old event-log import support. It must not be deleted while direct v0–v2 import is supported.

## Archival `characterHeat`

`legacyCompatibility.characterHeat` is an archival identity/value bag, not current state.

- Clean new sessions do not emit it.
- v0/v1/v2 migrations create or preserve it only for positive historical values.
- Current gameplay, reconnect logic, analytics, debug behavior, and projection do not read it.
- Owner identity validation prevents orphan and duplicate records.
- Old-event identity does not depend on its value.
- It can be dropped at a v3 normalization boundary without conversion, but doing so now would end the documented v2 archival round trip.

It must never map to Wounds, Scars, recall, defeat, or another resource.

## Final Category F disposition

The sole Category F occurrence is:

- File: `src/game/rules/nemesisRelay.ts`
- Field/value: Dying Star `specialRuleId: "heat_on_threat_defeat"`
- Production readers: none for this value; `roomServer.ts` only branches on `specialRuleId === "cleave"`
- Serialization: the free-form string is present in current Nemesis champion state/projection
- Historical parsing: `specialRuleId` accepts any nonempty string, so old snapshots containing the historical value remain parseable without retaining the canonical value
- Gameplay: no effect, no Heat mutation, no event identity dependency

Disposition: **safe to rename now in a separate narrow implementation group**. The approved neutral current value is `no_additional_effect`. Do not add a handler. Old snapshots may keep the old string and remain equally inert.

## Maintenance and risk comparison

| Boundary | Retention complexity | Test burden | Regression risk | Data/save risk | Reconnect risk | Developer confusion |
|---|---|---|---|---|---|---|
| Legacy schemas/types | Medium | Medium | Low while frozen | High if removed | Medium | Low due explicit naming |
| Effect/action adapters | Medium | Medium | Low | High if removed | High | Low |
| Projection stripping | Low | Low | Low | Low | Medium if removed | Low |
| Archival metadata | Low | Low | Low | Medium if dropped silently | Low | Low with policy |
| Follower/Threat aliases | Medium | Medium | Low | High for pending old state | Medium | Low |
| Final Category F identifier | Low | Low | Low | Low | Low | Medium until renamed |

Retaining v0–v2 import costs moderate code and test surface but has low ongoing behavior risk because the boundary is frozen and inert. A v3 migration has high short-term engineering, save, and reconnect risk with little present player benefit. Dropping support is cheap in code but has the highest player-data impact.

## Decision matrix

| Option | Player save impact | Engineering risk | Maintenance cost | Release complexity | Recommended |
|---|---|---|---|---|---|
| Retain v0–v2 indefinitely | None | Low | Medium indefinitely | Low | No; repository evidence does not justify an unlimited promise |
| Retain until defined cutoff | None through v2; explicit v3 transition later | Low now, controlled at cutoff | Medium through v2 | Low now / Medium at v3 | **Yes** |
| Introduce v3 migration now | Automatic if perfect; corruption risk if incomplete | High | Lower later | High | No current need |
| Drop legacy support | Old saves fail or require manual recovery | Medium code risk, high product risk | Low | High communication/support cost | No |

Recommendations by release stage:

- **Current development branch:** retain v0–v2 import and land only the final neutral identifier rename.
- **First broad playtest release:** keep save version 2 and publish the support policy; old snapshot import remains automatic and invisible.
- **Later stable/public release:** decide whether v3 is justified. If chosen, ship a tested one-way v0–v2 importer before deleting shared compatibility code.

## Recommended final boundary

```text
Canonical current v2 model
  - cannot author or emit Heat mechanics
  - writes no retired gameplay fields or metadata for clean sessions
  - cannot project Heat

Legacy v0/v1/v2 import boundary
  - accepts only declared historic shapes
  - normalizes them before current runtime
  - preserves optional characterHeat as archival metadata only
  - converts retired effects/actions to explicit inert records
  - remains covered through the lifetime of save version 2

Historical documentation and fixtures
  - retained as evidence, not current rules

Future v3 boundary
  - requires an explicit release decision, migration fixtures, reconnect proof,
    and release notes before compatibility removal
```

## Approved implementation groups

### Group 1 — Final dead identifier rename

- Files: `src/game/rules/nemesisRelay.ts`; narrow Nemesis/schema/reconnect tests; C6F reports.
- Change: `heat_on_threat_defeat` → `no_additional_effect` for the current Dying Star definition only.
- Legacy support: no alias or migration required because old values are already accepted as inert strings.
- Save risk: Low.
- Reconnect risk: Low.
- Tests: current definition, old snapshot acceptance, unchanged Nemesis projection/resolution, classification, full verification.
- Recommended commit: `refactor: retire final heat-named nemesis id`.

### Group 2 — Compatibility isolation hardening

No implementation is required now. C6C already established explicit current/legacy types and adapters. Future changes should add an import-boundary test only if a new current module begins importing `LegacyCompatible...` unions outside persistence/normalization.

### Group 3 — New-save emission cleanup

No implementation is approved. Clean new v2 saves already omit retired gameplay state and empty compatibility bags. Nonempty archival metadata remains intentional through v2.

### Group 4 — Version policy documentation

Implemented by this report-only phase through `reports/legacy-save-support-policy.md` and the living audit/roadmap updates.

### Group 5 — Optional v3 migration

Deferred. It requires an explicit future product/release decision. No v3 schema, deletion, or cutoff implementation is approved now.

## Four critique seats

### New player

Current and clean imported sessions expose no Heat. Compatibility is automatic and invisible; current Wound, Scar, escalation, and scenario systems remain the only visible mechanics.

### Optimizer

Archived values have no reader. No-op actions do not increment state, grant rewards, advance objectives, or replay follower notes. Malformed declared fields fail parsing, and normalized historical events do not enter current action APIs.

### Family/casual player

Old supported snapshots require no manual repair or retired bookkeeping. Migration is automatic. Clean new sessions remain free of compatibility metadata.

### Rules lawyer

Supported snapshot inputs are unversioned v0, v1, and v2 through the v2 line. Heat fields/effects/actions are parse-only legacy shapes. Current v2 output is canonical except for an optional archival bag on migrated state. Removal is permitted only at an explicit v3 boundary.

## Verification

Passed on the report-only worktree:

- complete tracked and comparable-corpus Heat searches;
- save schema, serializer, caller, event-history, reconnect, and projection inspection;
- focused v0/v1/v2 parsing, malformed input, migration, no-op, metadata, projection, and Nemesis suite: 9 files / 59 tests;
- `npm.cmd run validate:content`: 17 characters, 71 gear, 109 Threats, 36 Contracts, 20 anomalies, 30 Artifacts, 24 followers, 15 Scars, 16 escalations, 30 afflictions;
- `npm.cmd run typecheck`;
- `npm.cmd run test:engine`: 60 files / 712 tests;
- `npm.cmd run test:integration`: 27 files / 241 tests, including reconnect without retry;
- `npm.cmd run test:client`: 26 files / 273 tests;
- `npm.cmd run test`: 113 files / 1,226 tests;
- `npm.cmd run audit:assets`: 418 / 418 present with zero missing, invalid, placeholder, or release-blocking assets;
- `npm.cmd run build`: 142 modules transformed;
- `git diff --check` and `git diff --cached --check`.

Expected test-fixture missing-art fallback diagnostics appeared in client and aggregate output. The authoritative asset audit passed with no findings.

## Final verdict

**CONDITIONAL PASS** at this report-only checkpoint.

There is no gameplay, projection, parsing, migration, replay, reconnect, or ambiguity failure. Intentional retained compatibility is approved and may coexist with PASS. The sole remaining condition is implementation and verification of Group 1's neutral rename for the final Category F identifier. After that narrow change, a final boundary rerun may assign **PASS** without deleting v0–v2 compatibility.
