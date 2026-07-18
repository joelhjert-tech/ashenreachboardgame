# Runtime Heat persistence inventory

Status: Phase 1O analysis; all recommendations are pending approval. No implementation is included.

## Baseline

The Phase 1N baseline reconciles: 17 canonical characters, zero authored Heat fields, zero character-default approvals, 40 Heat-effect approvals, 14 other compatibility approvals, 54 combined unique approvals, one compatibility-constructor definition, four production call sites, zero direct new-state `heat: 0` assignments outside that constructor, 29 Heat-only IDs / 32 branches / 41 Heat effects, and zero gameplay reads or writes. The runtime character field remains required. Two public projection keys emit constant zero.

The phrase “saved session” currently describes a schema capability, not a shipping persistence product. The server owns one process-memory `GameRoomServer`; no production module writes full room state to disk, a database, cloud storage, or browser storage. `sessionSnapshotSchema` is defined and tested but has no production save/load caller.

## Exact field inventory

| ID | Path | Symbol | Layer | Reads Heat | Writes Heat | Requires field | Preserves nonzero | Projects value | Migration risk |
|---|---|---|---|---:|---:|---:|---:|---:|---|
| RH-01 | `src/game/schema/character.schema.ts` | `characterSchema.heat` | runtime/persisted schema | yes, parse | no | yes | yes | no | high: root requirement |
| RH-02 | `src/game/schema/session.schema.ts` | `playerStateSchema.character` | session state | transitively | transitively | yes | yes | no | high: embedded in all players |
| RH-03 | `src/game/schema/session.schema.ts` | `gameStateSchema.players` | authoritative state | transitively | transitively | yes | yes | no | high: whole-session parse surface |
| RH-04 | `src/game/schema/session.schema.ts` | `sessionSnapshotSchema.state` | snapshot schema | transitively | transitively | yes | yes | no | high: natural future save boundary, currently unused in production |
| RH-05 | `src/game/rules/legacyHeatCompatibility.ts` | `createLegacyCharacterCompatibilityState` | compatibility construction | no | `0` | n/a | no | no | medium: must retire from current construction |
| RH-06 | `src/server/sessionState.ts` | initial character clone | construction | no authored Heat read | `0` via helper | yes | n/a | no | medium |
| RH-07 | `src/server/roomServer.ts` | selection construction | construction | no authored Heat read | `0` via helper | yes | n/a | no | medium |
| RH-08 | `src/server/roomServer.ts` | fresh setup/replacement construction | construction | no authored Heat read | `0` via helper | yes | n/a | no | medium |
| RH-09 | `src/game/engine/reducer.ts` | recalled replacement construction | construction | no authored Heat read | `0` via helper | yes | n/a | no | medium |
| RH-10 | `src/game/engine/reducer.ts` | two immutable shop character copies | runtime copy | yes, preservation only | existing value | yes | yes | no | low after normalized runtime drops field |
| RH-11 | `src/server/roomServer.ts` | `createPhoneProjection` private character | network projection | no stored-value read | constant `0` | client type requires | no | yes, zero | separate network-contract risk |
| RH-12 | `src/server/roomServer.ts` | public/TV character/shop projection | network projection | no stored-value read | constant `0` | client type requires | no | yes, zero | separate network-contract risk |
| RH-13 | `src/server/roomServer.ts` | `handleRejoin` / `adoptPhoneClient` | reconnect | no Heat-specific access | none | existing room already shaped | yes, by object identity | only constants | low; not a save migration |
| RH-14 | `src/client/phone/PhoneApp.tsx` | character catalog compatibility fallback | client catalog | optional catalog value | constant fallback | no | no | private construction only | separate authored/client cleanup |
| RH-15 | focused Heat tests and fixtures | schema and JSON round trips | tests | yes | fixture values | varies | yes | asserted | compatibility evidence |

Heat-shaped shop costs, result deltas, follower loss conditions, stable IDs, Mirror `heatThreshold`, and generic Heat effect discriminators are separate compatibility constructs. They do not read `character.heat` and are not persistence paths for this field.

## Ownership by lifecycle

- **In-memory runtime:** a `GameState` held directly by `GameRoomServer`. Construction adds zero; reducers copy the value incidentally; no rule consumes it.
- **Persisted/session schema:** `characterSchema` is embedded in player, game, and snapshot schemas. This is type/schema persistence potential, not evidence of a deployed save store.
- **Serialization:** WebSocket envelopes serialize projections, not the full `GameState`. Full-state JSON round trips exist in tests only.
- **Deserialization/restoration:** there is no production full-state restoration entrypoint. The server always starts from `createInitialSessionState`.
- **Reconnection:** seat-token validation reconnects a phone to the existing in-memory room. State is neither reparsed nor reconstructed.
- **Browser storage:** phone storage retains session/seat authentication; TV storage retains room/host tokens; neither stores character state.
- **Projection:** two server projection shapes deliberately emit zero and never expose an old stored nonzero value.
- **Debug/QA:** QA mutates an already-live room. It is not a save parser or migration boundary.

## Activity classification

Gameplay readers: **0**. Gameplay writers: **0**. Construction writers: **4 helper call sites**. Stored-value preservation sites: **2**. Runtime schema declarations requiring the field: **1 authoritative character declaration**, embedded through three higher-level schemas. Production save serialization writers: **0**. Production save deserialization readers: **0**. Reconnection preservation path: **1 in-memory rejoin flow**. Projection compatibility keys: **2**.

## Measured census

| Measure | Count |
|---|---:|
| Runtime Heat schema declarations | 1 |
| Required runtime Heat fields | 1 authoritative field |
| Optional runtime character Heat fields | 0 |
| Full-state production serialization writes | 0 |
| Full-state production deserialization reads | 0 |
| In-memory reconnection preservation flows | 1 |
| Save-version fields | 0 |
| Migration functions | 0 |
| Projection compatibility keys | 2 |
| Compatibility constructor definitions | 1 |
| Production constructor call sites | 4 |
| Active gameplay reads / writes | 0 / 0 |
| Direct Heat-compatibility tests | 14 (9 construction + 5 containment) |
| Tests protecting active Heat mechanics | 0 |
| Lexical `heat: 0` occurrences in test/fixture source | 58 |
| Lexical positive nonzero `heat: N` occurrences in test/fixture source | 66 |
| Explicit persisted-character missing-Heat negative fixtures | 1 |
| Heat-only IDs / branches | 29 / 32 |
| Combined compatibility approval IDs | 54 |

Fixture counts are lexical source occurrences across files whose paths contain `test`, `spec`, or `fixture`; they are not claimed as unique saved-session fixtures. This distinction avoids inflating the nonexistent production save inventory with repeated object literals.

## Migration risks

The largest risk is treating `characterSchema.optional()` work as migration. A current parser accepting absence would not distinguish an old malformed snapshot from a current valid snapshot. The second risk is running normalization during reconnect or character replacement, which could reset unrelated pending decisions or resources. The third is coupling network projection removal to save schema migration; those payloads have different consumers and versioning needs.

## Conclusion

The future migration boundary should be an explicit versioned snapshot parser before a `GameRoomServer` is created. Current runtime state should be Heat-free after that boundary. Reconnect should continue to use the existing normalized in-memory room and must not invoke migration.
