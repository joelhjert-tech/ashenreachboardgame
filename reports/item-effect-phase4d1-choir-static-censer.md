# Phase 4D1 — Choir Static Censer Implementation

## Approved rule

**Static Intercession** — Reaction: After you fail a recurring Anomaly Challenge, but before its failure effects resolve, spend 1 charge to ignore one pending failure effect from that challenge. The test still counts as failed, and any remaining failure effects resolve normally.

- Maximum / starting charges: 2 / 2
- Cost: 1 charge
- Additional cost: none
- Recharge: none
- Scope: owner only; the exact owned Censer must be equipped
- Timing: after the final failed result, before anomaly failure effects resolve

## Authoritative lifecycle

The owning phone receives server-derived, indexed choices for the still-pending top-level failure effects. A use request binds the seat, exact item instance, pending tile-challenge resolution ID, and selected effect index. The server revalidates the final failed anomaly state, ownership, equipped state, charge balance, resolution identity, and choice before dispatching one atomic `USE_GEAR` action. The reducer removes exactly the selected pending effect and spends exactly one charge. Invalid, stale, wrong-seat, depleted, or duplicate requests change neither effects nor charges.

The failure result remains false for mission and scenario progress. Suppression does not detach, defeat, transfer, or otherwise mutate the recurring tile challenge. A sequence retains all unselected effects; suppressing a single available effect leaves no pending failure effect.

## Charge state and reconnect

Acquisition and one-time legacy normalization use the shared charged-Artifact model: `2/2 → 1/2 → 0/2`. Duplicate instances retain independent balances, but the event log prevents a second Censer instance from affecting the same challenge resolution. Pending challenge identity, server-provided choices, and owned-instance charges are projected from persisted authoritative state after reconnect. No round, reconnect, mission, shop, scenario, or battle transition recharges the item.

## Reaction ordering and interactions

1. Choir Lantern may add its test-scoped `+2 Signal` before an eligible anomaly Signal roll.
2. The authoritative roll resolves.
3. Mirror may reroll an eligible failure before it becomes the final result.
4. If the final anomaly result remains failed, Static Intercession may suppress one pending failure effect.
5. All remaining failure effects resolve normally.

Blackstar's failed movement/hazard window explicitly excludes persistent tile challenges, so it does not compete with Static Intercession. Static Intercession adds no Signal modifier, performs no reroll, and cannot convert failure into success.

## Phone and TV presentation

The inventory uses the shared charged-item presentation for `Charges X/2`, `No Recharge`, and `Depleted`, while retaining separate artwork and lore inspection. During the exact eligible window, the phone presents each server-provided consequence as **Ignore this effect — 1 charge**, plus **Accept all failure effects**. Confirmation and the updated charge balance arrive through the authoritative projection.

TV presentation continues to use the existing tile-challenge focus. The public outcome summary is **Static Intercession — One anomaly consequence suppressed.** Remaining private charges and private choice details are not projected to TV, and no new focus mode was added.

## Test coverage

- Charged catalog metadata, timing, typed effect, and no-recharge validation.
- Owner-private failure-effect choices for a final failed anomaly.
- Exact one-effect suppression with all remaining effects preserved.
- Failed result and recurring anomaly persistence.
- Atomic exact-instance charge spending and independent duplicate balances.
- One Censer activation per challenge resolution.
- Phone consequence selection and accept-all action.
- Existing Choir Lantern, Mirror, Blackstar, tile-challenge, mission, consumable, exhaust, and charged-Artifact regressions remain covered by the full suites.

## Deferred charged Artifacts

- `artifact-heat-sink-prayer` (Scar-Sink Prayer)
- `artifact-oathchain-lens`
- `artifact-rift-anchor-spike`
- `artifact-route-star`
