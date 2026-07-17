# Phase 1O decision specification

Status: implementation-ready recommendations for Phase 1P; every decision below is **pending user approval**.

## Preferred architecture

Introduce a versioned `SessionSnapshot` envelope and normalize legacy persisted state before gameplay. Missing `saveVersion` means v0 and is parsed with the current required-Heat legacy schema. V1 uses strict Heat-free runtime/persisted characters. Valid v0 nonzero Heat moves to optional envelope-level legacy metadata; zero is dropped. Fresh v1 sessions write neither character Heat nor legacy metadata.

## Exact Phase 1P changes

1. Preserve a `legacyCharacterSchemaV0` and legacy player/game/snapshot schemas with required nonnegative integer Heat.
2. Define strict current runtime/persisted character schema without Heat.
3. Add `saveVersion: 1` to the current snapshot envelope and optional validated `legacyCompatibility.characterHeat` metadata.
4. Add a pure `migrateSessionSnapshotV0ToV1` plus `parseAndMigrateSessionSnapshot` dispatcher.
5. Treat missing version as v0; reject malformed versions and versions greater than 1.
6. Remove the four compatibility-constructor call sites from genuinely new character creation, then delete the helper.
7. Update the static boundary guard to reject any runtime character Heat construction, read, or write outside the legacy migration module.
8. Keep the two constant-zero phone/TV projection keys and client types unchanged.
9. Do not add a persistence transport. Expose/test the normalization boundary for a future restoration owner.

## Authoritative sequences

**New session:** create Heat-free runtime character → run normally → serialize v1 Heat-free snapshot.

**Legacy restoration:** detect missing version → strict v0 parse → pure migration → validate v1 → create room from normalized state. Migration never invokes setup, replacement, effects, rewards, or reactions.

**Reconnect:** validate token → attach to existing normalized in-memory room → send projection. No schema migration.

**V1 restoration:** validate v1 directly; never run v0 migration.

## Legacy value and missing-field rules

- v0 `heat: 0`: valid input, omitted from runtime/output metadata.
- v0 `heat: N` where N is a valid nonzero historical integer: valid input, preserved exactly in non-gameplay extension.
- v0 missing Heat: invalid.
- v1 missing Heat: required canonical form.
- v1 character containing Heat: invalid, not stripped.
- unknown future version: safe rejection with newer-version guidance.

## Invariants

Migration preserves session ID, sequence, seats, characters, resources, current space, Wounds, Scars, Salvage, contracts, equipment instances/states, scenario state, rivalry-private data, pending encounter decisions/reactions, and continuation positions. It cannot reopen or resolve pending work, reconstruct characters, emit effects, or change sequence.

## Projection decision

Defer projection-key retirement. Save v1 and network payloads are separate contracts. Add tests proving both compatibility keys remain constant zero and do not read migrated metadata. A later network-version decision may remove them.

## Validation and security

Use strict version-specific schemas. Client intents cannot submit snapshots or migration metadata. Reject malformed Heat values, duplicate extension identities, malformed pending state, invalid/missing v1 version, and unknown versions. Migration must not mutate input and must be deterministic/idempotent.

## Required tests

- Legacy parser: unversioned zero/nonzero/maximum-currently-valid; missing Heat; string, negative, fractional, non-finite; invalid version.
- Migration: deterministic, idempotent, input immutable, all non-Heat state preserved, nonzero metadata exact, zero omitted, pending decisions intact.
- Current schema: Heat-free character passes; character Heat rejects; v1 emitted; new serialization omits Heat.
- Round trips: v0 zero → v1; v0 nonzero → v1 metadata → v1; v1 → v1.
- Construction: initial single/co-op/rivalry and replacement characters contain no Heat; old migration never invokes setup.
- Reconnect: existing room behavior and projections unchanged; no migration replay.
- Boundary: no gameplay Heat reads/writes/construction; no constructor call sites; authored omission remains guarded.
- Non-target: Heat-only content, Rust Choir Peddlers, Mirror threshold, payments, Salvage loss, Wounds, Scars, contracts, equipment, and rivalry privacy unchanged.

## Proposed commit boundaries

1. `feat: add versioned session snapshot migration` — version schemas, pure dispatcher, migration tests.
2. `phase-1p-retire-runtime-character-heat` — current runtime type, constructor retirement, creation paths, boundary tests.
3. `test: verify heat-free snapshot compatibility` — restoration/reconnect/projection/non-target coverage and report. Combine only if repository coupling makes intermediate commits uncompilable.

## Rollback

The conversion is one-way for v1. Preserve the original v0 payload at any future storage transport before rewrite. With no current production storage transport, rollback testing is fixture-based. Do not synthesize Heat to downgrade v1; use the retained v0 source.

## Entry criteria

- User approves v1 envelope, missing-version-as-v0, strict current schema, nonzero legacy extension, and separate projection retirement.
- Exact restoration ownership is named if a real persistence transport is added.
- Support window for v0 reading is recorded, even if initially open-ended behind a later approval gate.

## Exit criteria

- Current runtime and new snapshots contain no character Heat.
- V0 zero and nonzero fixtures load; malformed v0 does not.
- Nonzero values round-trip only in inaccessible legacy metadata.
- Reconnect and pending interactions remain unchanged.
- Constructor has zero call sites and is deleted.
- Projections remain stable.
- Full verification is green and compatibility counts are reported.

## Four-seat critique

- **New Player:** no visible behavior changes; old rooms reconnect through their existing in-memory path; migrated progress and pending decisions are preserved; Heat/Risk do not reappear.
- **Optimizer:** handcrafted Heat cannot become mechanical because migration removes it before runtime; version-specific validation prevents omission bypass; repeated migration cannot duplicate resources or rewards.
- **Family Player:** migration is automatic at restoration with no prompt; a backup responsibility belongs to any future storage transport; active family games require a controlled restart/restoration plan rather than hot mutation.
- **Rules Lawyer:** missing equals inactive zero only after version-aware validation; unversioned state is v0; valid nonzero values live only in legacy metadata; migration is pure/idempotent; v1 is not downgrade-compatible; projections have a separate contract and support gate.

## Estimated impact and blockers

Likely implementation impact: character/session schema modules, a new migration module, four creation call sites across session/server/reducer, compatibility boundary tests, snapshot/reconnect tests, and the Phase 1P report. Client and projection implementation files remain out of scope. The sole design blocker is approval of the nonzero extension/support-window policy; the absence of a production persistence transport is not a blocker to building and testing the normalization API, but it limits backup/telemetry claims.
