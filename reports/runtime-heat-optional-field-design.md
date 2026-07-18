# Runtime Heat optional-field design

Status: preferred design pending approval.

## Decision

Do **not** make every gameplay consumer handle `heat?: number`. Instead, make Heat optional only at the legacy input boundary and normalize into a current runtime character shape with no Heat property. This avoids turning temporary compatibility into a permanent optional gameplay field.

## Three-state semantics

| Input state | Legacy v0 meaning | Future v1 meaning | Normalized result |
|---|---|---|---|
| present, zero | required inert compatibility value | invalid on current character | omit; no metadata |
| present, nonzero | valid historical inert value | invalid on current character | omit from runtime; preserve exactly in legacy extension |
| absent | malformed v0 character | canonical v1 character | accepted only under the schema selected by version |

Omission and zero are gameplay-equivalent after successful migration, but not parser-equivalent. Version determines whether omission is valid.

## Type strategy

- `AuthoredCharacter`: remains Heat-free (Phase 1N).
- `LegacyPersistedCharacterV0`: current historical character shape with required nonnegative integer Heat.
- `CurrentRuntimeCharacter`: all authoritative gameplay fields except Heat.
- `CurrentPersistedCharacterV1`: same Heat-free character shape as normalized runtime.
- Phone/TV projection types: remain unchanged in the first implementation phase and continue receiving constant-zero compatibility keys.
- Legacy compatibility metadata: envelope-only and unavailable to reducers/resolvers.

This costs a deliberate schema/type split but prevents optional Heat checks from spreading through reducers and server code.

## New saves and sessions

New runtime characters receive no Heat property. New v1 snapshots serialize `saveVersion: 1`, Heat-free characters, and no legacy extension. Replacement characters also remain Heat-free. The Phase 1M helper must not return an empty object indefinitely: Phase 1P should remove its four current call sites, update the boundary guard to forbid runtime Heat construction, and then delete the helper when no compatibility caller remains.

## Old saves

Unversioned v0 input is parsed by the dedicated legacy schema. Zero disappears. Nonzero is preserved exactly in the v1 legacy extension but never copied into runtime characters. Missing legacy Heat is rejected rather than treated as zero. No value becomes Wounds, Scars, Salvage, pressure, escalation, equipment, or another resource.

## Reconnection and active rooms

Reconnect remains an in-memory seat-auth flow and does not migrate. A deployment that keeps the same server process may retain pre-upgrade in-memory objects; the safe operational boundary is process restart plus snapshot restoration, if restoration is later supported. Phase 1P should normalize only at room creation/restoration, never at action, reconnect, projection, or replacement boundaries. Pending decisions, battle reactions, shops, contracts, charged items, and continuation positions pass through unchanged.

## Projection separation

The two constant-zero network keys are not stored-value reads. Keep them in Phase 1P to avoid combining save-format and network-contract changes. Retire them in a separately approved network-version phase after confirming all phone/TV client consumers and deployment coupling. The save version must not be reused as a network protocol version.

## Constructor lifecycle

1. Phase 1M/1N: helper supplies `{ heat: 0 }` to four new-state paths.
2. Phase 1P: current runtime schema becomes Heat-free; remove four spreads/calls.
3. Replace the Phase 1M guard with a prohibition on runtime character Heat construction/read/write.
4. Legacy v0 parser/migrator owns historical Heat.
5. Delete `createLegacyCharacterCompatibilityState` after zero call sites remain.
6. Retire projection keys separately.

## Malformed state

The v0 parser accepts only the historical valid domain. V1 character objects containing Heat fail strict validation instead of silently stripping it. Corrupt pending state fails the relevant snapshot schema; migration must not repair unrelated state. Duplicate legacy records are impossible when produced from player identity, and v1 input with duplicate extension identities must be rejected.

## Support window

Support unversioned/v0 input and v1 legacy nonzero metadata until an explicit release/support gate approves v2 removal. The gate should require evidence that no supported persisted rooms remain, migration telemetry if persistence ships, and a documented downgrade policy. No date is invented in Phase 1O.
