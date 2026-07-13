# Phase 1T — Mirror reflection-pressure threshold migration

## Outcome

Phase 1T replaces the misleading current-runtime `heatThreshold` name with `reflectionPressureThreshold` and advances the strict session-snapshot contract to `saveVersion: 2`. The change is semantic only: Mirror confrontation values, comparison, timing, outcomes, pressure tracks, resources, reconnect behavior, and projections are unchanged.

## Runtime ownership

- `GameState` is strict and requires `reflectionPressureThreshold: integer >= 1`.
- `createInitialSessionState` writes 8 in single-player and 6 in multiplayer, preserving the existing mode branch.
- `getReflectionPressureThreshold` is the only semantic accessor and reads only the canonical field.
- Mirror reads the accessor only during `SCENARIO_CONFRONTATION_REQUESTED`.
- Current runtime contains no old-key alias, optional field, fallback, dual read, or dual write.
- Scenario content remains unchanged because no scenario definition authored the old field.

## Mirror behavior preserved

Only `scenario_mirror_of_false_heroes` consumes the cutoff. It compares the authoritative current Mirror Reflection Pressure with the threshold using `>=`. Equality and higher values end that confrontation attempt without awarding a Mirror Break. Below-threshold requests continue through the existing gate and confrontation plan. The threshold is not mutated or reset.

The rename does not change Loss Pressure, Global Escalation, Win Progress, character identity or resources, Wounds, Scars, Salvage, rewards, or the public `pressureTrack.max: 8` value.

## Snapshot architecture

| Format | Version marker | Character Heat | Threshold key | Status |
|---|---|---|---|---|
| v0 | absent | required legacy field | `heatThreshold` | strict compatibility input |
| v1 | literal 1 | absent; archival metadata allowed | `heatThreshold` | strict compatibility input |
| v2 | literal 2 | absent; archival metadata allowed | `reflectionPressureThreshold` | strict current format |

Every state schema is strict. v0/v1 reject the canonical key, v2 rejects the old key, every version rejects both keys and its required key being absent, and the shared constraint remains integer >= 1 with no maximum.

## Migration chain

The existing `migrateSessionSnapshotV0ToV1` remains responsible only for Phase 1P character-Heat handling: it validates v0, removes character Heat, archives valid nonzero values, omits zero metadata, and emits v1 while retaining `heatThreshold`.

`migrateSessionSnapshotV1ToV2` then validates strict v1, clones the state, removes `heatThreshold`, writes the exact value to `reflectionPressureThreshold`, sets version 2, preserves every other state member and archival metadata, validates strict v2, and returns without mutating the source.

Dispatcher behavior is deterministic: missing version runs v0 -> v1 -> v2; version 1 runs v1 -> v2; version 2 validates and clones directly; malformed and unknown versions fail closed. Repeated current-version parsing is idempotent.

## Serialization, reconnect, and projections

`serializeSessionSnapshotV2` emits literal version 2, the canonical threshold, no old threshold, no character Heat, and supplied archival metadata unchanged. The repository still has zero production full-session persistence callers; these remain pure future restoration and serialization boundaries.

Reconnect continues to attach to an existing in-memory room. It does not call migration, reconstruct the scenario, reset the threshold, or disturb pending/resolved decisions. Focused reconnect coverage proves the canonical value remains stable.

Phone and TV projection code is unchanged. Neither threshold key is transmitted, Phase 1R's projection threshold/Heat-key count stays zero, and archival metadata remains inaccessible.

## Validation and boundary guard

Current content validation no longer classifies `heatThreshold` as a named compatibility construct; it is rejected as an unapproved Heat-shaped field. Compatibility approval manifests remain 40 Heat-effect IDs plus 14 other IDs, 54 unique IDs total.

The focused source guard reports file and line for any old-key token outside `session.schema.ts` and `sessionSnapshot.ts`. Current runtime construction and gameplay therefore cannot regain the old name, while strict v0/v1 parsing and the exact migration extraction remain explicitly isolated.

## Tests

