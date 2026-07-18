# Relic Economy Crosswalk

## Scope and evidence

This crosswalk uses the supplied Relic benchmark and the repository's existing comparison material as structural evidence. It does not reproduce Relic card text, names, lore, art, or exact effects.

| Concern | Confirmed Relic structure | Ashen Reach adaptation | Intentional difference |
|---|---|---|---|
| Ordinary currency | Influence starts at 3 and is gained from victories, missions, abilities, and spaces; it pays for Wargear, services, and explicit costs. | Salvage starts at 3 per operative (4 solo), pays for normal Equipment, services, and typed payments. | Salvage losses are explicitly floor-zero; pay/spend gates require the full amount. |
| Enemy progression | Defeated enemies become Trophies whose value buys character growth. | Eligible defeated enemy cards create owned Trophy-pile entries and numeric Trophy value. Stat advancement costs the next stat value. | Partial Trophy cards retain unspent value rather than forcing exact-value bundles. |
| Mission progression | Completed Missions are retained; three can be exchanged for a two-card Relic choice. | Completed Contracts are archived by stable ID; exactly three buy an owner-private two-Artifact choice. | Contracts are spent only when the chosen Artifact is accepted, making reconnect and cancellation safe. |
| Resource separation | Influence, Trophies, and completed Missions are not substitutes. | Salvage, Trophies, and completed Contracts have separate typed state and server commands. | Artifacts are also non-sellable, preventing a Contract-to-Salvage conversion. |

## Reusable design principles

- Ordinary currency creates frequent immediate trade-offs.
- Enemy victories should advance the operative without making combat the only income route.
- Long-term mission proof should unlock rare rewards, not pay ordinary prices.
- Resource identity must remain visible in rules, storage, transaction timing, and UI.
- Scarcity should push route choice and risk-taking without routinely making the first shop irrelevant.

## Ashen Reach terminology

The canonical terms remain **Salvage**, **Trophies**, **Completed Contracts**, **Equipment**, and **Artifacts**. Relic terminology is benchmark-only.
