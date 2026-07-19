# Single-player movement debug

## Reproduction and first divergence

The failure was reproduced from the preserved pre-repair server path and locked down with a real one-phone/one-TV browser session plus the focused server integration tests.

1. Create a `single-player` standard session using Broken Seal.
2. Join one phone, select one operative and one starting Mission, mark ready, and start.
3. `SESSION_STARTED` correctly changes the authoritative phase from `start` to `navigation` for `seat-1`.
4. Before the phone can own the first movement action, `startSession()` also called `applyStartOfTurnScenarioEffects()`.
5. A Broken Seal ambient result could create an active scenario resolution or local Threat immediately.
6. The server therefore projected an opening encounter/battle at the same boundary where the reducer had opened navigation. The visible symptom was “movement locked” or “began with battle.”

The first incorrect state was not destination generation or TV animation. It was the extra scenario turn-start resolution after `SESSION_STARTED` and before the first human movement.

## State at divergence

| Field | Expected | Previous behavior |
|---|---|---|
| Session mode | `single-player` | `single-player` |
| Interaction mode | `co-op` | `co-op` |
| Turn order | `[seat-1]` | `[seat-1]` |
| Active seat | `seat-1` | `seat-1` |
| Phase | `navigation` | Navigation could be visually displaced by scenario resolution |
| Current encounter | `null` | Could be a scenario-created Threat |
| Active resolution | `null` | Could contain Scenario Pressure or a Threat reveal |
| Movement roll | absent until requested | absent |
| Pending acknowledgements | none | none; the server has no TV movement acknowledgement gate |

## Architecture discovered

Single-player is a dedicated session mode with exactly one configured seat. It is not multiplayer with a bot and does not need a synthetic operative.

- `createInitialSessionState()` creates one seat and one player.
- `interactionMode` defaults to `co-op`.
- `turnOrder` is `[seat-1]`.
- `activeSeatIndex` is `0`.
- The TV connection is never part of turn order.
- The canonical movement planner is shared with multiplayer.
- Cooperative assistance correctly has no eligible helper in single-player.
- Rivalry and Nemesis Relay paths remain excluded by their existing mode guards.

One-seat rotation is already mathematically valid: `(0 + 1) % 1 === 0`. A completed single-player turn returns ownership to the same seat and is a round wrap.

## Movement lifecycle traced

1. Phone submits `MOVEMENT_ROLL_REQUESTED`.
2. Server rolls through the canonical deterministic random source.
3. Reducer stores `MOVEMENT_ROLLED` and increments the route revision.
4. `buildMovementRoutePlan()` computes exact-distance legal routes.
5. Phone submits a destination and current route identity.
6. Server and reducer both validate ownership, phase, destination, route, and revision.
7. Server resolves the route check and emits `MOVEMENT_RESOLVED`.
8. Reducer commits location, clears movement state, and opens the movement result presentation.
9. TV animates the already-authoritative route locally. It does not acknowledge or advance gameplay.
10. Continue actions close the movement result and enter the destination sector lifecycle once.
11. Tile challenge, encounter, named action, or normal action follows.
12. Broadcast completion rotates index `0` back to `0`; scenario turn-start pressure then belongs to the new turn boundary.

## Other failure classes audited

- No empty or duplicated single-player turn-order entry was found.
- No host/TV identity is inserted into turn order.
- No “all connected players” wait owns movement.
- No server-side TV animation acknowledgement exists, so a missing TV cannot deadlock movement.
- Rejected destination requests leave the stored movement roll and planner revision intact.
- Phone and TV projections rebuild from authoritative state after reconnect.
- A genuine zero-route planner result previously had no explicit completion path; this was a separate confirmed deadlock risk and is repaired.

## Skill documentation note

The gameplay skill referenced `docs/ASHENREACH_RULE_SPINE.md` and `docs/ASHENREACH_CARD_ECONOMY_SPINE.md`, but neither file exists in this checkout. Current committed engine/server behavior and tests were therefore used as authority.
