# Heat projection contract inventory

Status: Phase 1Q report-only audit. All retirement recommendations remain pending approval.

## Baseline

The Phase 1P baseline reconciles. Current runtime and v1 snapshot characters contain no Heat; strict v0 has one required legacy Heat declaration; two network projection properties are manufactured as literal zero; gameplay reads/writes are 0/0; save version fields and migration dispatchers are 1/1; Heat-only content remains 29 IDs / 32 branches / 41 effects; the compatibility approval union remains 54 IDs.

## Exact emitted-key inventory

| Projection ID | Key | Producer | Payload/type | Recipient | Value source | Production consumer | Visible UI | Join/reconnect path | Removal risk |
|---|---|---|---|---|---|---|---|---|---|
| HP-01 | `players[].character.heat` | `createTvProjection`, `src/server/roomServer.ts` | `PublicPlayerCharacter.heat` inside `PublicPatchPayload` | TV, every phone, host phone | literal `0` | none | none | TV initial socket and broadcasts; phone snapshot/rejoin and broadcasts | low |
| HP-02 | `shopEncounter.activePlayer.heat` | `createPublicShopEncounterState`, `src/server/roomServer.ts` | `PublicShopEncounterState.activePlayer.heat` | TV, every phone, host phone when shop state exists | literal `0` | none | none | same full-state envelope paths when shop projection is present | low |

The two properties are separate nested fields but share one public payload contract. Phone projections embed the public projection rather than authoring a private Heat value. `sanitizePlayerForPhone` already sends a Heat-free `self.character`; `PrivateCharacter.heat` is therefore a stale type-only requirement, not a third emitted key.

## Producer and source findings

- Producers: **2 functions**, both in `src/server/roomServer.ts`.
- Literal emitted assignments: **2**.
- Runtime-character Heat reads: **0**.
- archival `legacyCompatibility.characterHeat` reads: **0**.
- Snapshot occurrences: **0** in v1 characters; neither property is part of the snapshot envelope.
- Log-specific writes: **0**. Debug socket logging captures the entire received envelope and can therefore display the inert fields as generic JSON, but has no Heat selector.
- Public/private effect: both keys are public. They contain only zero and reveal no private inventory or historical metadata.

## Consumer census

| Classification | Count | Evidence |
|---|---:|---|
| Active production consumers of HP-01/HP-02 | 0 | no property read, destructure, selector, comparison, arithmetic, formatter, label, or conditional |
| Inert production consumers | 0 | payloads are stored whole, not copied field-by-field |
| Direct type-only consumers | 2 | `PublicPlayerCharacter.heat`; `PublicShopEncounterState.activePlayer.heat` |
| Test-only behavioral consumers | 0 | tests do not assert or calculate from either field |
| Unable to verify | 0 | all repository production paths are traceable |

Related but not emitted-contract consumers:

- `PrivateCharacter.heat` is a stale required shared type although private projection output is Heat-free.
- `CharacterCatalogEntry = Omit<PrivateCharacter, "heat"> & { heat?: number }` and the `PhoneApp` fallback `selectedCharacter.heat ?? 0` are catalog compatibility scaffolding, not WebSocket projection consumers.
- `PublicShopCost.heat`, result-delta `heat`, follower loss conditions, Heat effects, Mirror `heatThreshold`, and stable Heat-shaped IDs are separate compatibility constructs and remain out of scope.
- Twelve test files contain 48 numeric Heat fixture members. None proves a dependency on HP-01/HP-02; Phase 1R should remove only fixtures made obsolete by shared-type cleanup.

## Transport ownership

`GameRoomServer.createPatchEnvelope` chooses TV or phone projection and sends one JSON `STATE_PATCH`. Despite its name, each update is a complete payload. `useRoomSubscription` executes `setPatch(message)`, replacing the prior envelope; it does not deep-merge or retain removed properties. There is no Zod/runtime schema parse on incoming client state: `JSON.parse` is followed by a TypeScript assertion.

Initial and recovery paths:

1. TV opens a WebSocket and receives full public state.
2. Phone performs HTTP join for identity only, then opens WebSocket and sends `REJOIN`.
3. Successful phone adoption sends a private full snapshot and then a normal full broadcast.
4. Later authoritative changes send full recipient-specific patches.
5. Host phone follows the same phone projection path; it does not have a separate Heat contract.

Reconnection reparses neither snapshots nor archived metadata. A new full patch replaces client state, so omission cannot resurrect a previous zero through merge semantics.

## Type, fixture, and debug risk

Removing only producer assignments would compile-fail until the two required shared fields are removed. Conversely, removing shared fields first is runtime-safe but leaves producer object literals with excess data. Phase 1R should update server producers, shared fields, stale private/catalog compatibility typing, the lobby fallback, and affected fixtures in one coordinated repository commit.

Debug events retain raw envelopes in memory (maximum 40) for connection diagnostics. A client loaded before deployment may retain old zero-bearing debug entries until refresh, but this is neither normalized gameplay state nor persistence.

## Conclusion

Both keys are compatibility-only producers with no current consumer. Their removal is an internal coordinated payload/type cleanup. Missing and extra fields are naturally tolerated by current runtime JavaScript. A new network protocol is not justified for these two inert properties.
