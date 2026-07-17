# Mirror threshold migration architecture

Status: Phase 1S recommendation, pending approval. This document changes no code or contract.

## Preferred decision

Rename the current runtime and persisted field to `reflectionPressureThreshold`, introduce strict snapshot `saveVersion: 2`, and migrate strict v1 snapshots to v2 through a pure `v1 -> v2` step. Preserve the Phase 1P `v0 -> v1` migration unchanged and dispatch unversioned snapshots through `v0 -> v1 -> v2`.

The field is Mirror-only in gameplay. `reflectionPressureThreshold` best names the measured value without suggesting character Heat, Loss Pressure, or Global Escalation. `mirrorReflectionThreshold` is less precise about the measured track; `scenarioPressureThreshold` incorrectly suggests generic ownership; `mirrorReflectionPressureThreshold` is accurate but unnecessarily verbose because Reflection Pressure is already unique to Mirror.

## Ownership model

Primary classification: **Mirror-specific threshold stored in scenario runtime/session state**. It is not authored scenario-definition configuration today, not generic across scenarios, and not merely dead compatibility state. The current global placement is broader than its actual consumer, but Phase 1T should perform the semantic rename without redesigning GameState ownership.

The numerical source remains mode tuning: 8 in single-player, 6 otherwise. Scenario content does not gain a new authored threshold field in Phase 1T. Moving the value into the scenario definition would silently change override/initialization ownership and create a larger design migration.

## Alternatives considered

| Option | Assessment | Decision |
|---|---|---|
| Change v1 in place | Previously valid v1 snapshots would fail; violates the literal-version contract even with no production persistence caller | Reject |
| Add v2 | Honest schema evolution, deterministic migration, clean current runtime | **Select** |
| Accept both keys in v1 | Conflict ambiguity and indefinite dual-read debt | Reject |
| Runtime rename only | Leaves misleading terminology in current persisted output forever | Reject |

The absence of a production full-state persistence backend lowers deployment risk but does not make the exported/documented v1 contract disposable. Tests and future callers already have a public utility contract. A monotonic v2 is the smallest honest change.

## Proposed schema family

- `legacySessionSnapshotSchemaV0`: unchanged unversioned shape; legacy characters require character Heat; GameState uses `heatThreshold`.
- `sessionSnapshotSchemaV1`: frozen strict Phase 1P shape; literal `saveVersion: 1`; state requires `heatThreshold` and current Heat-free characters.
- Current `gameStateSchema`: strict current runtime shape requiring `reflectionPressureThreshold` and rejecting `heatThreshold`.
- `sessionSnapshotSchemaV2`: strict current shape; literal `saveVersion: 2`; state requires `reflectionPressureThreshold`; optional archival character-Heat metadata unchanged.

Because current v0 currently extends current `gameStateSchema`, Phase 1T must stop sharing the renamed current state schema for the old threshold portion. A frozen legacy state schema must retain the old key without broad assertions or dual-key optionals.

## Migration chain

### v0 to v1

Keep Phase 1P logic semantically unchanged: validate strict v0, remove legacy character Heat, archive valid nonzero values, omit zero metadata, preserve `heatThreshold`, set version 1, validate strict v1.

### v1 to v2

`migrateSessionSnapshotV1ToV2(input)` should:

1. Clone and validate input with strict v1.
2. Destructure `heatThreshold` from `state`.
3. create new state with `reflectionPressureThreshold: heatThreshold` and every other member preserved.
4. Set `saveVersion: 2`.
5. Preserve `legacyCompatibility` exactly when present.
6. Validate strict v2.
7. Return without mutating input.

The dispatcher treats a missing version as v0 and chains `v0 -> v1 -> v2`; literal 1 uses only `v1 -> v2`; literal 2 validates/clones as current; every other version fails closed. Current serialization writes only v2.

## Conflict and malformed-state policy

- v0/v1 require exactly the old key and reject the new key under strict schemas.
- v2 requires exactly the new key and rejects the old key.
- A snapshot containing both keys is rejected; no precedence rule is allowed.
- Missing required key is rejected in every version.
- The existing constraint is preserved exactly: integer >= 1, with no newly invented maximum.
- Zero, negative, fractional, string, null, array, object, and absent values reject.
- An unknown future version rejects through `UnsupportedSnapshotVersionError`; it is never shape-inferred.

## Runtime and content changes

Current runtime ends with only `reflectionPressureThreshold`. Rename the `GameState` schema field, construction property, mode tuning constant/function, compatibility accessor (or remove the trivial accessor and read the semantic field directly), Mirror server access, fixtures, assertions, and boundary scans.

Scenario content does not author the field and therefore needs no content-data migration. The Mirror scenario ID, `pressureTrack.max`, track labels, plan, thresholds, and generated outputs remain unchanged. Validation should retire `heatThreshold` as an allowed current authored construct and continue rejecting it generally; strict v0/v1 snapshot compatibility is not content authoring permission.

## Reconnection and projections

Migration runs only at the snapshot parse boundary before any future room construction. It never runs on reconnect, join, reducer actions, or scenario confrontation. Active current rooms already use the canonical runtime field and reconnect without reconstruction or reset.

No network protocol version is required. Neither the old threshold nor proposed field is projected. Phone/TV continue receiving the derived Mirror Pressure view, with no Heat-shaped network key and no access to archival metadata.

## Behavioral invariants

- Defaults remain 8 solo and 6 otherwise.
- `>=` remains the comparison.
- At/above threshold blocks each Mirror confrontation attempt and awards no Mirror Break.
- Below threshold follows existing gate/plan behavior.
- The threshold remains immutable after session construction.
- Mirror Pressure mutation, Scar fallbacks, track max 8, confrontation difficulty, pending decisions, and scenario progression are not recalculated.
- Loss Pressure, Global Escalation, character Heat archive, Wounds, Scars, Salvage, contracts, artifacts, and Rivalry state are byte-equivalent through migration except for the key/version rename.

## Rollback strategy

Recommend one coordinated implementation commit because schemas, runtime typing, constructor, dispatcher, serializer, and tests are compile-coupled. Before landing, retain the pre-change v1 fixture corpus and prove `v1 -> v2` migration. Rollback means reverting the coordinated commit and using original v1 snapshots; v2 snapshots are not guaranteed to load in Phase 1R code. No automatic downgrade should be written. Future production persistence must retain original source snapshots before destructive replacement; the repository still has no production full-state persistence backend.

## Compatibility support and old-key retirement

After Phase 1T, `heatThreshold` remains permitted only in strict v0/v1 compatibility schemas, the v1 migration function, and focused legacy fixtures. It is fully removable only after an explicit phase closes both the unversioned/v0 and v1 snapshot support windows. That decision is separate from archival character-Heat metadata retention.

## Four-seat critique

- **New Player:** no visible behavior or terminology changes; Mirror Pressure, joining, and reconnect remain the same, and Heat/Risk do not return.
- **Optimizer:** strict versions and both-key rejection prevent threshold selection attacks; migration cannot turn archival Heat into a resource or duplicate progress.
- **Family Player:** migration is invisible and requires no prompt or manual action; active in-memory rooms reconnect normally and Mirror difficulty remains identical.
- **Rules Lawyer:** each version has one authoritative key, equality remains triggering, values copy exactly, snapshot restoration stays separate from reconnect, and old-key retirement requires explicit compatibility closure.
