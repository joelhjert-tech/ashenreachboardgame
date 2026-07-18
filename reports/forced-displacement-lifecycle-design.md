# Authoritative Forced-Displacement Lifecycle Design

Status: **design only; all lifecycle fields unapproved; no implementation**.

## Design boundary

The repository has authoritative movement validation and several persisted reaction patterns, but it has no general forced-displacement effect or pending lifecycle. A new foundation must be exercised by one approved authored source; it must not be built as dead infrastructure.

This design covers only server-authored operative relocation before it resolves. It does not cover voluntary movement, movement rolls, route selection, route correction, route Artifacts, nemesis-token movement, rollback, or completed movement.

## Existing patterns that can be reused

| Pattern | Useful capability | Boundary |
|---|---|---|
| `pendingTileChallenge` | Persisted source identity, owner seat, authored order, private/public projections, reconnect | Represents the test, not a post-test displacement reaction |
| `pendingStaticIntercessionReaction` | Stable reaction identity and suppressible typed effect | Anomaly-failure specific |
| `pendingScarConsequence` plus queue | Stable reaction/source IDs, status, deterministic pending queue, resolved source guard | Scar-specific and must not be aliased |
| `pendingFailureReaction` | Pre-consequence failed-test window | Movement/hazard failure semantics are broader than displacement |
| movement planner/block-reason helpers | Server authority for adjacency, gates, scenario restrictions, blockers | Ordinary route distance and destination rules must not be rewritten |
| phone/TV projection split | Owner-private controls and public-safe status | Must add a displacement-specific projection rather than expose raw state |

Reaction IDs from these systems are not interchangeable. A displacement action must carry its own typed ID and source event.

## Proposed typed effect

Use a narrow effect rather than generic scripting:

```ts
type ForcedDisplacementEffect = {
  type: "forced_displacement";
  destinationModel: "clockwiseAdjacent" | "serverChoiceAdjacent";
  sameRing: true;
  allowPlayerChoice: boolean;
};
```

The authored effect describes how the server derives destinations. Content must not contain an arbitrary sector path or client-computed destination. Initially allow only the destination model approved for the first source.

Validation must reject unsupported models, contradictory choice flags, arbitrary sector arrays, non-operative targets, and placement on success/reward branches unless explicitly approved.

## Proposed persisted state

Adapted to current seat IDs and effect types:

```ts
type PendingDisplacement = {
  reactionId: string;
  seatId: string;
  sourceType: "tileChallenge" | "hazard" | "threat" | "scenario";
  sourceId: string;
  sourceEventId: string;
  originSectorId: string;
  destinationIds: string[];
  selectedDestinationId: string | null;
  remainingEffects: EncounterEffect[];
  createdAt: string;
  status: "pending" | "resolved";
};
```

Session additions proposed for a later implementation:

- `pendingDisplacement?: PendingDisplacement | null` for the active reaction;
- `pendingDisplacementQueue?: PendingDisplacement[]` only if the approved source can create more than one displacement in authored order;
- `resolvedDisplacementSourceEventIds?: string[]` as bounded duplicate protection.

The first source should affect one operative and require no queue. The optional fields preserve legacy saves without a migration. Event logs remain history, never active state.

## Stable identity

`sourceEventId` should be deterministic for the active encounter resolution: room/session identity, active turn sequence, seat, source ID, branch, and resolution sequence. `reactionId` derives from that source event plus the displacement ordinal. Neither may be a client-generated random value.

A source event already present in `resolvedDisplacementSourceEventIds` cannot reopen. A resolved reaction ID cannot be accepted again after reconnect.

## Destination derivation

The server derives candidates from current authoritative state immediately before opening the reaction:

1. Read the operative’s current sector as origin.
2. Apply the approved source destination model.
3. Require direct adjacency.
4. Apply current gate, scenario-lock, blocker, tier/ring, and destination restrictions.
5. Remove duplicates and the origin.
6. Sort deterministically using canonical board identity, not client order.
7. Store only the validated destination IDs.

At resolution the server revalidates the chosen destination against the current board. Stale or newly illegal destinations reject without moving and keep the pending state actionable if another candidate remains. If none remains, resolve the displacement component as no movement, then continue remaining effects exactly once.

## Canonical flow

1. An authoritative source finishes its success/failure determination.
2. The server records the source result; a failure remains a failure.
3. When `forced_displacement` is reached in authored effect order, validate candidates.
4. Store `pendingDisplacement` before changing `currentSpaceId`.
5. Project owner-private destination/result information and a public waiting summary.
6. Owner accepts the deterministic destination or selects one server-issued destination if the approved source permits choice.
7. Future typed reactions, including a later Rift Anchor Spike, may act only against this matching reaction ID.
8. Server revalidates seat, source event, reaction, origin, destination, and legality.
9. Resolve the displacement once, or suppress only its component when an approved reaction later exists.
10. Resolve `remainingEffects` in authored order.
11. Mark source event resolved, clear/advance pending state, and resume the encounter.

There is no rollback after `currentSpaceId` changes.

## Actions and validation

Proposed phone intent:

```ts
type DisplacementResponseIntent = {
  type: "DISPLACEMENT_RESPONSE_REQUESTED";
  seatId: string;
  reactionId: string;
  destinationId?: string;
};
```

The phone never supplies origin, source, effect, remaining consequences, legality, or route data. The server constructs a reducer action only after authenticating the room token and seat.

Validation rejects:

