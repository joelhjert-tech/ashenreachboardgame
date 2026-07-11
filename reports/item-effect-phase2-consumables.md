# Item Effect Phase 2: Consumables

## Scope correction

The 60 canonical audit rows were recounted directly: 30 Equipment and 30 Artifacts, with every ID appearing exactly once. Correct totals are 10 permanent, 27 conditional, 10 charged, 6 exhaust, and 7 consumable. The earlier eight-consumable summary was an arithmetic error. Both Black Route Fuse records remain deferred, leaving five approved Phase 2 implementations.

## Implemented consumables

| Artifact | Timing | Successful effect |
|---|---|---|
| Bell Votive Casket | Action window | Grants Veil Hook |
| Blackstar Ampoule | Reaction after a failed movement or hazard test, before failure effects resolve | Suppresses all pending failure effects; the result remains failed |
| Pale Ledger Token | Action window | Grants Pale Cartel Fixer |
| Void-Salt Poultice | Action window, while wounded | Heals one wound |
| Yard Bellframe Core | Action window | Grants Marshal Seal |

Artifact draws now grant an owned Artifact-tier consumable instead of immediately resolving the payload. The existing typed `USE_GEAR` path validates authenticated ownership and timing, resolves the typed effect, and only then removes the item. A failed validation leaves inventory unchanged. Removal is persistent game state, so reconnect cannot restore the card; a duplicate or stale use is rejected because ownership no longer exists.

## Validation and UI

Consumables require `effectModel: consumable`, explicit `activationTiming`, `consumeOnUse: true`, and a typed `consumableEffect`. Passive, equipped, and charged declarations are rejected. Phone inventory labels the effect as `One Use`, keeps inspection separate from the Use intent, displays timing, and relies on server-projected eligibility. Consumables never enter effective-stat calculations even if stale data places one in an equipped slot.

## Deferred

Both Black Route Fuse records, numeric charges and recharge, exhaust/reset windows, gate relic spending, persistent burdens, and Artifact hybrid effects remain unchanged. No balance redesign is included.
