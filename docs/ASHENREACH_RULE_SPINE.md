# Ashen Reach Rule Spine

Ashen Reach uses Talisman for the table feel and Relic for the rules engine.

## Design Thesis

Players should wander into danger, leave board memory behind, grow through trophies, contracts, gear, and artifacts, then decide when they are ready to risk the inner ring and final scenario core.

The board should not hand out clean rewards just because a pawn landed on a space. A sector should reveal pressure first. If the threats are cleared, the sector text becomes available.

## Turn Structure

The current engine maps the desired turn spine like this:

1. Command pressure: start-of-turn scenario and character hooks.
2. Movement: move through authored adjacency only.
3. Exploration: sector threat icons determine missing red, blue, and yellow pressure.
4. Engagement: resolve visible cards in fixed order.
5. Recovery and experience: sector text, gear, contracts, trophies, artifacts, and stat raises.
6. Escalation: end-of-turn pressure, scenario clocks, collapse, and nemesis movement.

## Threat Colors

Red is hostile contact: combat enemies, warbands, beasts, ambushes, and elite guards.

Blue is void anomaly: signal ghosts, broken relic engines, corruption events, reality damage, and strange tests.

Yellow is rogue salvage: traps, locked vaults, smugglers, unstable loot, shortcuts, and bargains.

## Sector Rules

Every sector should have:

- `tags`: board-game function such as shop, shrine, hazard, anomaly, salvage, contract, movement, artifact, nemesis, or scenario.
- `threatIcons`: the pressure icons that drive exploration.
- `ruleText`: the table-facing rule summary.
- `loreText`: one short line that makes the space memorable.
- `textBox`: the rules-backed action that resolves once the sector is clear.

Outer sectors should usually have 0-1 icons, middle sectors 1-2, inner sectors 2-3, and the core should be scenario-defined.

## Progression

Progression has three lanes:

- Trophies: defeated enemies become trophy value and trophy pile entries for stat growth.
- Contracts: directed objectives that eventually unlock artifacts or faction advantages.
- Salvage and gear: shop, repair, upgrade, charge, and risk economy.

This keeps combat, clever route play, and support/shop play all viable.