- Strict v0: legacy Heat plus old threshold acceptance; missing/malformed Heat and missing/malformed/new/both threshold rejection.
- Strict v1: old threshold acceptance; canonical, missing, malformed, and both-key rejection; archival metadata acceptance.
- Strict v2: canonical threshold acceptance; old, missing, malformed, direct character Heat, and both-key rejection.
- Dispatch/migration: v0 full chain, v1 exact rename, v2 idempotency, unknown versions, input immutability, deterministic output, zero/nonzero archival behavior.
- Runtime: 8 solo; 6 cooperative/rivalry; semantic accessor; no old runtime name.
- Mirror: below-threshold existing path; equality and above-threshold cutoff; no Mirror Break; threshold, Loss Pressure, and Global Escalation unchanged.
- Reconnect/projection: canonical threshold survives reconnect; no migration coupling; neither key enters phone/TV patches.
- Snapshot-dependent forced-displacement and encounter-payment fixtures now assert the current v2 contract.

Focused verification passed 94/94 tests. The complete suite passed 865/865 across 81 files. The first broad run exposed three stale test-only `saveVersion: 1` current-snapshot literals; updating those fixtures to the approved v2 contract resolved all three without mechanics changes.

## Pre/post counts

| Measure | Before | After |
|---|---:|---:|
| Current runtime old-field declarations / reads / initialization writes | 1 / 1 / 1 | 0 / 0 / 0 |
| Canonical current declarations / reads / initialization writes | 0 / 0 / 0 | 1 / 1 / 1 |
| Strict snapshot contracts containing old key | 2 | 2 |
| Strict snapshot contracts containing canonical key | 0 | 1 |
| Recognized snapshot versions | 2 (v0/v1) | 3 (v0/v1/v2) |
| Migration functions | 1 | 2 |
| Projection threshold keys | 0 | 0 |
| Active character-Heat reads / writes | 0 / 0 | 0 / 0 |
| Heat-only IDs / branches / effects | 29 / 32 / 41 | 29 / 32 / 41 |
| Compatibility approval IDs | 54 | 54 |
| Production full-session persistence callers | 0 | 0 |

## Four-seat critique

- **New Player:** Mirror behaves identically; Reflection Pressure remains the visible term; Heat and Risk remain absent; active rooms reconnect normally.
- **Optimizer:** strict version ownership rejects both-key manipulation, old-key injection into v2, and malformed values; repeated migration cannot change the value or duplicate rewards; archival Heat cannot influence the accessor.
- **Family Player:** migration is invisible and requires no prompt or manual work; current sessions remain in-memory and reconnect normally; difficulty is unchanged.
- **Rules Lawyer:** v0/v1 own the old key, v2/current runtime own the canonical key, equality remains `>=`, values copy exactly, reconnect is not restoration, and old-key removal awaits explicit v0/v1 support closure.

## Files changed

- `src/game/schema/session.schema.ts`: strict canonical current state, frozen v1 state, and strict snapshot v2.
- `src/game/persistence/sessionSnapshot.ts`: version 2, pure v1-to-v2 migration, chained dispatcher, and v2 serializer.
- `src/game/rules/reflectionPressure.ts`: canonical semantic accessor.
- `src/game/rules/soloTuning.ts`: semantic mode-tuning constant/function names.
- `src/game/rules/legacyHeatCompatibility.ts`: removes unrelated Mirror accessor.
- `src/server/sessionState.ts`: canonical initialization write.
- `src/server/roomServer.ts`: canonical accessor use.
- `scripts/legacy-heat-validation.ts` and its test: retire old threshold as a named authoring construct.
- Eleven engine/server/persistence test files: canonical runtime fixtures, versioned snapshot coverage, semantics, reconnect, and boundary protection.
- Phase 1S's three architecture reports plus `reports/heat-retirement-decision-register.md`: design evidence and implementation status.
- This report: implementation evidence and verification.

No authored content, projection, client, asset, rulebook, or quick-reference file changed.

## Remaining work

- Explicit legacy v0 parser support-window closure and retirement.
- Explicit legacy v1 parser support-window closure and retirement.
- Historical character-Heat metadata support-window closure.
- Remaining Heat-only outcome migrations.
- Rust Choir Peddlers approval and implementation.
- Stable generic Heat discriminator cleanup.

The non-failing missing-map-art fallback diagnostics for `outer_anchor_market` and `ashwake-crossing` remain visible in tests and were not modified. Asset audit remains 404/404.
