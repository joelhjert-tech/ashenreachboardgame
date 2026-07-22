# Motion system

## Existing tokens

| Token | Duration | Use |
|---|---:|---|
| instant | 80 ms | visibility correction |
| quick | 140 ms | control/state acknowledgement |
| normal | 220 ms | panel/card focus |
| deliberate | 360 ms | event transition |
| cinematic | 520 ms | battle/shop/scenario entry |
| heavy | 760 ms | dice or major consequence maximum |

Use the existing command, impact, warning, snap, and fade easings. Avoid arbitrary per-component durations.

## Principles

- Motion follows state and never creates it.
- Animate the smallest layer that explains the change.
- Do not replay settled progress on reconnect.
- Pause ambient animation while overlays are open or the document is hidden.
- Keep one dominant animation per transition.

## Event recipes

- Turn handoff: quick active-seat emphasis + normal context change.
- Movement: normal lift, deliberate segment, cinematic cross-ring, deliberate arrival.
- Threat: normal reveal, deliberate settle.
- Battle: cinematic chamber entry, heavy dice maximum, deliberate result.
- Shop: deliberate entry/focus/transfer.
- Wound/Scar: normal consequence; no defeat language unless defeated.
- Victory/loss: heavy takeover after authoritative terminal state.

## Reduced motion

Disable continuous travel, spin, parallax, particles, and ambient signals. Replace with quick fades and persistent labels; no information may disappear.
