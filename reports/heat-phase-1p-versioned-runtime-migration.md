# Phase 1P — Versioned Snapshot Migration and Heat-Free Runtime Characters

Status: implemented and verified.

## Outcome

Phase 1P separates historical snapshot compatibility from current gameplay state. Current runtime characters and v1 snapshots contain no `heat` field. Unversioned snapshots are strict v0 inputs whose characters must contain a valid nonnegative integer `heat`. The pure snapshot boundary validates v0, migrates it to v1, drops zero, and archives valid nonzero values in root envelope metadata that is unavailable to reducers, actions, and projections.

The repository still has no production disk, database, cloud, or browser full-session persistence caller. This phase adds schemas and pure restoration/serialization utilities only; it does not invent a persistence backend.

## Schema architecture

- `legacyCharacterSchemaV0`: strict old persisted character shape; requires nonnegative integer Heat.
- `characterSchema`: strict current runtime character shape; Heat is absent and rejected.
- `legacySessionSnapshotSchemaV0`: strict unversioned v0 snapshot.
- `sessionSnapshotSchema`: strict v1 envelope requiring `saveVersion: 1` and Heat-free current state.
- `legacyCompatibility.characterHeat`: optional nonempty array of positive historical records keyed by stable `seatId` and original `characterId`. Duplicate identities, zero values, malformed values, and missing seat owners reject. A later replacement character does not rewrite the historical character ID.

Authored character definitions remain governed by their separate strict Heat-free schema from Phase 1N.

## Version dispatch and migration

`parseAndMigrateSessionSnapshot` is the sole exported dispatch boundary:

1. Missing `saveVersion` deterministically selects strict v0 parsing.
2. Literal `saveVersion: 1` selects strict v1 parsing.
3. Negative, fractional, string, null, and unknown future versions fail closed with the actual and supported versions.
4. A v1-shaped unversioned object does not shape-infer as v1; it fails strict v0 validation when legacy Heat is absent.

`migrateSessionSnapshotV0ToV1` clones and validates its input, removes Heat from each current character, creates no metadata for zero, creates one exact archival record for each nonzero value, validates the resulting v1 envelope, and returns it. It does not call setup, replacement, reducers, encounters, or projections. It preserves player order and all non-Heat session state, including pending encounter/displacement state, resolved IDs, battle/shop state, rivalry-private state, contracts, and exact item instances.

The operation is deterministic, does not mutate its source, and is idempotent through the dispatcher: an already-valid v1 snapshot validates and normalizes without re-migration or duplicate metadata.

## Historical-value policy

- v0 `heat: 0`: valid; omitted from the v1 character and metadata.
- v0 valid nonzero Heat: removed from gameplay and preserved exactly in the envelope record.
- v0 missing Heat: invalid.
- v1 character without Heat: canonical.
- v1 character with zero or nonzero Heat: invalid.
- v1 metadata with zero, duplicates, or a seat owner absent from the snapshot: invalid. Its archived character ID is not compared with a later replacement character.

The archival support window is open-ended. Metadata is never converted, projected, spent, compared, transferred on replacement, or removed automatically. Closing that window requires a separate approval and implementation phase.

## Runtime Heat removal and construction

The Phase 1M compatibility constructor and all four call sites are removed. Initial state, lobby selection, fresh setup, and recalled-character replacement now construct the same current Heat-free shape. No direct runtime `heat: 0` assignment replaces the helper. Runtime reducers and immutable copies no longer carry or preserve Heat.

The boundary test scans production game/server sources and rejects character Heat property access. The only current production character Heat handling is destructuring the already-validated v0 character inside the migration utility. The v0 schema is the only character-level Heat declaration.

## Snapshot serialization

`serializeSessionSnapshotV1` emits `saveVersion: 1`, a Heat-free cloned current state, and optional already-validated archival metadata supplied by the migration envelope owner. It never derives Heat from gameplay state. Empty and zero-valued compatibility structures cannot pass the strict v1 schema.

No production full-state writer or reader is wired in this phase. A future persistence owner must preserve the original v0 source before destructive replacement and invoke the parser before constructing a room server.

## Reconnection and projection separation

Reconnection remains attachment to an existing authoritative in-memory room. It does not import or call migration utilities, reconstruct characters, or alter pending decisions. Existing seat authentication and replay protection remain authoritative.

