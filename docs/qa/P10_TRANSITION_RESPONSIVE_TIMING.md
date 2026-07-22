# P10 Transition and Responsive Recovery — Timing

## Movement presentation

| Beat | Normal motion | Reduced motion | Authority |
|---|---:|---:|---|
| Initial route emphasis | 300 ms | 90 ms | Local presentation of projected route |
| Normal segment | 520 ms | Jump to final step | Local presentation only |
| Cross-ring segment | 680 ms | Jump to final step | Local presentation only |
| Destination arrival | 600 ms | 160 ms | Local presentation of authoritative destination |

The only production timing changed in P10 is destination arrival, from 760 ms to 600 ms. The evaluated target was 350–650 ms. No gameplay command, encounter creation, resolver, or projection waits on these values.

The screenshot harness supports `qaArrivalHold=1` only in development. It extends the local arrival render to 10 seconds so high-resolution PNG capture cannot consume the transient evidence window. Canonical route recordings do not use this query and therefore prove the normal 600 ms behavior.

## Harness timing

- P2 now begins watching for arrival before capturing the final route frame, then waits for semantic `data-movement-stage="arrival"` and eventual detachment.
- P2 completed consecutive full runs before the final screenshot extension, and the final 1366/1600/1920 run completed with 61 screenshots, four recordings, and zero browser errors.
- P3 completed two consecutive 84-capture runs. It waits for visible artwork to resolve to either `ready` or the canonical `failed` fallback.
- Shop purchase response in the final P6 run: 357 ms.
- P5 fixture acknowledgements remained in the low tens of milliseconds; focus follows the projected setup revision rather than a fixed delay.

## Replay behavior

The arrival key is derived from the authoritative movement event. A completed key is retained locally for the mounted TV surface so a later encounter projection cannot reopen it. Reconnect mounts from the current authoritative state and proceeds to the current encounter/required action without issuing or repeating movement.
