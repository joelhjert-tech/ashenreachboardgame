# Phase 1Q decision specification

Status: implementation-ready recommendations for Phase 1R. Every recommendation is **pending approval**.

## Preferred architecture

Use direct coordinated removal. The two obsolete fields are non-behavioral optional-at-runtime JSON properties despite required TypeScript declarations. No protocol version, staged optional field, or capability negotiation is required.

## Exact Phase 1R target

| Field | Producer | Shared owner | Decision |
|---|---|---|---|
| `players[].character.heat` | `createTvProjection` | `PublicPlayerCharacter` | remove assignment and field |
| `shopEncounter.activePlayer.heat` | `createPublicShopEncounterState` | `PublicShopEncounterState` | remove assignment and field |

Related type reconciliation: remove stale `PrivateCharacter.heat`; simplify the Heat-omitting `CharacterCatalogEntry`; remove `selectedCharacter.heat ?? 0` from the phone lobby fallback. These changes align types with the already-Heat-free private payload and do not add a third mechanical scope.

## Files likely affected

- `src/server/roomServer.ts` — remove the two literal producers.
- `src/client/shared/types.ts` — remove public/shop fields and stale private/catalog compatibility typing.
- `src/client/phone/PhoneApp.tsx` — stop manufacturing lobby fallback Heat.
- focused server projection tests, phone/TV fixtures, and runtime import/boundary tests as compilation requires.
- `reports/heat-phase-1r-projection-retirement.md` and the decision register.

No game schema, snapshot migration, historical metadata, authored content, Mirror rule, generic Heat discriminator, or save serializer should change.

## Network and deployment behavior

- Protocol-version decision: **do not add one in Phase 1R**.
- Deployment: normal coordinated server/client deployment; either order remains safe for these fields.
- Old client/new server: missing fields yield no behavior because old production code has no reads.
- New client/old server: extra JSON properties are ignored; do not normalize them into current state.
- Fresh TV/phone join: full Heat-free patch.
- Reconnect: same Heat-free full patch; no snapshot migration and no deep merge.
- Cached loaded bundle: may reconnect; no refresh is required solely for this change.
- Server restart: existing room continuity follows current in-memory limitations; this field removal adds none.

## Security and malformed payload policy

Current server projections are authoritative output, not client input. Client intents cannot submit projection Heat. During mixed versions, extra fields may exist in a raw received object but no current selector consumes them. Phase 1R should add a narrow network-boundary/AST guard so current projection types and producers cannot expose Heat after cleanup. Do not broaden this guard to approved `cost.heat`, result delta compatibility, v0 migration, archival metadata, Mirror threshold, or content discriminators.

No private-data risk is created: removal only deletes public zero. The full public/private projection constructors and owner-only pending state remain unchanged.

## Required test matrix

1. Server public player and shop projections omit both fields.
2. Phone private `self` and inherited public players omit Heat.
3. TV, phone, and host-phone render new payloads.
4. Updated clients tolerate an old zero-bearing fixture without rendering or normalizing Heat.
5. Pre-removal consumer code proof/simulation tolerates new absent-field fixtures.
6. Full state replacement after an old fixture leaves no obsolete property.
7. Phone reconnect preserves seat, pending encounter/displacement state, and private rivalry boundaries.
8. Shared types and current fixtures expose no projection Heat.
9. Runtime/v1 snapshot Heat remains zero; v0/metadata tests remain green.
10. Heat-only IDs/branches/effects and 54 approval IDs remain unchanged.

## Boundary counts

Current measured state:

- projection Heat keys: 2;
- producer functions: 2;
- active production consumers: 0;
- inert production consumers: 0;
- direct type-only consumers: 2;
- test-only behavioral consumers: 0;
- payload interfaces carrying the nested public contract: 2 (`PublicPatchPayload`, `PhonePatchPayload`);
- initial sync recipient paths: 2;
- phone reconnect paths: 1;
- state normalization layers: 0;
- protocol/build version fields: 0/0;
- strict projection parsers: 0;
- local-storage Heat entries: 0;
- service workers: 0;
- cached loaded-bundle risk paths: 2;
- active gameplay Heat reads/writes: 0/0.

Expected Phase 1R state: projection keys/producers/type fields 0/0/0, with all other Heat compatibility counts unchanged.

## Rollback

If an external consumer appears, revert the coordinated commit or temporarily restore the two zero producers and optional compatibility fields. Do not roll back Phase 1P, synthesize runtime Heat, read archival metadata, or alter `saveVersion`. No storage migration or cache purge is needed.

## Four-seat critique

- **New Player:** no visible Heat/Risk and no expected stale-client join failure.
- **Optimizer:** extra crafted projection fields have no authoritative path; replacement semantics prevent stale merge persistence; reconnect cannot bypass server-authenticated projection ownership.
- **Family Player:** no manual upgrade, reinstall, or storage clearing; normal refresh remains sufficient for unrelated deployment failures.
- **Rules Lawyer:** network absence is canonical after Phase 1R; old-server extras are ignored rather than treated as zero state; `saveVersion` does not govern join/reconnect; a future general protocol support window requires separate approval.

## Acceptance and containment

Phase 1R is ready once direct removal is approved. It must change only projection/type/catalog compatibility code, focused tests, its report, and register. It must not change runtime mechanics, snapshot schemas/migration, historical metadata, content, Mirror, Rust Choir Peddlers, Heat-only effects, or public/private ownership.
