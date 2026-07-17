# Equipment Shop, Loadout, and Balance Audit

Baseline: `6a4b223 add-basic-equipment-content-and-assets`

Purpose: validate the first active Equipment set as ordinary weapons, armor, tools, and consumables without blurring Equipment into Artifacts / Relics or restoring Heat.

## Summary

- Equipment content validated as ordinary gear: weapons, armor, utility tools, and consumables.
- Artifacts / Relics remain separate through `tier: "artifact"` and `chargedRelic` routing.
- Standard Equipment uses small +1 passive bonuses or simple recovery consumables.
- Advanced Equipment is priced higher but still limited to +1 passive bonuses.
- Normal shop stock excludes artifact-tier gear; risk/relic flows may include artifact-tier gear only when explicitly requested by the existing shop logic.
- Heat was not restored as a status or card category.

## Equipment Matrix

| ID | Name | Slot | Category | Tier | Stat bonus | Active/consumable effect | Cost | Sell | Shop categories | Inventory group | Shop behavior | Formula / useful-now behavior | Disabled reason behavior | Artifact separation risk |
|---|---|---|---|---|---|---|---:|---:|---|---|---|---|---|---|
| `ashlock-cleaver` | Ashlock Cleaver | weapon | passive | standard | +1 Grit | none | 4 | 2 | forge-armoury, market | Weapons | ordinary stock; buy/sell verified | equipped passive source appears as `Ashlock Cleaver +1` in Grit battle formula | passive-only; no Use button | low |
| `signal-pike` | Signal Pike | weapon | passive | standard | +1 Signal | none | 4 | 2 | forge-armoury, market | Weapons | ordinary stock by category | equipped passive source when Signal applies | passive-only; no Use button | low |
| `mirecoil-wardcloak` | Mirecoil Wardcloak | armor | passive | standard | +1 Guile | none | 4 | 2 | forge-armoury, market | Armor | ordinary stock by category | equipped passive source when Guile applies | passive-only; no Use button | low |
| `saintplate-harness` | Saintplate Harness | armor | passive | advanced | +1 Forge | none | 6 | 3 | forge-armoury | Armor | higher-cost armoury stock; UI image path verified | equipped passive source when Forge applies | passive-only; no Use button | low |
| `cinder-stim-ampoule` | Cinder-Stim Ampoule | utility | consumable | standard | +1 Grit | discard to heal 1 wound | 3 | 1 | medicae-shrine, market | Consumables | ordinary recovery/market stock | useful-now follows existing wound-heal gear behavior; server discards on accepted use | disabled when there are no wounds to heal | low |
| `voidsalt-poultice` | Voidsalt Poultice | utility | consumable | standard | +1 Signal | discard to heal 1 wound | 3 | 1 | medicae-shrine, market | Consumables | ordinary recovery/market stock | useful-now follows existing wound-heal gear behavior; server discards on accepted use | disabled when there are no wounds to heal | low |
| `riftblade` | Riftblade | weapon | passive | advanced | +1 Grit | none | 6 | 3 | forge-armoury | Weapons | higher-cost armoury stock | equipped passive source when Grit applies | passive-only; no Use button | medium-low: name feels relic-like, but mechanics are ordinary +1 |
| `scrap-drone` | Scrap Drone | utility | passive | standard | +1 Signal | none | 4 | 2 | market, forge-armoury | Equipment | ordinary utility stock | equipped passive source when Signal applies | passive-only; no Use button | low |
| `void-plate` | Void Plate | armor | passive | advanced | +1 Forge | none | 6 | 3 | forge-armoury | Armor | higher-cost armoury stock | equipped passive source when Forge applies | passive-only; no Use button | medium-low: name sounds strong, mechanics remain advanced Equipment not Artifact |

## Inventory And Player Card

Verified behavior:

- Weapons route to `Weapons`.
- Armor routes to `Armor`.
- Passive utility tools route to `Equipment`.
- Consumables route to `Consumables`.
- Artifact-tier / charged relic gear routes to `Artifacts / Relics`.
- Scars / Afflictions remain separate.
- Heat does not appear as a player status or inventory group.

No inventory grouping fix was required beyond the previous Equipment / Consumables split.

## Shop Behavior

Verified behavior:

- Imported Equipment is selected by existing `shopCategories`.
- `ashlock-cleaver`, `signal-pike`, and `scrap-drone` are available to market-style stock.
- Forge / Armoury stock includes imported weapons and armor.
- Medicae / Shrine stock includes `cinder-stim-ampoule` and `voidsalt-poultice`.
- Normal stock excludes artifact-tier gear.
- Existing risk/relic stock can include artifact-tier gear only when the shop flow sets `includeArtifacts: true`.
- Buying an imported Equipment card deducts salvage and adds it to held gear.
- Selling an imported Equipment card removes it and adds its sell value.
- Shop UI renders imported Equipment art when active art exists.

No new shop weighting or economy system was added. Tier/cost already provides the current balance distinction: standard Equipment is cheaper, advanced Equipment costs more, Artifacts remain artifact-tier.

## Battle And Formula Behavior

Verified behavior:

- Equipped passive Equipment contributes as a named source row.
- `ashlock-cleaver` appears as `Ashlock Cleaver +1` in a Grit battle formula.
- Passive Equipment does not overwrite printed/base stats.
- Temporary active item bonuses remain separate from passive Equipment.
- Passive-only Equipment does not need a server use action and should not display a misleading Use button.

## Consumable Behavior

Verified behavior:

- `cinder-stim-ampoule` and `voidsalt-poultice` use the existing accepted-use path.
- Each heals 1 wound and is discarded on server-confirmed use.
- Existing useful-now / locked-state logic displays wound-heal availability and disabled reasons.
- No client-only consumable modifier was introduced.

## Artifact Hierarchy

Equipment remains below Artifacts / Relics:

- Standard Equipment: small +1 passive source or simple recovery consumable.
- Advanced Equipment: higher-cost +1 passive source.
- Artifacts / Relics: still separated by artifact tier, charged relic category, and relic-dealer/risk stock behavior.

No artifact buffs or equipment power creep were introduced.

## Follow-Ups

- Shop stock weighting is still simple sort/filter behavior. If future playtests want rarer advanced Equipment, add a dedicated stock weighting pass rather than changing this validation pass.
- `riftblade` and `void-plate` may want stronger visual/lore differentiation from true Artifacts in future copy, but their mechanics are currently safe.
- Real-device shop buy/sell of these exact cards still depends on reaching or fixture-seeding the relevant shop stock.

## Verification Notes

Targeted tests added/updated:

- Imported Equipment shop category routing.
- Normal stock excludes artifact-tier gear; risk/relic stock can include it when explicitly allowed.
- Imported Equipment buy/sell flow for Ashlock Cleaver.
- Imported passive Equipment source row in battle formula.
- Phone shop card uses active Equipment art for Saintplate Harness.

Audit result expected after this pass:

- `validate:content`: 33 gear records.
- `audit:assets`: 406/406 present.
- Equipment active art: 9/9.
- Heat active category: absent.
