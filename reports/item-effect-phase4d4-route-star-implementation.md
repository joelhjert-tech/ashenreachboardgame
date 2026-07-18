# Route Star Phase 4D4 implementation

## Approved rule

**Least-Hungry Road** — After selecting a legal destination with more than one authoritative route of the required distance, spend 1 charge to choose which route you will travel. Movement distance and all gate, scenario, threat, blocker, adjacency, and destination rules remain unchanged.

Route Star is an owner-only charged Artifact with 2 maximum and starting charges, a cost of 1 charge, and no recharge.

## Authoritative selection lifecycle

The phone previews ordered sector names from server-issued route variants. Preview and cancellation do not mutate state. Confirming a non-default route sends only the exact item instance ID, destination ID, route ID, and movement revision. The reducer revalidates turn ownership, equipped exact instance, charge count, revision, destination membership, current route legality, and non-default status before storing `routeStarChoices[seatId]` and spending one charge atomically.

The committed route ID is persisted game state, not an event-log inference. It survives serialization and reconnect, drives phone and TV route projection, and is used by normal movement confirmation and journey ordering. Movement completion clears it. Changing destination clears it without refunding the successful spend. Compass adjustment increments the revision and invalidates the old choice.

## Default compatibility and interactions

- Destination-only movement still uses deterministic `defaultRouteId` and never requires Route Star UI.
- Keeping the default route costs nothing.
- Only one committed Route Star choice is allowed per movement, including with duplicate copies.
- Ashen Route Compass resolves first and regenerates route IDs.
- Void Key and Gate-Saint Key remain separate legality and permission systems.
- Marrow Route Key remains a post-failure reaction.

## Presentation and privacy

The owner phone shows existing charge inventory presentation, server-issued route sequences, length and default markers, free preview controls, and `Choose this route — 1 charge`. After use it shows `Route Star: alternate route selected` and the authoritative route.

TV receives no Route Star charge prompt, unconfirmed alternatives, or private charge count. It can show `Route Star consulted` through the existing result summary and then renders the committed route through the existing preview and journey. No focus mode was added.

## Tests

Coverage includes schema metadata, exact-instance spending, duplicate-copy independence, default/stale/depleted/duplicate rejection, owner-only prompts, TV charge privacy, serialization and reconnect preservation, and phone preview/confirmation. Existing route-foundation tests continue to protect exact distance, deterministic IDs, revision invalidation, and destination-only defaults.

## Deferred work

Rift Anchor Spike remains the only deferred charged Artifact. Its owned-instance migration and forced-movement reaction boundary are unchanged.
