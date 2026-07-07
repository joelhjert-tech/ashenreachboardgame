# Ashen Reach Item Function vs Relic Gameplay Audit

Date: 2026-07-07

Scope: gear, weapons, armor, followers, artifacts/relics, scars/afflictions, active item use, passive modifier sources, phone inventory presentation, and TV/phone formula display.

## Summary

Ashen Reach already has the core Relic-style separation in place:

- Gear content covers weapons, armor, utilities, consumables, follower-linked tools, contract objects, dangerous active weapons, and charged artifacts.
- Server-authoritative `USE_GEAR` and `USE_FOLLOWER` intents exist.
- Passive equipped gear and companion follower bonuses are included in roll formula source rows.
- Activated combat gear is accepted only by the server, then banked as a pending roll modifier.
- The phone receives `objectUseStates` with remaining uses, disabled reasons, and server-confirmed active modifiers.
- Scars and Afflictions exist as persistent status/effect systems, not only a wound count.

The highest-value repair in this pass was presentation clarity: normal active items and consumables were visually too close to relics, and activated weapons sometimes led with their passive stat line instead of the activated rule. That made the UI feel less like Relic's clear Wargear/Power/Relic/Corruption split.

## Relic-Style Mapping

| Relic concept | Ashen Reach equivalent | Current status |
| --- | --- | --- |
| Wargear | Weapons, armor, equipment | Present in `content/gear` and `gear.schema.ts` |
| Power cards | Timed active gear, consumables, follower activations | Present via `activeText`, `timingWindows`, `useLimit`, and server intents |
| Relics | Artifacts / charged relics | Present as `tier: artifact` and `category: chargedRelic` |
| Corruption | Scars / Afflictions | Present in scar cards and Affliction rules |
| Influence | Salvage | Present on character/shop state |
| Missions | Contracts / Starting Missions | Present as contracts and active player missions |

Ashen should keep its own terminology, but the behavior should remain this clean:

- Passive equipment applies automatically when relevant.
- Activated items require server-confirmed use.
- Permanent upgrades stay separate from printed/base stats.
- Temporary effects expire after their timing window.
- Every modifier source must be visible in the formula or disabled reason.

## 1. Current Item Categories Found

`content/gear` currently contains 24 gear records:

- Slot split: 5 weapons, 4 armor, 15 utility items.
- Category split:
  - Active: 4
  - Charged Relic: 4
  - Consumable: 6
  - Contract Object: 1
  - Dangerous: 2
  - Follower Linked: 1
  - Passive: 2
  - Category omitted/default passive-equipment style: 4
- Tier split:
  - Starter: 7
  - Standard: 6
  - Advanced: 3
  - Artifact: 8

Normal, non-artifact items already exist. Examples:

- Starter weapon: `veil-hook`
- Starter armor: `coffin-rig`
- Starter consumable: `cinder-suture-kit`
- Standard active utility: `ashen-route-compass`
- Standard consumable: `blackstar-ampoule`
- Standard dangerous weapon: `black-route-fuse`

## 2. Current Gear Schema Fields

`src/game/schema/gear.schema.ts` supports:

- `slot`: `weapon | armor | utility`
- `category`: `passive | active | consumable | chargedRelic | dangerous | contractObject | followerLinked`
- `tier`: `starter | standard | advanced | artifact`
- `statBonus`: stat and amount
- shop fields: `shopCategories`, `cost`, `sellValue`, `sellable`
- timing and use fields: `timingWindows`, `activeText`, `useLimit`, `charges`, `maxUses`, `heatCost`, `linkedFollowerRole`

This is enough to distinguish Wargear-style equipment from timed active effects and artifact-tier relics without creating a parallel item system.

## 3. Which Items Are Passive

Passive or equipped-by-default examples:

- `veil-hook`: starter weapon, passive Grit modifier.
- `coffin-rig`: starter armor, passive Forge modifier.
- `marshal-seal`: starter utility, passive Command modifier.
- `tuning-spines`: starter utility, passive Signal modifier.
- `qa_alpha_weapon_01`: artifact weapon, passive Command modifier.
- `qa_alpha_armor_01`: artifact armor, passive Forge modifier.

Passive gear should not need a Use button. The server includes equipped passive sources through `getEquippedGearModifierSources` and `buildStatModifierSources`.

## 4. Which Items Are Activated

Activated examples:

- `ashen-route-compass`: once per round route/anomaly support.
- `mirror-reroll-token`: once per turn reroll support.
- `black-route-fuse`: discard for +3 Grit before the battle roll, then escalation.
- `red-march-warbell`: once per turn +2 Grit before the battle roll, then heat.
- `grave-lens`: follower-linked route note support.
- QA artifacts/tools with once-per-turn or charge-based actions.

