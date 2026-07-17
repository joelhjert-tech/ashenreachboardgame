# Phase 1R — Heat Projection Contract Retirement

Status: implemented and verified.

## Outcome

Phase 1R removes the final two Heat-shaped fields from current phone and TV network projections:

- `players[].character.heat`
- `shopEncounter.activePlayer.heat`

Both fields were literal compatibility zeros with no production consumer. The server producers, shared public types, stale private-phone type, catalog compatibility type, and phone lobby fallback were removed together. Missing Heat is now the only current projection shape; no optional field, fallback, normalizer, protocol version, or capability negotiation was introduced.

## Producer and type changes

`createTvProjection` no longer manufactures Heat in public player characters. `buildPublicShopEncounter` no longer manufactures Heat in the active-player summary. Phone projections inherit the Heat-free public projection, while `sanitizePlayerForPhone` continues projecting the already Heat-free runtime character.

`PublicPlayerCharacter`, `PublicShopEncounterState.activePlayer`, and `PrivateCharacter` no longer declare Heat. `CharacterCatalogEntry` is now the current Heat-free `PrivateCharacter` shape rather than an omit-and-optional compatibility wrapper. `PhoneApp` uses the authored catalog entry directly for its lobby fallback and no longer reads or creates `selectedCharacter.heat`.

Only current projection/client fixtures were reconciled. Heat-shaped shop costs, result deltas, generic effects, Mirror `heatThreshold`, and stable compatibility identifiers remain outside this contract cleanup.

## Join and reconnect behavior

- TV initial synchronization receives full public players without Heat.
- Phone initial/rejoin synchronization receives Heat-free public players and a Heat-free owner-private character.
- Host phone follows the same phone projection contract.
- WebSocket `STATE_PATCH` handling still replaces the prior state object with `setPatch(message)`; no merge or normalization layer was added.
- A reconnect integration assertion proves the restored owner-private character and public players omit Heat while exact equipment and seat ownership survive.
- Snapshot migration is not imported or invoked by reconnect.

Pending decisions, shop state, private Rivalry state, inventory, abilities, Wounds, Scars, Salvage, attributes, contracts, charged instances, and public/private ownership remain on their existing paths.

## Mixed-version compatibility

The Phase 1Q conclusion remains valid:

| Pairing | Behavior |
|---|---|
| Old client + old server | Receives the old inert zeros. |
| Old client + Phase 1R server | Safe: audited old production code never reads either omitted property. |
| Phase 1R client + old server | Safe: extra JSON properties are ignored by ordinary object handling; focused phone and TV fixtures render without Heat/Risk output. |
| Phase 1R client + Phase 1R server | Canonical Heat-free contract. |

An already loaded browser bundle may reconnect normally. No refresh, reinstall, storage clearing, compatibility prompt, service worker, or protocol version is required for these inert omissions. A server restart still has the repository's existing in-memory-room limitation; Phase 1R adds no persistence behavior.

## Security and privacy

- Projection fields remain authoritative server output and cannot be submitted through player intents.
- Archived `legacyCompatibility.characterHeat` metadata is never read by projection code and is not available to reducers or clients.
- Extra old Heat fields have no selector, arithmetic, affordability, rendering, or condition consumer.
- Shop affordability continues to use Salvage only where authored; Deep Relic Search remains exactly 1 Salvage.
- No public field was replaced with private inventory, Contract detail, or Rivalry Agenda data.
- Complete state replacement prevents an obsolete field from surviving through a deep merge because no deep merge exists.

## Phase 1P isolation

The snapshot and runtime boundary is unchanged:

- current runtime characters: Heat-free;
- v1 snapshot characters: Heat-free and direct Heat rejected;
- unversioned v0 characters: strict required nonnegative Heat;
- v0 zero: validated and omitted during migration;
- v0 nonzero: preserved exactly in non-gameplay archival envelope metadata;
- migration: deterministic, idempotent, and separate from reconnect;
- production full-session persistence callers: zero.

The historical metadata support window remains open-ended and can close only through a separate explicit phase.

## Tests

Focused coverage includes:

- public player omission across single-player, cooperative, and Rivalry projections;
- owner-private phone omission and preservation of private inventory;
- shop active-player omission with unchanged Salvage and service projection;
- realistic old phone payload and old TV payload rendering with extra zero fields;
- no Heat/Risk UI output or affordability effect from old extras;
- reconnect full-state omission while equipment and seat ownership survive;
- static current-contract guard for server producers, shared types, and the phone catalog fallback;
- unchanged strict v0 schema and complete Phase 1P migration regression suite;
- unchanged shop, Gate Tax Collectors, Deep Relic Search, Rivalry privacy, and content validation suites.

## Counts

| Measure | Before | After |
|---|---:|---:|
| Projection Heat keys | 2 | 0 |
| Projection producer functions emitting Heat | 2 | 0 |
| Active production consumers | 0 | 0 |
| Inert production consumers | 0 | 0 |
| Direct type-only projection consumers | 2 | 0 |
| Current shared client required Heat fields | 3 | 0 |
| Catalog Heat fallbacks | 1 | 0 |
| Runtime Heat fields | 0 | 0 |
| Current v1 snapshot Heat fields | 0 | 0 |
| Legacy v0 Heat declarations | 1 | 1 |
| Active gameplay Heat reads / writes | 0 / 0 | 0 / 0 |
| Protocol-version fields | 0 | 0 |
| State-normalization layers | 0 | 0 |
| Heat-only IDs / branches | 29 / 32 | 29 / 32 |
| Heat-effect occurrences | 41 | 41 |
| Compatibility approval IDs | 54 | 54 |
| Production full-state persistence callers | 0 | 0 |

The three shared required fields comprise the two public contract fields plus the stale private-phone field. The two approved emitted projection keys are the public-player and shop-active-player properties.

## Four-seat critique

- **New Player:** no visible change; phones and TV join and reconnect normally; Heat and Risk stay absent.
- **Optimizer:** crafted inert JSON extras cannot enter gameplay or shop affordability, and full replacement prevents stale merge retention.
- **Family Player:** no refresh, reinstall, storage clearing, prompt, or interruption is introduced.
- **Rules Lawyer:** save version and network payload remain separate contracts; omission is canonical now; old extras are tolerated only as unused JSON; legacy v0 Heat remains confined to snapshot migration.

## Files changed

- `src/server/roomServer.ts`: removed the two literal-zero producers.
- `src/client/shared/types.ts`: removed public, shop, and private Heat fields and simplified catalog ownership.
- `src/client/phone/PhoneApp.tsx`: removed the catalog fallback.
- focused server, reconnect, phone, TV, audio, and current client fixtures/tests: aligned current shapes and added compatibility assertions.
- `src/game/engine/__tests__/legacyHeatConstruction.test.ts`: changed the projection boundary expectation from two to zero.
- Phase 1Q reports and this report: retained architecture evidence and implementation results.
- `reports/heat-retirement-decision-register.md`: marked only projection-contract retirement implemented.

No runtime character schema, v0/v1 snapshot schema, migration function, archival metadata, content, Mirror behavior, Heat-only outcome, generic Heat discriminator, asset, browser storage, service worker, or protocol infrastructure changed.

## Remaining work

- historical metadata support-window closure;
- legacy v0 parser retirement;
- Mirror-key migration;
- remaining Heat-only outcomes;
- Rust Choir Peddlers approval;
- stable Heat discriminator cleanup.
