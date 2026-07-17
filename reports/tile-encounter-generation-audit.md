# Tile Encounter Generation Audit

Date: 2026-07-08

## Summary

Ashen Reach already had the right data foundation for a Relic-style encounter budget: each board space has printed threat icons and authored sector text. The runaway feel came from two implementation problems:

- `calculateExplorationDraws` treated every icon on an unresolved card as fresh pressure, then subtracted only the first icon. A one-yellow blocker on a one-yellow tile could still leave the tile looking like it owed another draw.
- `GameRoomServer.runAutomaticPhases` drew a threat every time the game entered `sector` phase, even when the tile had no printed icons or its printed lane was already occupied.

This pass changes the source behavior, not just the phone display:

- First icon on a face-up blocker occupies a printed lane slot.
- Only additional icons on that card add extra pressure.
- Sector phase only draws if the printed-icon budget says a draw is due.
- Service/safe tiles with no printed icons advance to action instead of spawning an enemy.
- Phone and TV copy now say blockers stop new draw instead of repeating "Draw due" while threats are present.

## Current Model

Printed icons are the source of truth.

| Tile function | Budget rule |
| --- | --- |
| Safe | 0 automatic threats |
| Service | 0 automatic threats unless printed icons/text explicitly create one |
| Standard | Usually 1 printed icon |
| Danger | Usually 2 printed icons |
| Elite | Explicit 3-icon/deep tile |
| Boss/Core | Scripted or special, not accidental repeat draw |

## Root Cause Details

Before this pass, the draw formula was effectively:

`printed icons + all card icons - first card icons`

That cancels the first icon but still lets unresolved blockers recreate draw debt. The corrected formula is:

`printed icons + extra card icons after the first - occupied first card icons`

That matches the design rule: a blocker occupies the lane; extra icons are pressure.

## Sector Classification

