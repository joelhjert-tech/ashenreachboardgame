# Save versioning architecture

Status: recommended design pending approval; no code or schema changes are made in Phase 1O.

## Existing architecture and gaps

`sessionSnapshotSchema` contains `sessionId`, `sequence`, and `state`, but no version. There is no migration dispatcher, version-specific parser, upgrade-on-load/save service, unknown-version policy, backup hook, persistence telemetry, disk/database store, or production restoration endpoint. Zod parsing alone is not a migration system. The process starts one in-memory room from `createInitialSessionState`; reconnect attaches to that room.

Therefore Phase 1P should build a reusable snapshot normalization boundary, not claim to migrate a nonexistent file store. A later persistence transport can call the same boundary.

## Alternatives

| Option | Benefit | Cost/risk | Verdict |
|---|---|---|---|
| A. `heat?: number`, no version | minimal edits | absence cannot distinguish current data from malformed legacy data; debt spreads to every consumer | reject |
| B. optional field plus fallback | old values round-trip easily | Heat remains in current runtime/schema indefinitely | reject |
| C. versioned migration | explicit format contract, deterministic upgrade, clean current runtime | new envelope and migration tests required | **preferred** |
| D. dual runtime schemas | clear legacy/current parse types | unnecessary reducer/server union complexity after load | use dual *persisted parsers*, not dual gameplay state |
| E. legacy extension | preserves valid historical nonzero values without gameplay exposure | compatibility metadata requires a support policy | use narrowly within Option C |

## Preferred version model

- Root field: `saveVersion`.
- Type: positive monotonic integer in current saves.
- Missing field: dedicated unversioned legacy **version 0** parser. Do not infer version from arbitrary shape.
- Current first version: **1**.
- Ownership: the session-snapshot envelope, not `Character`, projections, or authored content.
- Dispatcher: `parseAndMigrateSessionSnapshot(input): CurrentSessionSnapshot` validates the envelope/version, parses the matching strict schema, applies ordered pure migrations, then validates the current schema.
- Unknown future version (`> CURRENT_SAVE_VERSION`): reject with a safe, actionable “save created by newer version” error; never best-effort parse.
- Invalid/non-integer/negative version: reject as malformed.
- Missing version: parse only through the strict v0 schema; missing `character.heat` remains invalid.
- Upgrade: on load in memory. Any later save writes v1 only.
- Mutation: migrations return fresh objects and do not mutate the caller’s input.
- Diagnostics: retain source version and migration IDs in server logs/result metadata, not gameplay state.

## Legacy nonzero policy

For v0 input, validate Heat under the historical rule (nonnegative integer). Zero is discarded during normalization. A nonzero value is removed from the current character and copied into an optional envelope-level compatibility record keyed by stable seat/character identity, for example:

```ts
legacyCompatibility?: {
  characterHeat?: Array<{ seatId: string; characterId: string; value: number }>;
};
```

Fresh v1 sessions never create this record. Migrated v0 nonzero values round-trip exactly in the extension, remain unreachable to gameplay, and are not projected. Entries with zero are not retained. This balances user trust and a clean current runtime. Retention lasts for an explicitly approved compatibility window; removal needs a later save-version bump and support-window decision.

## Migration sequence

1. Read unknown input without mutation.
2. Determine version only from the root `saveVersion`; absence selects v0.
3. Strictly parse with v0 or v1 schema.
4. For v0, remove each valid character Heat field and record only nonzero values in the legacy extension.
5. Preserve all other fields structurally, including pending decisions and item instance state.
6. Set `saveVersion: 1`.
7. Parse the result with the current schema.
8. Create/restore the room only from normalized current state.

Migration is deterministic and idempotent: v1 input is validated but not migrated; v0 always yields the same v1 representation.

## Error handling and security

String, negative, fractional, NaN/infinite, array, or object Heat values are rejected by the v0 schema. Current code accepts nonnegative integers without an authored maximum; Phase 1P should preserve that compatibility rule rather than silently invent a cap, while rejecting unsafe/non-finite values through schema validation. Missing Heat in v0 is rejected. Heat in a v1 current character is rejected by a strict current schema; only the explicit extension may carry legacy values. Unknown versions fail closed. Client-crafted snapshots must never be accepted through ordinary phone intents.

## Rollback and downgrade

V1 saves will not load under old code because old characters require Heat and the envelope is new. This is an intentional one-way format upgrade. Before any future production persistence writes a migrated snapshot, its transport should retain the original opaque payload or create an atomic backup. The present repository has no persistence transport, so Phase 1P can only provide the pure migration boundary and test fixtures; it cannot promise backups. Rollback means deploy old code with the untouched v0 source, not reverse-convert v1.

## Test strategy

Use named v0 fixtures for zero, nonzero, missing, invalid type, invalid version, and unversioned inputs. Verify pure/idempotent migration, preservation of all non-Heat state, pending interaction state, resources, exact nonzero extension data, strict v1 rejection of character Heat, v1 serialization omission, and unknown-version failure. A production restoration adapter should be added only when a real persistence transport exists.
