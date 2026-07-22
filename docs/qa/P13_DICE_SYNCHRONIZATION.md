# P13 Dice Synchronization Evidence

## Authority path

1. The active phone sends the existing typed Roll intent once.
2. `RoomServer` validates ownership, phase, timing, and replay/stale state.
3. `src/game/engine/dice.ts` returns the server result through the existing random source.
4. The event log records ordered faces and totals.
5. State reducers store the movement/check/battle result.
6. Phone and TV projections publish presentation-safe values.
7. Clients render those values; they never choose a face.

## Phone/TV agreement

Focused projection tests prove that phone and TV receive the same recorded movement face, raw total, modifier, final value, stable resolution ID, ordered battle faces, and reroll history. Browser fixtures show the same movement value 1 and battle roll 3 + 4 / final 12 on both surfaces.

## Dice count

The current canonical check/battle resolver rolls two six-sided dice. `BattleSidePresentation.diceCount` is projected by the server before faces exist, preventing a client fallback from advertising one die. Fixed-difficulty opposition has count zero. Movement count and faces come from the authoritative movement event; the existing special movement rule remains unchanged.

## Reconnect

The presentation component only animates a mounted null-to-result transition for the same resolution ID. A reconnect mounts with authoritative values already present, so the result is stable immediately. It does not resend Roll, reroll, cost, reward, or consequence actions.

## Reroll history and privacy

The server derives previous ordered faces from matching append-only check/reroll events and publishes rerolled indices. TV receives public face history but not the owner `soloReroll` action or private resource balance. The waiting-phone browser check rejects any exposed owner Roll/reroll control.

## Stale and repeated state

- Immediate local submission state blocks repeat taps while awaiting the server.
- Existing server validation remains the canonical duplicate/stale protection.
- Repeating an identical settled projection does not create a new result signature or animation.
- Changing resolution ID/revision clears prior local animation state.
- Animation timeout cleanup prevents stale callbacks after unmount.

## Gameplay invariants checked

- `src/game/engine/dice.ts` is unchanged.
- No `Math.random()` was added to P13 client files.
- No save schema or version field changed.
- No movement planner, battle formula, modifier, reroll eligibility, cost, resource, or outcome calculation changed.
- Fixed opposition is displayed as fixed rather than as an unrolled die.

## Deterministic QA

The QA endpoint constructs isolated authoritative server fixture states. The capture script records the exact visible face values, target viewport, overflow, and reduced-motion preference in `docs/qa/p13-dice/capture-results.json`. It does not write client-local result values.
