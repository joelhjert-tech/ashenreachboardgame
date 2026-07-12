# Scar-Sink Prayer Charged Artifact Implementation

Implementation date: 2026-07-12

## Implemented rule

Scar-Sink Prayer uses **Admit the Fear** exactly as approved. During the owner's authoritative pending Scar consequence, the phone may select one server-provided typed effect and spend one charge to ignore it. All remaining effects resolve in deterministic queue order. The Scar remains owned and the trigger source remains recorded.

## Charge state

The Artifact uses the shared exact-instance charged-item model: 2 maximum charges, 2 starting charges, 1 charge per activation, and no recharge. Valid uses transition 2/2 to 1/2 to 0/2. Invalid, stale, wrong-seat, wrong-instance, and depleted requests spend nothing. Duplicate copies retain independent charge state, while a completed reaction ID cannot be reused.

## Pending consequence integration

The request carries the reaction ID, Scar instance ID, Artifact instance ID, and selected typed effect ID. The server revalidates all four against `pendingScarConsequence`. It never parses Scar prose or splits atomic composite effects. After suppression, remaining effects resolve and the next queued consequence becomes active.

Serialized pending consequences and exact owned-item charge state already participate in session parsing and private reconnection projection. Reconnect therefore reconstructs the same choices and never refills charges or reopens a resolved source event.

## Presentation

The owning phone shows each server-provided choice as **Ignore this effect — 1 charge**, plus **Accept consequence**. Inventory presentation uses the catalog name Scar-Sink Prayer, charge count, no-recharge status, and the approved rule. Public outcome feedback is limited to **Scar-Sink Prayer — One Scar consequence suppressed.** Private choices and remaining charges are not added to TV projection.

## Interaction boundaries

Prayer does not share state with Mirror, Blackstar, or Choir Static Censer. It accepts only Scar reaction IDs. It does not change Scar acquisition, passive restrictions, recurring trigger eligibility, mission completion, battle, movement, or anomaly resolution.

## Tests

Focused coverage protects exact-instance charge spending, selected-effect suppression, remaining-effect resolution, queue advancement, duplicate rejection, Scar persistence, schema metadata, and reconnectable private/public projection boundaries inherited from the Scar trigger lifecycle.

## Deferred charged Artifacts

Oathchain Lens, Rift Anchor Spike, and Route Star remain deferred. No other charged Artifact changed in this slice.
