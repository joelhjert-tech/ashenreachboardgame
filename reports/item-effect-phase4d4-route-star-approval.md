# Route Star Phase 4D4 approval gate

Status: **BLOCKED — approval incomplete; no mechanics implemented**

Artifact: `artifact-route-star` — Route Star
Recommended concept reviewed: Least-Hungry Road

## Authoritative route-state findings

The current movement planner cannot support Least-Hungry Road safely.

- `MovementRoute` contains only `sectorId`, `distance`, and `route`; it has no stable route ID or revision.
- Both ring and graph planning store results in `Map<string, MovementRoute>` keyed by destination sector.
- `addMovementRoute` accepts a route only when that destination key is absent. A second legal route to the same destination is discarded.
- Graph search also marks `sectorId:distance` as visited, so later paths reaching the same sector at the same distance are not retained.
- `getLegalMovementRoute` returns the single route whose destination matches.
- Server projection exposes one `PublicMoveDestination` per retained route. Destination preview stores only the destination sector ID.
- Route confirmation and the movement journey therefore receive one authoritative route, not selectable variants.
- No stable planner revision, alternative-route collection, route-note summary, or typed intermediate-route penalty is available.

Consequently, Option A cannot be added narrowly in the Artifact slice. Retaining route variants would change the authoritative planner and confirmation contract and requires its own reviewed movement-engine prerequisite. The phone must not reconstruct discarded routes.

## Option A — Least-Hungry Road

**Exact proposed rule text**

> After selecting a legal destination that has more than one authoritative route of the required length, spend 1 charge to inspect those routes and choose which one to travel. All gates, scenario locks, blockers, Threats, adjacency, movement distance, and destination rules remain unchanged.

- Charges: proposed 2 maximum / 2 starting; cost 1; no additional cost; no recharge.
- Scope: owner only.
- Timing: after destination preview, before route confirmation.
- Required state: stable route IDs, planner revision, all legal variants to one destination, exact selected-route commitment.
- Stale behavior: changed roll, adjustment, destination, planner revision, gate state, blocker, or route rejects without spending.
- Phone: list only server-provided variants and require confirmation before spending.
- TV: show `Route Star consulted` only after commitment, then use the selected route in the existing preview and journey.
- Complexity: 4/5 with the missing prerequisite; power risk 2/5.
- Readiness: **Blocked**. Alternative routes are discarded before projection and confirmation.

## Option B — Road Omens

**Exact proposed rule text**

> After rolling movement, spend 1 charge to reveal the currently public challenge, Threat, shop, and printed route information for every legal destination. This does not reveal hidden cards or change movement distance, routes, or destination legality.

- Charges: proposed 2/2; cost 1; no additional cost; no recharge.
- Scope: owner only.
- Timing: after the authoritative roll, before destination selection.
- Required state: a typed owner-private snapshot of fields already present in public/owner-visible destination projections, bound to the current roll and planner revision.
- Restrictions: no hidden deck contents, unrevealed Threats, private rivalry data, future encounters, or client-selected field names.
- Stale behavior: roll, movement adjustment, active seat, phase, or planner change rejects without spending; an already-active reading cannot spend twice.
- Phone: preview the information categories, then confirm; render server-derived destination summaries.
- TV: public-safe `Route Star consulted`; no pre-confirmation detail.
- Complexity: 2/5; power risk 1/5.
- Readiness: **Needs final approval and a narrow planner-revision/private-reveal state**. Much of the proposed information is already visible, so value must be confirmed before spending design effort.

## Option C — Star-Marked Passage

**Exact proposed rule text**

> After selecting a legal route, spend 1 charge to mark one intermediate tile. When you reach that tile during this movement, ignore one server-listed eligible route-note penalty from that tile. All other effects resolve normally.

- Charges: proposed 2/2; cost 1; no additional cost; no recharge.
- Scope: owner only.
- Timing: after route selection, before movement begins.
- Required state: typed route-note penalties with stable effect IDs, suppressibility metadata, selected intermediate tile, route revision, and reconnectable pending mark.
- Restrictions: never suppress a Threat, challenge, gate, scenario lock, adjacency rule, destination effect, or atomic composite effect.
- Stale behavior: changed route or missing typed effect rejects without spending.
- Phone: list only server-provided eligible penalties and confirm exact selection.
- TV: show the normal selected route; public feedback only when the marked penalty is actually ignored.
- Complexity: 5/5; power risk 3/5.
- Readiness: **Blocked**. Typed independently suppressible route-note penalties do not exist.

## Recommendation

Do not approve or implement Route Star in this pass.

Option A remains the strongest identity because it is distinct from distance adjustment, gate override, detour, and Contract-reading Artifacts. It first requires a separate movement-planner foundation that:

1. retains all legal exact-distance routes rather than deduplicating by destination;
2. assigns deterministic stable route IDs and a planner revision;
3. validates route selection server-side at confirmation;
4. preserves gate, blocker, scenario, adjacency, and destination validation;
5. projects only authoritative variants;
6. reconstructs selected-route state after reconnect; and
7. proves existing destination behavior remains unchanged when only one route exists.

That foundation is outside this Artifact approval and must not be smuggled into its implementation. Option B is the lowest-engine-surface fallback but is not approved because current destination presentation already exposes much of its value. Option C remains blocked.

## Approval block

Route Star:
- Selected option: [UNAPPROVED — Option A blocked by route deduplication]
- Maximum charges: [UNAPPROVED; proposed 2]
- Starting charges: [UNAPPROVED; proposed 2]
- Cost per activation: [UNAPPROVED; proposed 1 charge]
- Additional cost: [UNAPPROVED; proposed NONE]
- Recharge: none
- Scope: [UNAPPROVED; proposed owner only]
- Activation timing: [UNAPPROVED; proposed after destination selection and before confirmation]
- Exact route information or choice: [UNAPPROVED; authoritative variants unavailable]
- Stale-route behavior: [UNAPPROVED; requires stable route ID and planner revision]
- Final rule text: [UNAPPROVED]

## Implementation safety verdict

Implementation is **not safe**. No content, schema, engine, server, phone, TV, validation, or test mechanics were changed. Route Star remains deferred. Rift Anchor Spike remains last due to its separate migration and forced-movement risk.