The two existing server projection compatibility keys remain hardcoded zero and unchanged. They do not read runtime state or archival metadata. No network protocol version, client UI change, visible Heat/Risk label, or metadata projection was introduced. Projection-key retirement remains a separate network-contract decision.

## Security and rollback

- Current actions have no snapshot or archival-metadata input.
- Strict v1 parsing rejects reintroduced character Heat and unknown versions.
- Strict v0 parsing rejects missing, negative, fractional, non-finite, and mistyped Heat.
- Metadata rejects zero, duplicate identity, missing identity, bad owner, and unknown strict fields.
- Migration cannot reopen resolved work because it copies state without executing actions.
- V1 is not guaranteed to load under Phase 1N code; no automatic downgrade is attempted.
- The pure migration leaves the source object unchanged for diagnostics. No automatic backup is claimed because no production persistence backend exists.

## Tests

Focused coverage proves:

- strict v0 zero/nonzero parsing and missing/malformed rejection;
- strict v1 Heat rejection, metadata validation, and future-version rejection;
- zero omission and exact nonzero archival preservation;
- multiple/mixed character handling and stable identities;
- non-Heat state and pending-decision preservation;
- source immutability, determinism, idempotency, and serialize/parse round trips;
- Heat-free single-player, cooperative, rivalry, and replacement construction;
- no compatibility constructor definition, import, call site, or direct runtime assignment;
- exactly two hardcoded projection compatibility keys;
- reconnect, payment, forced-displacement, shop, content, and authored-schema regressions remain green.

## Compatibility counts

| Measure | Before | After |
| --- | ---: | ---: |
| Current runtime Heat declarations | 1 | 0 |
| Required current runtime Heat fields | 1 | 0 |
| Legacy v0 Heat declarations | 0 | 1 |
| Root save-version fields | 0 | 1 |
| Version dispatchers | 0 | 1 |
| V0-to-v1 migration functions | 0 | 1 |
| Compatibility constructor definitions | 1 | 0 |
| Compatibility constructor call sites | 4 | 0 |
| Direct current-runtime Heat assignments | 0 | 0 |
| Projection compatibility Heat keys | 2 | 2 |
| Active gameplay Heat reads | 0 | 0 |
| Active gameplay Heat writes | 0 | 0 |
| Authored Heat fields | 0 | 0 |
| Heat-effect approvals | 40 | 40 |
| Other compatibility approvals | 14 | 14 |
| Combined compatibility approval IDs | 54 | 54 |
| Heat-only IDs | 29 | 29 |
| Heat-only branches | 32 | 32 |
| Heat-effect occurrences | 41 | 41 |
| Production full-state persistence callers | 0 | 0 |

## Four-seat critique

- **New Player:** no visible behavior changes; current rooms reconnect normally; selection and replacement remain identical; Heat and Risk remain invisible.
- **Optimizer:** v1 character Heat rejects, v0 omission cannot bypass strict validation, archival values are inaccessible to mechanics, and repeated migration cannot duplicate resources or pending outcomes.
- **Family Player:** no prompt, manual upgrade, meter, or bookkeeping appears. Living-room reconnect remains the existing in-memory path.
- **Rules Lawyer:** missing version means v0; missing Heat is invalid only in v0 and canonical in v1; zero converges to omission only after validation; nonzero survives only as archival metadata; migration and reconnect are separate contracts.

## Files and ownership

- Character/session schema modules: strict v0/v1 ownership and metadata validation.
- New persistence utility and focused tests: dispatch, migration, serialization, and round trips.
- Session/server/reducer construction: constructor retirement and Heat-free current state.
- Existing fixtures/tests: current runtime objects and assertions updated to the v1 model.
- Phase 1O architecture reports: included as approved design evidence.
- Decision register: implementation status updated narrowly.

No authored character JSON, content mechanic, projection implementation, client UI, Mirror behavior, Heat-only outcome, generic Heat discriminator, asset, or production persistence backend changed.

## Remaining work

Projection-key retirement and a network-protocol decision remain separate. Historical metadata support-window closure, legacy v0 parser retirement, Mirror-key migration, remaining Heat-only outcomes, Rust Choir Peddlers, and stable discriminator cleanup also remain unimplemented.
