# Ashen Reach Threat Revisions — Phase B2B Shattered Barricade

## Implemented stable ID

- Stable ID: `shattered-barricade`
- Identity retained: Red Hazard, Forge 7, outer/common, severity 2, existing artwork path, lore, success note, deck membership, and one-card count.
- Previous duplicate pattern: the same Forge 7 note-on-success / 1 Wound-on-failure structure used by the Family D cluster.
- Final approved rule: **“The breach broadcasts your position. Advance Global Escalation by 1.”**
- Timing: immediate failed Hazard resolution only. Success still records the existing clear-breach route note and does not advance escalation.
- Direct consequences: no Wound, Scar, Salvage, equipment, movement, mission, Contract, scenario-progress, shop, or item mutation.

## Authoritative shared-state path

The phone submits only the existing check request and continue intent. The server owns the roll, Forge 7 result, selected failure effect, card ID, requested `+1`, current shared level, bounded applied delta, resulting level, and source event.

`CHECK_ROLLED failure → RESOLUTION_APPLIED → feedEscalation → ESCALATION_ADVANCED → existing collapse check`

The encounter reducer deliberately does not mutate Global Escalation directly for this card. After its normal resolution is accepted and cleared, the room server routes the approved delta through the existing shared escalation lifecycle. `ESCALATION_ADVANCED` validates the resulting level and modifier from authoritative state before committing it.

## Threshold and cap behavior

- The existing escalation modifier continues to change at every two levels.
- Multiplayer collapse remains 6; single-player collapse remains 8.
- The global lifecycle clamps to the active mode's collapse level. The action records the actual applied delta, so an already-capped reconstructed active snapshot reports `+0` rather than overflowing.
- Reaching collapse emits exactly one existing `SECTOR_COLLAPSED` consequence and ends the session. The card does not define or manually invoke a second threshold rule.

## Duplicate-source protection

The source event is derived from the authoritative failed `CHECK_ROLLED` resolution identity and suffixed with `global-escalation`. Accepted source IDs are stored in `resolvedEscalationSourceEventIds`, which is part of serialized session state but is not projected to phones or TV.

The reducer rejects a mismatched card, wrong seat, non-failure source, forged source ID, forged amount/result/modifier, or previously processed source. Sequential socket handling plus the persisted ledger prevents repeated phone submission, reconnect, stale delivery, reducer replay, duplicate projection, or another seat from applying the same card failure twice.

## Phone and TV presentation

No new control or focus mode was added. Both surfaces continue to receive the same public `escalationLevel`, threshold, modifier, outcome summary, and existing result-delta presentation. The sourced result adds:

- `Global Escalation +1`
- `Global Escalation is now N`

Internal source card/event fields and the deduplication ledger are not projected. Existing collapse presentation owns threshold failure feedback, avoiding a duplicate card-specific banner.

## Validation and tests

Focused stable-ID coverage proves:

- the exact approved card definition, unchanged Red/Hazard/Forge 7 identity, and unchanged 26 Red / 35 Blue / 48 Yellow / 109 total distribution;
- failure-only `+1`, preserved success note, and no unrelated personal or scenario mutation;
- wrong-seat, stale-source, forged-delta, forged-result, duplicate-source, and replay rejection;
- one shared value across acting phone, other phones, TV, and reconnect reconstruction;
- ordinary increase, modifier-threshold transition, multiplayer collapse, and capped actual-delta behavior;
- B2A Salvage-loss and forced-displacement definitions plus the blocked Heat-linked duplicate cards remain unchanged.

The existing live socket regression continues to reject phone spoofing of `ESCALATION_ADVANCED`, including client-supplied amount and final value.

## Playtest risks

- Rivalry players may intentionally fail a common outer Red Hazard to pressure the whole table. Track whether that creates interesting shared risk or excessive kingmaking.
- A failure that reaches collapse ends the session immediately through the existing lifecycle; confirm the public result cadence makes the card source clear without delaying collapse feedback.
- At modifier thresholds, verify players understand that the card advanced the public track and that the increased check difficulty applies only to later checks.
