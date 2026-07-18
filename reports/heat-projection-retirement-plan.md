# Heat projection retirement plan

Status: preferred Phase 1R plan; pending explicit approval.

## Decision

Remove both emitted keys in one coordinated repository commit. Do not introduce a staged compatibility normalizer, capability negotiation, or protocol version. Repository evidence proves both omissions and old-server extras are tolerated by current runtime clients.

## Exact retirement target

1. Remove `heat: 0` from `createTvProjection(...).players[].character`.
2. Remove `heat: 0` from `createPublicShopEncounterState(...).activePlayer`.
3. Remove the corresponding required fields from `PublicPlayerCharacter` and `PublicShopEncounterState.activePlayer`.
4. Reconcile the already-Heat-free private projection by removing stale `PrivateCharacter.heat`, simplifying `CharacterCatalogEntry`, and removing the `PhoneApp` catalog fallback that manufactures zero.
5. Remove or update only test fixtures made obsolete by those shared type changes.

Heat-shaped shop costs, result deltas, content discriminators, Mirror threshold, archived v0 metadata, and stable IDs remain untouched.

## Compatibility semantics

- Missing Heat is the only canonical new client projection shape.
- During mixed deployment, an updated client accepts an old server's extra zero fields by ordinary JSON structural tolerance; it does not copy or normalize them.
- An old client accepts omission because no production selector, render path, comparison, or calculation uses the fields.
- Compatibility is transitional by deployment circumstance, not by a new stored optional field.
- The compatibility window closes only through an explicit later decision if a general protocol/version policy is desired. There is no automatic expiry.

## Implementation sequence

### One coordinated Phase 1R commit

1. Add focused contract tests that describe the old and new payload shapes without depending on gameplay Heat.
2. Remove the two server literal producers.
3. Remove public/shop shared type fields and stale private/catalog Heat typing.
4. Remove the lobby fallback zero assignment.
5. Update affected fixtures and projection assertions.
6. Add a boundary scan forbidding `heat` in current projection character/shop-active-player shapes while allowing separately approved costs, result deltas, legacy v0, metadata, Mirror, and content.
7. Verify fresh TV, phone, host-phone, reconnect, and shop projections.

There is no client-first/server-second rollout because the repository has no unsafe mixed pairing for these fields. Server and client artifacts should still be deployed together as normal operational hygiene.

## Entry gates

- Explicit approval of direct coordinated removal.
- The two producers and zero production consumers still reconcile at implementation time.
- No external API/client contract is newly discovered.
- Phase 1P snapshot and metadata tests remain green.

## Exit gates

- Projection Heat assignments: 2 to 0.
- Exact public/shop Heat fields in shared types: 2 to 0.
- Stale private/catalog compatibility construction: removed.
- Runtime/snapshot gameplay Heat remains 0.
- All initial join and reconnect projections remain valid.
- Full-state replacement behavior remains unchanged.
- Player-facing Heat/Risk routes remain 0/0.
- No private state is added to public projections.

## Test requirements

Producer tests:

- TV/public players omit Heat.
- Shop active player omits Heat.
- Phone public players and private `self` omit Heat.
- Neither producer reads runtime state or archived metadata.

Mixed-shape client tests:

- Current client components render an old fixture containing zero without exposing or copying Heat.
- Current client components render the new absent-field shape.
- No selector/type offers `character.heat` or `shopEncounter.activePlayer.heat`.
- Old-client simulation uses the pre-removal consumer functions and proves absent properties are never accessed.

Synchronization tests:

- TV initial attachment receives the new shape.
- Phone rejoin receives the new shape and keeps pending owner-private state.
- A later patch replaces an old fixture rather than retaining obsolete fields.
- Host-phone projection follows the phone contract.
- Pending encounter decisions, seat ownership, and rivalry privacy remain unchanged.

Boundary tests:

- projection-key count is zero;
- runtime and v1 snapshot character Heat count remains zero;
- legacy v0 and archival metadata remain allowed only at their existing boundary;
- Mirror `heatThreshold`, Heat-only effects, shop-cost compatibility, and result filtering remain unchanged.

## Risks and rollback

The principal risk is not a runtime crash but incomplete type/fixture cleanup causing compile noise or misleading future authors. The second risk is an undocumented external client outside this repository. No such client is evidenced. Rollback may restore the literal-zero producers and compatible fields without touching save migration or gameplay.

## Four-seat critique

- **New Player:** no visible change; stale phone/TV bundles continue because they never render these fields; no refresh message is needed for this omission.
- **Optimizer:** crafted extra Heat fields cannot become gameplay state or UI selectors; complete-payload replacement prevents stale merge retention.
- **Family Player:** no reinstall, storage clearing, or manual migration; an in-progress living-room session remains governed by existing reconnect/server-restart limits.
- **Rules Lawyer:** absence becomes canonical for network projections; extra zero fields are tolerated only as ignored JSON; save and network contracts remain distinct; any future compatibility-window closure is explicit.

## Commit boundary

Recommended single commit: `phase-1r-retire-heat-projection-keys`. Do not combine it with Heat-only content, Mirror, legacy snapshot, or historical-metadata retirement.
