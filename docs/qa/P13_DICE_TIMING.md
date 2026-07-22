# P13 Dice Timing

## Implemented presentation timing

| Stage | Duration | Gameplay blocking |
|---|---:|---|
| Immediate phone input lock | same event turn | No; prevents duplicate local tap |
| Server-visible roll stage | existing 650 ms server lifecycle | Existing behavior, unchanged |
| Dice tumble/settle | 780 ms | No |
| Per-die visual stagger | 70 ms | No |
| Arithmetic reveal | 240 ms, starting at 720 ms | No |
| Local animation flag cleanup | 980 ms | No |
| Reduced-motion reveal | no tumble; optional 140 ms opacity feedback | No |

The server may advance or project follow-up state while the local presentation completes. The component never delays a reducer, command, destination, battle outcome, or Continue action.

## Animation stages

1. Ready: blank/pending physical faces and explicit dice count.
2. Submitting/rolling: command remains locked; no fake numeric face.
3. Result receipt: authoritative face values enter the mounted component.
4. Tumble: transform/opacity only.
5. Settle: every die finishes at an upright, untransformed value.
6. Math: raw total, modifiers, final value, target, and outcome appear.
7. Handoff: existing movement/battle state remains authoritative.

## Browser observations

- Stable-result screenshots wait 1,100 ms so they audit the readable settled state.
- Recordings preserve the ready-to-result transition.
- Reconnect captures mount directly in the settled state and do not wait through the tumble.
- No animation frame changes the displayed numeric value or sends a command.
- Repeated fixture transitions did not accumulate visible dice elements or console errors.

## Performance boundary

The implementation uses DOM, CSS transforms, and opacity. There is no canvas, physics engine, Three.js dependency, particle loop, or board-wide per-frame state update. Each component owns one timeout that is cleared on revision change and unmount.
