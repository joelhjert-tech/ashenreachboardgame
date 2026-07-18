# Encounter lifecycle repair

## Canonical flow

1. Session starts without an encounter.
2. The active operative rolls and selects an authoritative route.
3. The server completes movement at the final destination.
4. Arrival challenges/text run in their existing order.
5. The server creates the required encounter.
6. The current resolution applies its authored result and reward exactly once.
7. Cleanup removes `currentEncounter` and `activeResolution` once.
8. A real canonical destination may open its normal action window; scenario confrontation and generic/test sectors retain their existing broadcast behavior.

Intermediate visual movement steps never invoke the resolver.

## Root cause and correction

The old successful-encounter continuation path inspected the remaining printed Threat deck. If any card remained, it returned to `sector`, causing automatic sector processing to draw again. This conflated deck inventory with an authored multi-encounter queue and could overwrite the first result, making its Salvage appear missing.

`getPhaseAfterResolution` now:

- requires a successful current encounter and active operative;
- requires an actual canonical board-space definition;
- excludes the scenario confrontation;
- returns directly to the destination action window without re-entering sector processing;
- otherwise preserves the existing broadcast/end-turn path.

No queue, card, reward, or rule content changed.

## Queue invariant

- A completed encounter identity cannot remain active.
- Remaining cards in a sector deck are inventory, not an immediate queue.
- Another encounter begins only from a separate authoritative trigger or authored sequence.
- Animation callbacks cannot draw or resolve cards.
- Reconnect restores the post-resolution state and cannot reapply reward events.

## Reward proof

The focused live regression uses an authored enemy with `gain_salvage: 1`. It proves balance `2 -> 3`, one `COMBAT_RESOLVED`, one `RESOLUTION_APPLIED`, zero subsequent `ENCOUNTER_DRAWN`, unchanged queued deck content, and identical restored balance. A repeated Continue request is rejected.

## Compatibility

Save version remains 2. Legacy v0–v2 import behavior and legacy pending enemy-roll normalization are unchanged. No Heat mechanic, threshold, metadata, or projection was introduced.