| sectorId | Sector | Region | Printed icons | Expected draw | Profile | Repeated generation found |
| --- | --- | --- | --- | --- | --- | --- |
| outer_ember_sanctum | Pilgrim Lock Gate | outer | none | 0 | service | Yes, server could draw if sector phase reached with a threat deck |
| ashwake-crossing | Ashwalk Bridge | outer | yellow | 1 yellow | standard | Yes, matching blocker could still leave draw debt |
| outer_waymarket | Anchor Market | outer | yellow | 1 yellow | standard | Yes, matching blocker could still leave draw debt |
| glassmere-spindle | Glass Signal Pier | outer | blue | 1 blue | standard | Yes, matching blocker could still leave draw debt |
| outer_relay_camp | Lantern Post 47 | outer | blue | 1 blue | standard | Yes, matching blocker could still leave draw debt |
| mirecoil-beacon | Rusted Transit Gate | outer | yellow, blue | 1 yellow, 1 blue | danger | Yes, blocker lanes were not clearly suppressing repeat draw |
| outer_salt_flats | Mire Vent Colony | outer | blue | 1 blue | standard | Yes |
| hollow-veil-yard | Fallen Hab-Stack | outer | red, yellow | 1 red, 1 yellow | danger | Yes |
| outer_surgery_tent | Old Mercy Bay | outer | red | 1 red | standard | Yes |
| emberwatch-step | Ember Stair | outer | red, blue | 1 red, 1 blue | danger | Yes |
| outer_oathpost | Broken Census Hall | outer | red | 1 red | standard | Yes |
| outer_broken_causeway | Dock Nine Wreckage | outer | yellow, red | 1 yellow, 1 red | danger | Yes |
| votive-engine-room | Votive Engine Room | outer | blue | 1 blue | standard | Yes |
| kettleward-foundry | Kettleward Foundry | outer | yellow | 1 yellow | standard | Yes |
| north-dock-bastion | North Dock Bastion | outer | yellow | 1 yellow | standard | Yes |
| coldwind-wharf | Coldwind Wharf | outer | blue | 1 blue | standard | Yes |
| cinder-fields | Cinder Fields | outer | red | 1 red | standard | Yes |
| colony-outskirts | Colony Outskirts | outer | yellow | 1 yellow | standard | Yes |
| deadwater-marsh | Deadwater Marsh | outer | blue | 1 blue | standard | Yes |
| rustveil-yard | Rustveil Yard | outer | yellow | 1 yellow | standard | Yes |
| sunken-pier | Sunken Pier | outer | blue | 1 blue | standard | Yes |
| shattered-causeway | Shattered Causeway | outer | yellow | 1 yellow | standard | Yes |
| flooded-locks | Flooded Locks | outer | blue | 1 blue | standard | Yes |
| transit-gate | Transit Gate | outer | blue | 1 blue | standard | Yes |
| middle_shard_sprawl | Chain-Maul Yard | middle | red, yellow | 1 red, 1 yellow | danger | Yes |
| middle_relic_cache | Crucible of Names | middle | yellow | 1 yellow | standard | Yes |
| middle_scar_surgery | Sable Machine Choir | middle | red, blue | 1 red, 1 blue | danger | Yes |
| middle_guardian_span | Customs Gate | middle | red, blue, yellow | 1 red, 1 blue, 1 yellow | elite | Yes |
| middle_rivalry_pit | Mirror Barracks | middle | red, yellow | 1 red, 1 yellow | danger | Yes |
| middle_red_march_outpost | Choir Bastion | middle | red | 1 red | standard | Yes |
| middle_webglass_breach | Grave-Rail Junction | middle | yellow, blue | 1 yellow, 1 blue | danger | Yes |
| middle_anomaly_well | Static Chapel | middle | blue, yellow | 1 blue, 1 yellow | danger | Yes |
| black-relay-spire | Black Relay Spire | middle | blue, yellow | 1 blue, 1 yellow | danger | Yes |
| the-salt-archive | The Salt Archive | middle | yellow | 1 yellow | standard | Yes |
| red-lantern-trenches | Red Lantern Trenches | middle | red, yellow | 1 red, 1 yellow | danger | Yes |
| weeping-ammunition-shrine | Weeping Ammunition Shrine | middle | red, blue | 1 red, 1 blue | danger | Yes |
| scorched-road | Scorched Road | middle | yellow | 1 yellow | standard | Yes |
| blastworks | Blastworks | middle | red | 1 red | standard | Yes |
| ashen-chapel | Ashen Chapel | middle | blue | 1 blue | standard | Yes |
| reavers-den | Reaver's Den | middle | red | 1 red | standard | Yes |
| inner_veil_rift | Melted Gate | inner | none | 0 | safe | Yes, server could draw if a threat deck was attached |
| inner_tomb_gate | Rifted Approach | inner | none | 0 | safe | Yes |
| inner_cinder_lattice | The Crownless Observatory | inner | none | 0 | safe | Yes |
| inner_blackstar_shortcut | Dead Star Reliquary | inner | none | 0 | safe | Yes |
| inner_choir_shrine | Saint Engine Crypt | inner | none | 0 | service | Yes |
| inner_gate_of_cinders | The Last Signal Well | inner | none | 0 | safe | Yes |
| the-bone-meridian | The Bone Meridian | inner | red, yellow | 1 red, 1 yellow | danger | Yes |
| choir-execution-court | Hollow Court | inner | red, red, yellow | 2 red, 1 yellow | elite | Yes |
| center_cinder_gate | The Ashen Reach Core | center | none | scripted | boss | Center exploration remains scripted |

## Remaining Notes

- Current sector threat decks are not lane-specific in the server draw action. This pass controls whether a threat draw happens; it does not yet choose a red/blue/yellow deck by lane.
- Mission markers, movement legal destinations, battle math, shop validation, and rivalry privacy were not changed.
- Special roll-table spaces should keep using authored sector actions. They should only create threats through their resolved text effect, not from repeated landing/sector-phase loops.

## Acceptance Rule

Printed icons create threats. Service text creates choices. Blockers stop repeat spawning. Danger tiles are explicit, not accidental.
