# Challenge Item Eligibility Audit

## Root cause of the wrong-skill bug

The phone previously combined inventory timing text and generic `canUseNow` state. `buildPhoneObjectUseStates` did not project the tested skill, and the server had only item-specific guards for a small number of battle tools. That allowed a Grit-only item to appear usable in a Command battle even though the final resolver might later reject or misapply it.

## Canonical resolver

`src/game/rules/challengeItemEligibility.ts` is now used both when projecting use states and immediately before server use. It derives the tested skill and timing from current authoritative encounter/resolution state, then checks exact ownership, equipped requirement, suppression (through the existing suppression guard), exhaustion, charges/use cost, declared skill scope, and timing.

Active test Equipment must now declare either `eligibleSkills` or explicit `eligibleTestScope: anySkill`. Canonical declarations are:

| Equipment | Timing | Skill scope |
|---|---|---|
| Black Route Fuse | before battle roll | Grit |
| Red March Warbell | before battle roll | Grit |
| Choir Lantern | before Anomaly roll | Signal |
| Mirror Reroll Token | after failed test | Guile or Signal |
| Blackstar Ampoule (both retained definitions) | after failed eligible test | explicit any skill |
| Choir Static Censer | after failed recurring Anomaly challenge | explicit any skill within its typed effect |

Movement-route, Wound/prevention, shop/action, and forced-displacement tools remain outside skill-test eligibility and retain their typed handlers. QA-only definitions remain test fixtures.

The audited 71 gear definitions comprise 40 legacy passive-shaped records, 8 typed permanent, 5 conditional, 6 consumable, 10 charged, and 2 exhaust items. Passive bonuses continue to come from exact equipped instances and never create a Use button by themselves.

## Required behavior

- A Grit-only tool is rejected for Command with: `Requires a Grit test. Current test: Command.`
- The same tool is eligible during the correct pre-roll Grit window.
- Multi-skill tools match only their listed skills.
- Any-skill behavior must be explicitly authored.
- A stale client cannot bypass the server check.
- The phone shows a compact Equipment-available prompt only when at least one server-authorized item is currently usable; invalid items remain reviewable in full Inventory with their reason.
