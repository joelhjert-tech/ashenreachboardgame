# P8 Shared Presentation Timing

## Shared tokens

| Token | Duration | Intended behavior |
|---|---:|---|
| instant | 80 ms | interaction lock/press |
| quick | 140 ms | border, opacity, compact state |
| normal | 220 ms | tab/panel transition |
| deliberate | 360 ms | focused state entry |
| cinematic | 520 ms | reveal with readable continuity |
| heavy | 760 ms | major non-blocking emphasis |

Easing: command `cubic-bezier(0.2,0.8,0.2,1)`, impact `cubic-bezier(0.16,1,0.3,1)`, warning `cubic-bezier(0.4,0,0.2,1)`, snap `cubic-bezier(0.34,1.56,0.64,1)`, fade `ease-out`.

## Preserved feature timing

- Movement emphasis 300 ms.
- Normal route segment 520 ms.
- Cross-ring segment 680 ms.
- Arrival emphasis 760 ms.
- Dice presentation 1200 ms.
- Handoff 900 ms, non-blocking.

These remain intentionally outside generic panel timing. They present established state but never determine it.

## Reduced motion

Reduced motion removes shimmer and continuous travel, stops decorative pulses/spins, and uses immediate/fade state changes. Focus, status copy, calculations, button lock, and authoritative completion remain unchanged. Scenario carousel auto-advance and movement presentation now read the same preference hook.

## QA measurement policy

Screenshots are taken only after the authoritative fixture projection settles. These waits are test observation waits and are not application gameplay delays. Browser recordings validate that shared motion does not introduce a new acknowledgement, delay, or command dispatch.
