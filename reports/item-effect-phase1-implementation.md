# Item effect normalization Phase 1 implementation

## Scope

Implemented the minimal permanent and straightforward battle-only conditional passive model described by `reports/item-effect-model-audit.md`. No charge, recharge, exhaust, consumable, gate-relic, burden, hybrid, balance, shop-stock, movement, or mission-lifecycle behavior was changed.

## Schema and validation

Added optional `GearItem` fields:

- `effectModel: "permanent" | "conditional"`
- `requiresEquipped: boolean`
- `conditionType: "battle"`

Validation now rejects:

- migrated passive items without `requiresEquipped: true`;
- conditional items without a supported condition;
- permanent items that also declare a condition;
- normal Equipment that attempts to use Artifact charge mechanics.

The 16 canonical passive Equipment items whose movement, hazard, recovery, shop, contract, or poetic conditions require later design decisions are held in an explicit Phase 1 compatibility allowlist. Legacy and QA records remain compatible and out of normal progression.

## Phase 1A permanent passives

The following eight canonical Equipment items now declare `effectModel: "permanent"` and `requiresEquipped: true`:

- Rivetplate Vest: +1 Grit
- Sootmantle Cloak: +1 Guile
- Ironhide Bracers: +1 Forge
- Salvage Guard Mask: +1 Signal
- Chapel Guard Harness: +1 Command
- Warden's Kneeplate: +1 Grit
- Last-Breath Rivet: +1 Grit
- Wound Clamp: +1 Grit

The authoritative modifier resolver reads equipped slots and held-item definitions. Carried but unequipped items contribute nothing. Unequip, sale, discard, loss, or removal eliminates the equipped ID/item and therefore removes the modifier without changing stored base stats.

## Phase 1B battle-only conditional passives

The following five clear battle weapons now declare `effectModel: "conditional"`, `conditionType: "battle"`, and `requiresEquipped: true`:

- Rustknife Carbine: +1 Guile in battle
- Nailspike Maul: +1 Grit in battle
- Emberlock Pistol: +1 Command in battle
- Ashen Bayonet: +1 Grit in battle
- Stormcut Axe: +1 Forge in battle

The server passes an explicit `battle`, `check`, or resting context into the shared equipped-gear resolver. These items contribute only in battle, including normal enemy and Nemesis combat. They no longer affect unrelated checks or resting headline stats. Modifier sources retain the item name, so existing TV battle details can render the active source without a battle-overlay redesign.

## Phone behavior

- Resting player-card Base / Permanent / Gear-Follower / Final values include equipped permanent items.
- Battle-only conditional items are excluded from resting Gear-Follower and Final values.
- Battle assist totals include eligible equipped conditional weapons.
- Inventory cards present migrated passives as automatic effects rather than manual `Use` actions.
- Conditional inventory copy states the bonus applies in battles.

## Over-broad modifiers corrected

Rustknife Carbine, Nailspike Maul, Emberlock Pistol, Ashen Bayonet, and Stormcut Axe previously flowed through the generic equipped-stat path for every matching-stat check. They are now restricted to authoritative battle contexts.

No condition was invented for ambiguous items. Chainhook Blade, Route Compass, Field Lens, Lockjaw Kit, Bridge Spike, Static Probe, Surveyor Chalk, Cinder Suture Kit, Saintwire Splint, Salt Gauze Wrap, Ember Poultice, Salvage Ledger, Mirror Token, Oath Chain, Red March Bell, and Signal Lantern retain compatibility behavior pending a dedicated condition vocabulary/design decision.

## Tests added and updated

- Schema accepts valid permanent/conditional definitions and rejects invalid/Artifact-only combinations.
- Equipped permanent item grants its modifier.
- Carried but unequipped item grants none.
- Unequip/removal removes the modifier.
- Selling equipped permanent gear clears inventory and equipped slot.
- Battle-only weapon applies in battle but not resting/check contexts or unrelated stats.
- Reconnect/private projection preserves equipped permanent item definition and effect.
- Phone stat breakdown includes permanent gear in Final and excludes conditional battle gear at rest.

## Explicitly deferred

- Black Route Fuse's conflicting passive and activated values.
- Numeric charges and recharge.
- Charged Artifacts.
- Exhaust/reset windows.
- Consumable activation/removal refinements.
- Gate relic spending.
- Persistent burden state.
- Artifacts that currently grant ordinary Equipment, followers, or notes.
- Artifact hybrids.
- Ambiguous normal Equipment condition wording.

## Compatibility retained

- Equipment/Artifact tier separation and common/rare shop eligibility are unchanged.
- Existing legacy and QA item records continue to parse through optional Phase 1 fields.
- Unmigrated canonical passive Equipment is explicitly allowlisted in content validation rather than silently treated as normalized.
- Existing TV battle presentation consumes authoritative modifier sources without layout changes.
