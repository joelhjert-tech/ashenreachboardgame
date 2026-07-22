# Dice motion specification

## Sequence

1. Request: dice rest with one named command.
2. Roll: 520–760 ms authored motion; server result already authoritative but hidden until settle.
3. Settle: value snaps into stable result within 140 ms.
4. Calculate: `effective stat + die + modifiers = total` appears once.
5. Outcome: result and consequence replace the transient roll emphasis.

## Rules

- Movement dice use `MOVEMENT`, never attack/defence labels.
- Enemy dice roll once on the server and never reroll after reconnect.
- Helpers contribute base stats, not dice.
- Animation neither starts nor completes server resolution.
- Reduced motion uses a 140 ms value crossfade and preserves every number.

## Sound hooks

Expose start, impact, settle, reroll, success, failure, and tie. Play only approved local assets and respect mute.