- wrong room, seat, or active owner;
- no pending displacement;
- stale/unknown reaction or resolved source event;
- current sector no longer matching the authoritative origin;
- destination not in the stored server-issued set;
- destination newly illegal on revalidation;
- destination supplied for a deterministic no-choice source when it does not match;
- response after encounter/turn transition;
- duplicate submission or replay after reconnect.

## Resolution and arrival boundary

Forced displacement changes the operative sector but is not an ordinary movement roll or route journey. The first implementation must explicitly decide whether ordinary arrival encounters/challenges trigger. Recommended for the first source: **do not automatically resolve destination arrival content in the same transaction**. Store the new sector, complete the source encounter and its remaining effects, then enter the normal sector-arrival pipeline once. This avoids nested encounter resolution and duplicate Threat draws while still making the destination real.

This recommendation remains unapproved. Tests must prove that destination focus and subsequent sector resolution occur once and that the displaced source cannot redraw itself recursively.

## Reconnect and persistence

- Phone refresh and rejoin reconstruct the same pending reaction and server-issued destinations.
- TV restores only the public waiting summary.
- A response accepted immediately before disconnect remains resolved after rejoin.
- Old responses retain the stale reaction ID and are rejected.
- A saved session without the optional field loads with no pending displacement.
- A saved session with pending state resumes at the reaction, not by replaying the source effect.
- Completion clears temporary state; resolved source IDs prevent duplicate source processing.

## Projection and presentation

### Owner phone

- Source name and concise cause.
- Origin and server-issued destination name(s).
- `Accept displacement`, or destination buttons only if the approved source permits choice.
- Disabled/stale reason from authoritative validation.
- No Rift Anchor Spike control in this foundation.

### Other phones

- Non-actionable public waiting status only.
- No private inventory or future reaction eligibility.

### TV

- `Displacement pending for [operative]` while waiting.
- After resolution: `[operative] was displaced to [sector]`, or a public-safe no-move result.
- Existing board focus may show the resulting location; no new full-screen mode.

Only public sector identity may be projected. No hidden decks, future encounters, shop stock, contracts, or Rivalry information are included.

## Rift Anchor Spike future boundary

Rift Anchor Spike may later react only when `pendingDisplacement.status === "pending"` and before movement resolves. It may suppress exactly the displacement component, leave the source failure and `remainingEffects` intact, and close/advance the same pending lifecycle atomically with charge spending.

This foundation:

- does not add or spend Spike charges;
- does not change Spike acquisition;
- does not grant or remove Veil Hook;
- does not migrate existing Veil Hooks;
- does not approve Spike;
- does not expose a Spike action.

## Cross-system ordering

1. Movement/arrival and source test occur under existing authority.
2. Existing pre-roll and reroll reactions finish.
3. Source result is recorded.
4. A typed forced-displacement component opens `pendingDisplacement`.
5. Future displacement-specific reactions may respond.
6. Displacement resolves or is suppressed.
7. Other source consequences resolve in authored order.
8. Destination arrival pipeline resumes once.

Route Compass and Route Star act before ordinary movement confirmation. Void Key and Gate-Saint Key authorize their own movement boundaries. Marrow Route Key remains a failed-movement detour. Blackstar remains a failed movement/hazard consequence suppressor. None receives or accepts a displacement reaction ID.

## Required implementation tests

### Schema/content

- Supported destination model parses; unknown models fail.
- Choice flag and model agree.
- Arbitrary destinations, paths, and non-operative targets fail.
- One approved source validates; prose-only forced displacement fails validation.

### Lifecycle

- Source creates pending state before sector mutation.
- Candidate derivation is deterministic and legal.
- Accept/select resolves once and continues remaining effects.
- Failure remains recorded as failure.
- No legal destination resolves without a loop.
- Stale, wrong-seat, wrong-origin, unknown destination, and duplicate responses reject.

### Persistence

- Legacy sessions without the field load.
- Pending reaction survives serialization/reconnect.
- Accepted reaction does not replay.
- Resolved source cannot reopen.
- Remaining effects and continuation position survive reconnect.

### Projection/privacy

- Owner receives action and destinations.
- Other phones receive no controls.
- TV receives only public-safe status.
- Hidden content and Rivalry data are absent.

### Regression

- Exact-distance movement, route variants, journey, arrival focus, and tile challenges remain green.
- Void Key, Route Compass, Route Star, Gate-Saint Key, Marrow Route Key, and Blackstar retain their typed boundaries.
- Veil Hook and Rift Anchor Spike ownership remain unchanged.
- Mission lifecycle remains unchanged.

## Implementation risks

1. **Arrival recursion:** changing sectors during encounter resolution can redraw content or reopen the source.
2. **Board ordering:** “clockwise” needs a declared canonical ring order, not incidental array position.
3. **Nested pending state:** a displacement must pause and resume the exact authored effect position.
4. **Legality drift:** blockers can change after pending state opens; final validation must handle zero remaining destinations.
5. **Cross-reaction confusion:** failure, Scar, Censer, Marrow, and displacement IDs must remain non-interchangeable.
6. **Save compatibility:** optional fields are safest initially; removal/versioning is future work.

## Approval block

Displacement lifecycle:

- Destination model: **one server-derived clockwise adjacent same-ring legal sector**
- Player choice allowed: **no**
- Reaction window: **after failure is confirmed, before displacement resolves**

Rift Anchor Spike remains unimplemented and unapproved.
