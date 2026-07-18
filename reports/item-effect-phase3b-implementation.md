# Item Effect Phase 3B Implementation

## Scope

Phase 3B implements the three approved round-exhaust Artifacts without introducing Heat, charge, consumable, or Phase 4 behavior.

| Artifact | Final activation | Cost | Reset |
| --- | --- | --- | --- |
| Fandiablos | Use the matching support ability in its approved window. The owner may explicitly escalate to gain +2 to all five stats for the next two battle-or-hazard resolutions. | 1 Wound base; 2 Wounds only when escalation is explicitly selected | Next authoritative round |
| Mirror Reroll Token | React after a failed Guile or Signal test, before consequences, and accept the server reroll result. | 1 Salvage | Next authoritative round |
| Red March Warbell | Before a Grit battle roll, add +2 Grit to that battle. | 1 Salvage | Next authoritative round |

## State and authority

- Gear and follower definitions use `effectModel: exhaust`, `resetWindow: round`, typed effects, and typed activation costs.
- Exact owned instances carry their own `instanceId` and `exhausted` state. Duplicate copies therefore refresh and exhaust independently.
- Costs, eligibility, ownership, equipped state, pending reaction identity, and readiness are validated by the server. Rejected actions spend nothing and do not exhaust anything.
- `ROUND_COMPLETED` is the only refresh boundary. Serialization preserves exhaustion, unused ownership, pending reactions, and Fandiablos's temporary effect.

## Fandiablos temporary effect

Escalation is a distinct phone action and is never inferred from available Wounds. A successful escalated activation stores a typed `temporaryAllStatBoost` with value 2 and two remaining eligible resolutions; it does not mutate base stats. Battle and hazard resolutions consume one use each, irrespective of their internal rolls. Other actions and tests do not consume it. The state is removed after the second eligible resolution and is not restored by a round refresh.

## Mirror reaction

Mirror uses the persisted failed-test reaction boundary already established for Blackstar. Its request is bound to the current pending reaction and failed Guile or Signal test. The server spends one Salvage, performs the reroll, replaces the first result, and requires the second result to stand. A success suppresses the pending failure consequences; a failure resolves the final failure consequences. Blackstar suppression and Mirror reroll remain separate choices against the same authoritative pending window.

## Warbell compatibility cleanup

Warbell now has a typed one-Salvage activation and a battle-scoped +2 Grit modifier. Its old `heatCost` content field and player-facing instability wording were removed. No Heat, Scar, pressure, or Wound activation calculation remains.

## Phone presentation

The existing inventory surface shows Ready or Exhausted, “Refreshes next round,” cost copy, and eligibility reasons while retaining the separate inspect control. Fandiablos presents separate one-Wound and two-Wound escalation controls and shows remaining boosted resolutions. Mirror appears only against its eligible pending failure reaction and states that the second result must be accepted. Warbell shows its Salvage cost and command effect without Heat terminology.

## Tests and regression protection

Coverage exercises explicit Fandiablos activation and existing exact-instance exhaustion behavior alongside engine/client regression suites. The suites retain Blackstar pending reactions, Phase 2 consumption ordering, Phase 3A refresh behavior, passive Equipment calculations, mission lifecycle, and tier separation.

## Deferred

Numeric charges, recharge, Black Route Fuse, gate relic spending, persistent burdens, Artifact hybrids outside these approvals, and all Phase 4 balance work remain deferred.
