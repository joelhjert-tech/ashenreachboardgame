# Authoritative Scar trigger lifecycle implementation

## Scope

This commit adds a general server-authoritative trigger pipeline. It does not implement Scar-Sink Prayer, prevention, Scar removal, rollback, equipped Scars, Heat, or new balance rules.

## State and identity

`pendingScarConsequence` stores a stable reaction ID, owner seat, derived owned-Scar instance ID, Scar card ID/title, typed trigger, source-event ID, typed effect choices, creation time, and status. A persisted queue prevents one Scar from overwriting another. `resolvedScarSourceEventIds` rejects duplicate trigger processing.

Legacy states omit all three fields safely because the schema treats them as optional and runtime uses empty defaults.

## Resolution flow

1. An authoritative server event supplies a typed `ScarSourceEvent`.
2. `SCAR_TRIGGER_EVENT` is an internal engine action and is not accepted as a client intent.
3. Owned Scars are matched through the explicit catalog.
4. Matches sort by authored priority, then stable derived instance ID.
5. Immediate effects resolve once.
6. Reactable effects enter the persisted queue before resolution.
7. The owning phone may submit `CONTINUE_SCAR_CONSEQUENCE` with the exact reaction ID.
8. The reducer revalidates seat and ID, applies the typed effects once, advances the queue, and closes the state.

No effect is rolled back. Event-log entries are history, while pending state is authoritative.

## Wound-threshold recall

The existing transaction still appends exactly one selected Scar and recalls the operative. After insertion, it submits an `onScarGained` source event to the lifecycle. No present card matches that trigger, so existing outcomes remain unchanged. Duplicate threshold handling remains protected by the existing server flow; the lifecycle additionally deduplicates source-event IDs.

## Projection and UI

- Owner phone receives Scar title, trigger, reaction ID, source ID, typed effect summaries, and Continue.
- TV receives only a public waiting summary containing seat and Scar title.
- Other phones receive no private pending consequence.
- The phone reuses its existing action panel; no new focus mode or broad UI was added.

## Reconnect and ordering

Pending state and queue are schema-backed and survive JSON/session reconstruction. Multiple Scar reactions are ordered by priority then owned-instance identity. Stale, wrong-seat, duplicate-source, and duplicate-Continue attempts reject without applying effects.

## Tests

Focused tests cover catalog completeness, explicit blocked cards, immediate resolution, pending resolution, reconnect serialization, stale/wrong-seat/duplicate rejection, deterministic multi-Scar queueing, public/private projection separation, legacy-state parsing, and wound-threshold Scar acquisition.

## Deferred work

- Exact source-event adapters and first-eligible usage state for each supported Scar.
- Typed choice models for the eight blocked cards.
- Scar-Sink Prayer approval against `pendingScarConsequence` after those gates are reviewed.

Scar-Sink Prayer remains unimplemented.
