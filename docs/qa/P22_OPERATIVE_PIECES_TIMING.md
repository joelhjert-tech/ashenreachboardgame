# P22 Operative Pieces Timing

## Production timings

| Beat | Duration | Source |
|---|---:|---|
| Departure lift | 300 ms | `hostPresentationTimings.movementStartMs` |
| Ordinary route segment | 520 ms | `hostPresentationTimings.movementSegmentMs` |
| Cross-ring route segment | 680 ms | `hostPresentationTimings.movementCrossRingMs` |
| Arrival hold | 600 ms | `hostPresentationTimings.movementArrivalMs` |
| CSS cinematic transform | 520 ms token | Existing shared motion token |

The longer 680 ms duration is calculated against the exact next canonical route sector, so it applies to the ring-crossing segment itself.

## Ordering

```text
server-confirmed destination
→ departure
→ route sector(s)
→ destination
→ arrival
→ encounter/result focus
```

Focused fake-timer tests verify the sequence, the ordinary and cross-ring durations, one arrival, cleanup, synchronization gating, and reconnect suppression.

Animations never delay or trigger server resolution. A newer authoritative revision or unmount clears the pending timeout through React effect cleanup.

## Reduced motion

Reduced motion immediately presents the authoritative destination and arrival state, holds it briefly for readability, and removes lift, travel rotation, pulse, and animated environment scaling. Information and destination are identical.