Activated gear is sent as `USE_GEAR`; followers use `USE_FOLLOWER`.

## 5. Which Items Have Uses or Charges

The model supports:

- `discard`: one-shot consumables and dangerous tools.
- `oncePerTurn`: active tools/followers.
- `oncePerRound`: round-limited active tools.
- `charge`: charged relics.

The phone projection includes `remainingUses`, `maxUses`, `usedThisTurn`, `usedThisRound`, `disabledReason`, and `activeModifier` for owner-visible state.

## 6. Which Effects Currently Affect Battle/Event Math

Battle and check math is assembled in `src/server/roomServer.ts`:

- Base stat.
- Permanent stat upgrade.
- Equipped gear and companion/follower passive modifiers.
- Affliction modifiers.
- Scenario/threat modifiers.
- Server-confirmed pending gear/follower roll modifiers.
- MASTER ALPHA test hooks.
- Extra source rows when needed.

Specific active combat gear currently supported:

- `black-route-fuse`: +3 Grit battle modifier after accepted server use.
- `red-march-warbell`: +2 Grit battle modifier after accepted server use.
- `fandiablos`: +3 Grit in applicable battles, +2 for matching Forge/Guile hazard checks.

The phone and TV formula displays read the same modifier source rows.

## 7. Which Effects Only Update UI

No client-only combat modifier path was found for the current combat items. The phone builds UI cards from projection state and sends intents; accepted active modifiers come back through server state.

There are still descriptive item effects that resolve as notes or simple table effects, such as route notes. Those are not combat modifiers and should remain explanatory rather than pretending to affect math.

## 8. Missing Validation

The major validation points are present:

- player must hold the gear/follower
- passive-only gear/followers are rejected as active uses
- weapon/armor Affliction restrictions block use
- heat cost is checked
- follower-linked gear checks for matching follower role
- combat-use gear checks phase, enemy encounter, pending roll state, and stat match
- charges and once-per-turn/round limits are projected and enforced

Known limitation:

- Active gear effects are still partly item-ID-specific in `createGearRollModifier` and `getGearUseEffect`. This is acceptable for the current small set, but future content should move toward data-driven effect payloads once the item catalog grows.

## 9. Missing Formula/Source Display

Formula source display is already present for accepted passive and active combat modifiers. The risk is not absence of math display; it is wording and category clarity:

- Activated combat weapons previously mixed generic "combat pressure" wording with stat-specific Grit effects.
- Normal active utilities were grouped too broadly as relic-like inventory.
- Activated card summaries could lead with a passive `+1 Stat` line instead of the activated effect the player is about to use.

This pass repairs those presentation gaps.

## 10. Recommended Repairs

Completed in this pass:

- Split inventory group labels into `Items / Consumables` and `Artifacts / Relics`.
- Keep `Weapons`, `Armor`, `Followers`, and `Quest Items` distinct.
- Classify only `chargedRelic` or `tier: artifact` gear as `Artifacts / Relics`.
- Show activated card effect text as the primary consequence instead of leading with passive stat bonus.
- Normalize Black Route Fuse wording to `+3 Grit before the battle roll`.
- Normalize Black Route Fuse and Red March Warbell server note text to stat-specific wording.

Recommended later, if the catalog expands:

- Add explicit data fields for `effectKind`, `appliesToStat`, `appliesToPhase`, and `appliesToTiming` instead of inferring from `activeText`.
- Move item-specific server effect branches into typed effect payload handlers.
- Add dedicated artifact content under `content/cards/artifacts` only if artifacts need a separate card deck from gear.
- Promote Affliction/scar restriction details into every affected card's disabled reason when more restriction cards are added.

## Why a Weapon May Not Be Usable in Battle

A battle weapon can be unavailable for correct rule reasons:

- It is passive/equipped and already applies automatically, so it should not show Use.
- It is not equipped or not held by the player.
- The phase is not the before-battle timing window.
- The encounter has already rolled or has a pending roll.
- The weapon's stat does not match the encounter stat.
- Heat, charges, once-per-turn/round, or discard limits block it.
- A scar/Affliction blocks weapons.

Example: Red March Warbell gives `+2 Grit before the battle roll`. It must be disabled during a Command battle and should explain that the encounter uses Command.

## Acceptance Rule

If the phone says an item was used, the server must have accepted it.
If a source gives +2, the formula must show +2.
If it cannot help now, the button must explain why.
