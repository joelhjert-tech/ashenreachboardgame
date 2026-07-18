# Authoritative route-variant foundation

## Previous behavior

`movementPlanner` enumerated clockwise/counter-clockwise ring paths or breadth-first graph paths, then stored routes in a destination-keyed map. The first path to a destination became the only authoritative route. Graph search additionally deduplicated by sector and distance. Phone and TV received one path per destination, preview stored only a destination ID, and `MOVE_REQUESTED` validated only that destination. The TV journey reused the selected destination path from the last authoritative planner projection.

## Implemented model

- Every legal route is an ordered exact-distance sector path validated by the existing adjacency, transition, gate, scenario, blocker, and movement-requirement rules.
- Distinct paths to the same destination are retained. Identical ordered paths are deduplicated by their path key.
- Graph enumeration retains simple paths and prevents cycles within one route. Ring movement retains its existing two deterministic directions.
- Routes retain the planner's existing deterministic enumeration order, preserving its first/default route.
- Each route receives `route-<revision>-<hash>`, derived from movement revision, seat, origin, destination, movement total, and ordered path. It is deterministic across reconnect and changes when the revision or path changes.
- `movementRouteRevisions[seat]` is persisted. A movement roll creates/increments it; a Compass adjustment increments it again. Movement completion removes the roll, making every prior route unavailable even though the revision counter remains for the next roll.

## Projection and confirmation

Each projected destination retains the existing default `route` and adds:

- `routeId`
- `defaultRouteId`
- `routeVariants[]` containing only route ID, destination ID, public sector IDs, and distance
- planner-level `movementRevision`

No Threat identity, hidden draw, shop stock, Contract target, rivalry data, or encounter result enters a route variant.

Destination-only preview and confirmation remain valid and use the deterministic first route. An optional preview or `MOVE_REQUESTED` may include a server-issued route ID plus movement revision. The server rejects incomplete pairs, stale revisions, unknown IDs, wrong-destination IDs, illegal recomputed routes, and wrong-seat intents. Clients never submit sector arrays or distances.

Selecting another destination replaces the preview and therefore clears an incompatible route. A Compass adjustment clears preview state and regenerates route IDs. The server-held preview survives phone reconnect within the room. TV projection substitutes the selected authoritative variant into the existing destination route, so the existing movement journey consumes that ordered path without a new focus mode.

## Default compatibility

Normal phones still select destinations and submit destination-only movement. No route-choice screen is required. Existing Void Key, Route Compass, Gate-Saint Key, Marrow Route Key, destination preview, arrival focus, and journey behavior retain their existing entry points. Explicit route selection is optional foundation capability only.

## Route-count and performance findings

An exhaustive measurement across every current canonical origin and movement totals 1–6 found:

- maximum variants for one destination: **2**
- maximum total legal variants in one movement state: **5**
- worst measured planner call: **16.187 ms** (`outer_ember_sanctum`, movement 1; development measurement)

A synthetic branching distance-six test also completes below 100 ms and verifies path deduplication. Current content does not justify an arbitrary route cap. If future topology increases counts materially, add a documented deterministic policy only after measuring it; never silently discard the sole route that later revalidation would accept.

## Reconnect and journey boundary

Route IDs are derived from persisted authoritative state and reconstruct identically after reconnect. Preview selection is owned by the room server and remains stable for reconnect to that room. Confirmation revalidates the selected ID against a freshly generated plan. The selected preview path feeds the existing TV journey; destination-only movement continues using the default path. Completed movement has no route plan because its movement roll is cleared, so old IDs cannot be reused.

## Tests

Focused coverage proves:

- two exact-distance paths to one destination are preserved;
- ordered-path duplicates are removed;
- route ordering and IDs are deterministic;
- explicit route IDs bind to destination and revision;
- stale, unknown, and wrong-destination IDs reject;
- destination-only confirmation remains compatible;
- revision changes regenerate IDs;
- grouped projection contains only safe route fields;
- representative branching enumeration remains bounded.

Existing engine, server projection, phone, TV, movement journey, tile-challenge, mission, and charged-Artifact suites provide the regression boundary.

## Future Route Star boundary

Route Star may later request selection from `routeVariants` and submit the chosen `routeId` with `movementRevision`. Its approval must still define charges, timing, UI, stale behavior, and stacking. This foundation contains no Route Star activation, prompt, charge state, eligibility, or presentation.

**Route Star remains unimplemented and spends no charges in this foundation.**
