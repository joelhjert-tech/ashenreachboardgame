# Live-play flow audit

## Scope and verdict

The live multiplayer checkpoint is ready for draft-PR review after its closure fixes. Tests and deterministic browser-assisted sessions establish authority and state-transition correctness; they are not a substitute for human full-session pacing playtests.

## State matrix

| State | Join effect | Current play effect | Recovery |
|---|---|---|---|
| Move/navigation | Reserve/setup privately | Route and current seat remain unchanged | Pending join reloads from v2 |
| Movement/resolution | Reserve/setup privately | Journey/resolution remains authoritative | No animation or effect replay |
| Tile/action | Reserve/setup privately | Pending effect and owner remain unchanged | Reconnect restores exact pending state |
| Shop | Reserve/setup privately | Buyer, stock, and transaction remain unchanged | Joiner cannot submit buyer actions |
| Battle/reaction | Reserve/setup privately | Fighter, reaction owner, and enemy roll remain unchanged | Enemy roll is not repeated |
| Broadcast/end-turn | Reserve/setup privately | Existing transition finishes normally | New seat acts only at appended turn position |

## Cross-system findings

- Operative uniqueness is checked across occupied, non-kicked seats.
- Starting missions are server-generated per selected operative and selected from the exact offered stable-ID set.
- The mission artwork inspector and mission selection remain independent controls.
- Normal starting economy is generated once; reconnect does not duplicate Salvage, Equipment, followers, notes, Contract state, or trophies.
- Phone tabs follow projected phase. An owned Battle may override the normal tab only for its owner.
- TV movement, compact arrival, centered shop results, battle totals/winner, active-operative emphasis, and player-name-first presentation remain intact from `2046b25`.
- Co-op scenario selection remains available.
- Single-player, ended, full, and Nemesis Relay admission boundaries remain enforced.

## Defects found and fixed

1. **Client-authored seat request:** the public join API still accepted an optional `seatId`. It is now rejected, and the server always assigns the authoritative first open configured seat.
2. **Abandoned reservation pressure:** a disconnected unfinished join could hold the last seat. The Host Phone can now cancel that pending reservation without kicking the configured slot.
3. **Full-room retry clarity:** the rejected phone retained an actionable Join button. It now displays a disabled `Room Full` action until join input changes.

## Four critique seats

### New player

Join Game is discoverable; operative selection, mission selection, and final join are staged privately. The TV shows a pending public seat without leaking choices. The completed player waits until turn order reaches them.

### Optimizer

The last-seat race has one server winner. Client-selected seats, stale operative choices, duplicate completion, enemy rerolls, and setup-resource reconnect farming are rejected or restored idempotently. A host can release an abandoned unfinished reservation.

### Family/casual player

The current table is not interrupted: play continues while the newcomer completes setup. The joiner sees one setup task at a time and receives an explicit full-room result.

### Rules lawyer

The seat is reserved at successful HTTP join, becomes active only when final setup confirmation appends it to `turnOrder`, owns its token throughout, and survives v2 reload. Host Phone authority remains with the original setup seat and never transfers to a late joiner.

## Deferred evidence

- Human full-session pacing with 2–4 physical phones remains a playtest activity.
- Policy for automatic expiration of an abandoned reservation is not introduced; explicit pending-player leave or Host Phone cancellation is authoritative and testable.
- No catch-up resources are added. Any future catch-up rule requires a separate balance decision.
