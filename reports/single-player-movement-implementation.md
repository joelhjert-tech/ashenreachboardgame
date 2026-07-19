# Single-player movement implementation

## Result

Single-player remains a one-human session. No bots were added.

The opening turn now belongs exclusively to navigation. Scenario turn-start pressure begins only after the first completed operative turn, matching the existing end-turn lifecycle.

## Repairs

### Opening ownership

`GameRoomServer.startSession()` no longer applies scenario turn-start pressure immediately after `SESSION_STARTED`. It still triggers legitimate operative turn-start abilities. Scenario pressure remains active through `completeBroadcastTurn()` for every subsequent turn.

### Zero legal destinations

The server now evaluates the canonical route plan immediately after the authoritative movement roll. If the plan contains no legal destinations, it emits `MOVEMENT_UNAVAILABLE_RESOLVED`.

That reducer action validates:

- active seat ownership;
- navigation phase;
- source sector;
- stored movement value;
- current canonical planner result;
- absence of any legal route.

It then keeps the operative in place, clears movement roll/adjustment/Route Star state, records an append-only result, and opens the normal action phase. It cannot be used while a route remains legal or replayed from stale state.

### Development diagnostics

`RoomExecutionServices` now accepts an optional structured `onMovementDiagnostic` sink. Live development logging is enabled only with `ASHEN_REACH_MOVEMENT_DEBUG=1` outside production.

Events cover:

- session started;
- movement rolled;
- no movement available;
- destination selected;
- movement committed;
- turn completed.

Diagnostics include authoritative sequence, phase, active seat, turn order, source, movement value, legal destination IDs, selected destination, route, and pending owner seat IDs. They contain no private Rivalry content.

## Before and after

Before:

`SESSION_STARTED -> navigation + immediate scenario pressure -> possible encounter/battle before first movement`

After:

`SESSION_STARTED -> navigation -> roll -> choose -> commit -> arrival -> resolve -> end turn -> scenario pressure -> same seat navigation`

## Reconnect

- Movement choice is rebuilt from the stored roll and route revision.
- A rejected destination does not consume or disable the prompt.
- Reconstructed `GameRoomServer` instances preserve the same player, route ownership, phase, and projection.
- TV journey animation remains presentation-only and cannot duplicate arrival.

## Ten-turn smoke test

`singlePlayerMovementLifecycle.test.ts` completes ten deterministic exact-distance movement turns on a controlled two-sector fixture. It reconstructs the server before turns nine and ten to exercise reconnect normalization.

After every turn it proves:

- exactly one active player;
- `activeSeatIndex === 0`;
- `turnOrder === [seat-1]`;
- navigation returns to the same player;
- movement state is cleared;
- no current encounter or active resolution is orphaned;
- phone and TV agree on active ownership;
- movement selected and committed exactly once.

The fixture marks each sector stabilized to suppress unrelated escalating scenario collapse during this ten-turn movement endurance check. Scenario pressure behavior remains covered by the scenario integration suite.

## Multiplayer regression boundary

No multiplayer turn-order, movement planner, gate, assistance, privacy, encounter, or acknowledgement logic was replaced. The new no-route event uses the same planner for every mode and can only resolve when that planner proves the route set empty.

## Files changed by this pass

- `src/game/engine/actions.ts`
- `src/game/engine/reducer.ts`
- `src/game/engine/__tests__/engine.test.ts`
- `src/server/roomServer.ts`
- `src/server/__tests__/singlePlayerMovementLifecycle.test.ts`
- `scripts/capture_single_player_movement_qa.py`
- `reports/single-player-movement-debug.md`
- `reports/single-player-movement-implementation.md`
- `reports/ui/single-player-movement-qa-index.md`

Existing uncommitted phone-battle, styling, and scenario-test work was preserved. Nothing was committed or pushed.

## Four-seat critique

### New player

The first visible action is now Roll Movement, not an unexplained battle. Zero-route cases explain that movement ended without changing sector.

### Optimizer

Stale or illegal destinations are rejected without consuming movement. The authoritative route revision and reducer validation prevent a second move or stale replay.

### Family/casual player

Rejected choices and reconnects return to an actionable state. Scenario pressure appears between turns rather than unexpectedly replacing the opening instruction.

### Rules lawyer

Single-player uses the same roll, exact-distance planner, route validation, gate requirements, arrival order, and append-only actions as multiplayer. Only nonexistent participant dependencies are absent.

## Remaining limitations

- The ten-turn automated fixture isolates movement endurance from scenario defeat pacing; it is not balance evidence.
- Browser QA exercised one real arrival battle and a fixture-projected second navigation turn. Server tests provide the ten-turn endurance proof.
- No bots or multi-operative solo policy was introduced.

## Verification

- `npm.cmd run validate:content`: passed (18 characters, 71 gear, 109 Threats, 36 Contracts, 20 Anomalies, 30 Artifacts, 24 Followers, 24 Scars, 16 Escalations, 30 Afflictions).
- `npm.cmd run typecheck`: passed.
- Focused movement/server/scenario suite: 80/80 passed.
- `npm.cmd run test:engine`: 756/756 passed after updating the legacy explicit-roll fixture to include a legal one-step route.
- `npm.cmd run test:rules`: 58/58 passed.
- `npm.cmd run test:integration`: 328/328 passed.
- `npm.cmd run test:client`: 369/369 passed.
- `npm.cmd run test`: 1,453/1,453 passed.
- `npm.cmd run audit:assets`: 435/435 present; zero missing, invalid, placeholder, or release-blocking assets.
- `npm.cmd run build`: passed (541 modules transformed).
- Browser QA: 16 screenshots, zero console/page errors, zero horizontal overflow.
- `git diff --check` and `git diff --cached --check`: passed.
