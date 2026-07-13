# Authoritative Forced-Displacement Foundation Implementation

## Scope and approval

The foundation implements the approved first source, `route-splice`, as **Option A — Clockwise Misroute**. Rift Anchor Spike remains unapproved and unimplemented. Veil Hook and every existing movement Artifact remain unchanged.

Approved rule:

> Clockwise Misroute: If you fail this test, the server attempts to move you one adjacent sector clockwise on the same ring. The destination must be legal under all normal gate, blocker, scenario, and destination rules. This displacement replaces the normal 1-Wound failure consequence. If no legal clockwise destination exists, remain in your current sector and suffer 1 Wound instead. The test still counts as failed.

## Content migration

Only `content/cards/threats/route-splice.json` changes mechanically.

- Stable ID, Guile 8 test, yellow lane, middle placement, uncommon rarity, event resolution role, and success note are preserved.
- Failure changes from `take_wound 1` to bounded `forcedDisplacement`.
- Direction is clockwise, distance is exactly 1, same-ring is required, the fallback is `take_wound 1`, and the failed test remains recorded.
- No other Threat, anomaly, tile challenge, hazard, scenario, route, or movement rule changes.

## Typed effect and authoritative destination

The new effect accepts only:

- `clockwise` or `counterclockwise`;
- distance exactly 1;
- `sameRing: true`;
- optional bounded `take_wound 1` fallback;
- `failureStillCounts: true`.

The first production source is explicitly allowlisted as `route-splice`. New forced-displacement content is rejected until separately approved.

Clockwise identity comes from the canonical ring order in `RIFTFALL_BOARD_NODES`, not client geometry or array indexes supplied by a phone. The server derives the next ring node and reuses `getMovementStepBlockReason` for adjacency, authored transition requirements, Nemesis Relay restrictions, notes, and other current movement legality. The client never supplies a destination, route, distance, or legality claim.

## Persisted lifecycle

A failed typed source resolves in this order:

1. The normal check is finalized as failed.
2. Existing hazard-failure reactions finish.
3. Resolution reaches `forcedDisplacement`.
4. The server derives the single clockwise legal destination.
5. With a destination, it stores `pendingDisplacement` before changing sector.
6. Owner phone receives one acknowledgement action; TV receives a public waiting status.
7. Acceptance revalidates seat, reaction ID, source encounter/resolution, origin, current canonical destination, and legality.
8. The server changes both authoritative sector fields exactly once.
9. The source event ID is recorded, pending state closes, and one destination-arrival pass is scheduled.
10. Existing sector-arrival handling resumes after the source outcome closes.

If no legal destination exists when the effect is first reached, the server applies the 1-Wound fallback immediately. If legality changes while the reaction is pending, final validation applies the same fallback instead of using a stale route. The failed check remains failed in every path.

Persisted fields are optional for old saves:

- `pendingDisplacement`;
- `pendingDisplacementArrival`;
- `resolvedDisplacementSourceEventIds`.

Reaction and source-resolution IDs remain stable through serialization and reconnect. Resolved IDs reject replay. Sessions without the new optional fields continue to deserialize through compatibility defaults.

## Projection and presentation

Owner phone receives source, public origin/destination names, reaction ID, and one `Accept displacement` control. Other phones receive no actionable control. TV shows `Displacement pending` and the acting operative/source without exposing reaction IDs or hidden content. Final public resolution uses the destination's public sector name.

There is no destination choice, client-authored path, Rift Anchor Spike control, charge state, or new focus mode.

## Arrival and recursion protection

Displacement is not an ordinary movement roll and does not alter movement totals, route variants, or journey state. After acceptance, `pendingDisplacementArrival` causes the existing resolution-to-sector boundary to run once. The marker clears on the phase transition, so reconnect or duplicate acceptance cannot replay arrival. The source encounter closes before destination sector processing resumes.

## Validation and tests

Focused coverage verifies:

- bounded schema acceptance/rejection;
- the sole approved source ID;
- unchanged Route Splice identity and success behavior;
- deterministic same-ring clockwise derivation;
- legality and adjacency;
- pending state before mutation;
- accepted movement exactly once;
- no Wound on successful displacement;
- immediate and late-invalidity Wound fallback;
- failure history preservation;
- wrong-seat, stale reaction, stale origin, duplicate, and continue-bypass rejection;
- serialization/reconnect;
- owner-only phone action;
- public-safe TV waiting state;
- authenticated server intent;
- one arrival continuation;
- unchanged Rift Anchor Spike and Veil Hook behavior.

## Explicit non-changes

- Rift Anchor Spike is still unapproved and unimplemented.
- It has no owned instance, charges, prompt, activation, or migration.
- Existing Veil Hooks are untouched.
- No ordinary movement, route enumeration, exact distance, Route Star, Compass, Void Key, Gate-Saint Key, Marrow Route Key, Blackstar, mission, tile-challenge, shop, Heat, Scar, or Wound rule is redesigned.
