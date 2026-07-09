# Equipment Asset Cleanup Audit

Date: 2026-07-09

Scope: audit plus resolver implementation notes. No legacy assets were moved, copied, deleted, renamed, or promoted in this pass.

## Summary

Ashen Reach has an active card art root at `public/assets/cards/` and a legacy/source card art root at `public/assets/riftfall/cards/`.

The active card art pipeline now supports these first-class card image types:

- threats
- contracts
- anomalies
- artifacts
- equipment
- scars
- escalations

The original audit found gear UI art routed through artifact art conventions. The resolver pass added Equipment as a first-class category so ordinary gear can resolve through `/assets/cards/equipment/[equipmentId].png`, while artifact-tier gear can still intentionally resolve through Artifact art.

Canonical active Equipment folder:

```txt
public/assets/cards/equipment/
```

Recommended player-facing label:

```txt
Equipment
```

## Current Findings

- Legacy source folders inspected: `gear`, `wargear`, `artifacts`, `heat`, `route-notes`, `contracts`, `threat-red`, `threat-blue`, `threat-yellow`.
- Legacy image count inspected: 55.
- Active image count observed under `public/assets/cards/`: 167 image files.
- Exact hash matches between inspected legacy images and active images: 0.
- Normalized filename matches between inspected legacy images and active images: 0.
- Safe deletions found: 0.
- Heat remains deprecated. No Heat asset should be promoted as a Heat card category.

## Active Gear Content Shape

Current schema already supports most of the needed Equipment modeling:

- `slot`: `weapon`, `armor`, `utility`
- `tier`: `starter`, `standard`, `advanced`, `artifact`
- `category`: `passive`, `active`, `consumable`, `chargedRelic`, `dangerous`, `contractObject`, `followerLinked`
- `shopCategories`: `forge-armoury`, `market`, `medicae-shrine`, `relic-dealer`, `contract-broker`
- `heatCost`: still exists as legacy/cost metadata and should not be rendered as a player harm track.

Current `content/gear/` contains 24 gear records:

- starter/standard normal gear already exists, but its art is treated as artifact art.
- artifact-tier QA and relic-like gear exists and should remain separated from ordinary Equipment in presentation.
- `heat-sink-prayer` has already been renamed player-facing as `Scar-Sink Prayer`, but its ID still contains legacy `heat`.

## Recommended Category Model

Use the existing gear schema instead of creating a parallel item system:

- Equipment: normal `starter`, `standard`, and most `advanced` gear that is not artifact-tier.
- Artifacts / Relics: `tier: artifact` or `category: chargedRelic` when the card is meant to feel rarer, stranger, or stronger.
- Scars / Afflictions: persistent harm/status, never Equipment.
- Quest Items: `category: contractObject` or mission-owned objects.
- Heat: deprecated. Do not create `/assets/cards/heat`.

Suggested inventory groups:

```txt
Weapons
Armor
Equipment
Consumables
Followers
Artifacts / Relics
Scars / Afflictions
Quest Items
```

## Asset Inventory

Legend:

- Exact active match: same file hash already exists under `public/assets/cards/`.
- Normalized active match: filename-normalized equivalent already exists under `public/assets/cards/`.
- Duplicate: safe duplicate candidate. Only exact duplicates should be removed automatically.

| legacy path | filename | visual/category guess | exact active match? | normalized active match? | duplicate? | recommended action | proposed content ID | lore note | risk |
|---|---|---|---:|---:|---:|---|---|---|---|
| `public/assets/riftfall/cards/gear/armor_mirecoil_wardcloak.png` | `armor_mirecoil_wardcloak.png` | armor / standard equipment | no | no | no | import as equipment art | `mirecoil-wardcloak` | A ward-cloak threaded with damp coil wire and swamp lacquer. | medium: needs new gear record and armor effect/cost |
| `public/assets/riftfall/cards/gear/armor_saintplate_harness.png` | `armor_saintplate_harness.png` | armor / advanced equipment | no | no | no | import as equipment art | `saintplate-harness` | A chapel harness plated with saint-scrap and old restraint hooks. | medium: armor should not outshine artifact-tier protection |
| `public/assets/riftfall/cards/gear/consumable_cinder_stim_ampoule.png` | `consumable_cinder_stim_ampoule.png` | consumable / medical item | no | no | no | import as equipment art | `cinder-stim-ampoule` | A hot surgical ampoule that buys one more breath from the ash. | low: existing consumable patterns support this |
| `public/assets/riftfall/cards/gear/consumable_voidsalt_poultice.png` | `consumable_voidsalt_poultice.png` | consumable / wound or scar support | no | no | no | import as equipment art or scar-support art | `voidsalt-poultice` | White salt folded into field cloth for sealing strange wounds. | medium: avoid duplicating existing `artifact-void-salt-poultice` unless intentionally replacing art |
| `public/assets/riftfall/cards/gear/relic_choir_route_orb.png` | `relic_choir_route_orb.png` | relic-like tool | no | no | no | import as artifact art or advanced equipment after review | `choir-route-orb` | A choir orb that sings routes before they are walked. | medium: named relic; may belong with Artifacts, not Equipment |
| `public/assets/riftfall/cards/gear/relic_oathchain_lens.png` | `relic_oathchain_lens.png` | relic-like tool | no | no | no | import as artifact art or quest item after review | `oathchain-lens` | A lens that reads the oath-chain before the bearer admits it. | medium: may overlap with `oath-chain-ledger` conceptually |
| `public/assets/riftfall/cards/gear/weapon_ashlock_cleaver.png` | `weapon_ashlock_cleaver.png` | weapon / standard equipment | no | no | no | import as equipment art | `ashlock-cleaver` | A cleaver with an ash-lock notch for breaking toll chains. | low: good normal weapon candidate |
| `public/assets/riftfall/cards/gear/weapon_signal_pike.png` | `weapon_signal_pike.png` | weapon / standard equipment | no | no | no | import as equipment art | `signal-pike` | A pike tuned to pin static-haunted enemies at reach. | low: good normal weapon candidate |
| `public/assets/riftfall/cards/wargear/card_back_wargear.png` | `card_back_wargear.png` | card back / legacy wargear | no | no | no | keep legacy reference | none | Useful only if a future Equipment deck-back visual is needed. | low: not runtime card content |
| `public/assets/riftfall/cards/wargear/wargear_riftblade.png` | `wargear_riftblade.png` | weapon / advanced equipment | no | no | no | import as equipment art | `riftblade` | A cracked edge that hums near broken routes. | medium: advanced weapon balance needed |
| `public/assets/riftfall/cards/wargear/wargear_scrap_drone.png` | `wargear_scrap_drone.png` | tool / drone / utility equipment | no | no | no | import as equipment art | `scrap-drone` | A scavenger drone that remembers every battlefield it stole from. | medium: could be follower-linked instead of equipment |
| `public/assets/riftfall/cards/wargear/wargear_void_plate.png` | `wargear_void_plate.png` | armor / advanced equipment | no | no | no | import as equipment art | `void-plate` | A heavy suit sealed with black chapel lacquer. | medium: advanced armor balance needed |
| `public/assets/riftfall/cards/artifacts/artifact_choir_lantern.png` | `artifact_choir_lantern.png` | artifact / relic | no | no | no | import as artifact art | `artifact-choir-lantern` | A lantern that carries a choir note without needing a throat. | medium: requires artifact effect |
| `public/assets/riftfall/cards/artifacts/artifact_route_star.png` | `artifact_route_star.png` | artifact / route relic | no | no | no | import as artifact art | `artifact-route-star` | A star-shaped route engine that remembers impossible crossings. | medium: route effects can disturb movement if not scoped |
| `public/assets/riftfall/cards/artifacts/artifact_void_key.png` | `artifact_void_key.png` | artifact / key relic | no | no | no | import as artifact art | `artifact-void-key` | A key that opens the silence around sealed doors. | medium: avoid adding new gate mechanics in asset pass |
| `public/assets/riftfall/cards/artifacts/card_back_artifact.png` | `card_back_artifact.png` | card back / legacy artifact | no | no | no | keep legacy reference | none | Useful only as future deck-back reference. | low |
| `public/assets/riftfall/cards/heat/card_back_heat.png` | `card_back_heat.png` | deprecated Heat card back | no | no | no | archive only | none | Heat is deprecated; do not import as active category. | high if promoted incorrectly |
| `public/assets/riftfall/cards/heat/heat_card_black_mirror.png` | `heat_card_black_mirror.png` | deprecated Heat / possible scar inspiration | no | no | no | import as scar inspiration or archive only | possible `black-mirror-scar` only if content exists later | A reflection that charges interest on every false choice. | high: must not restore Heat |
| `public/assets/riftfall/cards/heat/heat_card_hollow_voice.png` | `heat_card_hollow_voice.png` | deprecated Heat / possible scar inspiration | no | no | no | import as scar inspiration or archive only | possible `hollow-voice-scar` only if content exists later | A voice left behind after the bearer stops speaking. | high: must not restore Heat |
| `public/assets/riftfall/cards/heat/heat_card_rift_scar.png` | `heat_card_rift_scar.png` | deprecated Heat / possible scar art | no | no | no | import as scar inspiration or archive only | possible `rift-scar` only if content exists later | A split in the body where the route looks back. | high: must not restore Heat |
| `public/assets/riftfall/cards/route-notes/card_back_route_note.png` | `card_back_route_note.png` | route-note card back | no | no | no | keep legacy reference | none | Route notes are not an active card category. | low |
| `public/assets/riftfall/cards/route-notes/route_note_command_burst.png` | `route_note_command_burst.png` | route note / temporary command aid | no | no | no | archive only | none | Could inspire a future route-note system. | medium: route-note mechanics are out of scope |
| `public/assets/riftfall/cards/route-notes/route_note_last_second.png` | `route_note_last_second.png` | route note / timing aid | no | no | no | archive only | none | Could inspire a future route-note system. | medium |
| `public/assets/riftfall/cards/route-notes/route_note_rift_focus.png` | `route_note_rift_focus.png` | route note / focus aid | no | no | no | archive only | none | Could inspire a future route-note system. | medium |
| `public/assets/riftfall/cards/contracts/card_back_contract.png` | `card_back_contract.png` | card back / legacy contract | no | no | no | keep legacy reference | none | Active contracts already have generated art. | low |
| `public/assets/riftfall/cards/contracts/mission_break_the_raider_chain.png` | `mission_break_the_raider_chain.png` | contract / mission | no | no | no | import as contract art only if matching content is created | `break-the-raider-chain` | Break the chain of raiders holding a toll route. | medium: no current content ID |
| `public/assets/riftfall/cards/contracts/mission_choir_quietus.png` | `mission_choir_quietus.png` | contract / mission | no | no | no | import as contract art only if matching content is created | `choir-quietus` | Silence a choir signal before it repeats the party's names. | medium |
| `public/assets/riftfall/cards/contracts/mission_cleanse_ember_sanctum.png` | `mission_cleanse_ember_sanctum.png` | contract / mission | no | no | no | import as contract art only if matching content is created | `cleanse-ember-sanctum` | Cleanse an ember sanctum before its votives become teeth. | medium |
| `public/assets/riftfall/cards/contracts/mission_gatefire_vigil.png` | `mission_gatefire_vigil.png` | contract / mission | no | no | no | import as contract art only if matching content is created | `gatefire-vigil` | Hold vigil at a gatefire until the route admits its price. | medium |
| `public/assets/riftfall/cards/contracts/mission_hold_the_ridge.png` | `mission_hold_the_ridge.png` | contract / mission | no | no | no | archive or regenerate before active use | `hold-the-ridge` | Hold a failing ridge line against pressure. | medium: lower resolution than others |
| `public/assets/riftfall/cards/contracts/mission_hunt_breachborn.png` | `mission_hunt_breachborn.png` | contract / mission | no | no | no | import as contract art only if matching content is created | `hunt-breachborn` | Track a breachborn thing through false crossings. | medium |
| `public/assets/riftfall/cards/contracts/mission_lattice_witness.png` | `mission_lattice_witness.png` | contract / mission | no | no | no | import as contract art only if matching content is created | `lattice-witness` | Find the witness trapped inside the signal lattice. | medium |
| `public/assets/riftfall/cards/contracts/mission_map_broken_paths.png` | `mission_map_broken_paths.png` | contract / mission | no | no | no | import as contract art only if matching content is created | `map-broken-paths` | Map broken paths before the map starts editing the party. | medium |
| `public/assets/riftfall/cards/contracts/mission_pilgrim_convoy.png` | `mission_pilgrim_convoy.png` | contract / mission | no | no | no | import as contract art only if matching content is created | `pilgrim-convoy` | Escort a pilgrim convoy through hostile toll smoke. | medium |
| `public/assets/riftfall/cards/contracts/mission_restart_void_relay.png` | `mission_restart_void_relay.png` | contract / mission | no | no | no | import as contract art only if matching content is created | `restart-void-relay` | Restart a void relay without letting it learn a voice. | medium |
| `public/assets/riftfall/cards/contracts/mission_salvage_the_bellframe.png` | `mission_salvage_the_bellframe.png` | contract / mission | no | no | no | import as contract art only if matching content is created | `salvage-the-bellframe` | Strip a bellframe before the Red March retunes it. | medium |
| `public/assets/riftfall/cards/contracts/mission_span_of_the_last_seal.png` | `mission_span_of_the_last_seal.png` | contract / mission | no | no | no | import as contract art only if matching content is created | `span-of-the-last-seal` | Cross the last seal span before it folds shut. | medium |
| `public/assets/riftfall/cards/threat-red/card_back_threat_red.png` | `card_back_threat_red.png` | card back / red threat | no | no | no | keep legacy reference | none | Active threat art already uses lane folders. | low |
| `public/assets/riftfall/cards/threat-red/red_asset_breach_halberd.png` | `red_asset_breach_halberd.png` | red threat / possible asset reward | no | no | no | archive or future red threat/equipment after review | `breach-halberd` | A halberd cut from breach-rusted iron. | medium: asset vs threat role unclear |
| `public/assets/riftfall/cards/threat-red/red_encounter_shattered_barricade.png` | `red_encounter_shattered_barricade.png` | red threat / encounter hazard | no | no | no | import as threat art only with matching red threat content | `shattered-barricade` | A barricade that collapses into teeth and rebar. | medium |
| `public/assets/riftfall/cards/threat-red/red_enemy_cinder_hounds.png` | `red_enemy_cinder_hounds.png` | red threat / enemy | no | no | no | import as threat art only with matching red threat content | `cinder-hounds` | Furnace hounds hunting warm breath. | medium |
| `public/assets/riftfall/cards/threat-red/red_enemy_red_maw_raiders.png` | `red_enemy_red_maw_raiders.png` | red threat / enemy | no | no | no | import as threat art only with matching red threat content | `red-maw-raiders` | Raiders whose masks grin wider than their knives. | medium |
| `public/assets/riftfall/cards/threat-red/red_event_trench_blast.png` | `red_event_trench_blast.png` | red threat / event hazard | no | no | no | import as threat art only with matching red threat content | `trench-blast` | A trench breathes fire where someone stepped wrong. | medium |
| `public/assets/riftfall/cards/threat-blue/blue_asset_sanctifier_beads.png` | `blue_asset_sanctifier_beads.png` | blue threat / possible asset | no | no | no | archive or future blue support item after review | `sanctifier-beads` | Prayer beads strung around a live signal shard. | medium: asset vs threat role unclear |
| `public/assets/riftfall/cards/threat-blue/blue_encounter_hushed_chapel.png` | `blue_encounter_hushed_chapel.png` | blue threat / encounter hazard | no | no | no | import as threat art only with matching blue threat content | `hushed-chapel` | A chapel where sound is collected by the walls. | medium |
| `public/assets/riftfall/cards/threat-blue/blue_enemy_choir_wraith.png` | `blue_enemy_choir_wraith.png` | blue threat / enemy | no | no | no | import as threat art only with matching blue threat content | `choir-wraith` | A signal-wraith carrying the note that killed it. | medium |
| `public/assets/riftfall/cards/threat-blue/blue_enemy_veil_censor.png` | `blue_enemy_veil_censor.png` | blue threat / enemy | no | no | no | import as threat art only with matching blue threat content | `veil-censor` | A censor that edits witnesses from the room. | medium |
| `public/assets/riftfall/cards/threat-blue/blue_event_rift_whispers.png` | `blue_event_rift_whispers.png` | blue threat / event hazard | no | no | no | import as threat art only with matching blue threat content | `rift-whispers` | Whispering routes that argue over which one is real. | medium |
| `public/assets/riftfall/cards/threat-blue/card_back_threat_blue.png` | `card_back_threat_blue.png` | card back / blue threat | no | no | no | keep legacy reference | none | Active threat art already uses lane folders. | low |
| `public/assets/riftfall/cards/threat-yellow/card_back_threat_yellow.png` | `card_back_threat_yellow.png` | card back / yellow threat | no | no | no | keep legacy reference | none | Active threat art already uses lane folders. | low |
| `public/assets/riftfall/cards/threat-yellow/yellow_asset_wireghost_key.png` | `yellow_asset_wireghost_key.png` | yellow threat / possible asset | no | no | no | archive or future utility equipment after review | `wireghost-key` | A key that remembers every lock as a wound. | medium: asset vs threat role unclear |
| `public/assets/riftfall/cards/threat-yellow/yellow_encounter_locked_vault.png` | `yellow_encounter_locked_vault.png` | yellow threat / encounter obstacle | no | no | no | import as threat art only with matching yellow threat content | `locked-vault` | A vault that defends its contents with old law. | medium |
| `public/assets/riftfall/cards/threat-yellow/yellow_enemy_null_drone.png` | `yellow_enemy_null_drone.png` | yellow threat / enemy | no | no | no | import as threat art only with matching yellow threat content | `null-drone` | A null drone policing the route for impossible cargo. | medium |
| `public/assets/riftfall/cards/threat-yellow/yellow_enemy_shiv_market_crew.png` | `yellow_enemy_shiv_market_crew.png` | yellow threat / enemy | no | no | no | import as threat art only with matching yellow threat content | `shiv-market-crew` | Market cutters who sell the wound before making it. | medium |
| `public/assets/riftfall/cards/threat-yellow/yellow_event_route_splice.png` | `yellow_event_route_splice.png` | yellow threat / event hazard | no | no | no | import as threat art only with matching yellow threat content | `route-splice` | A route splice that joins two wrong streets together. | medium |

## Duplicate Detection Result

No inspected legacy file is an exact duplicate of an active runtime image by SHA-256 hash.

No inspected legacy file has a normalized filename match under `public/assets/cards/`.

Because of that, this audit recommends no deletion in this pass. Conceptual duplicates still require visual review and content mapping before any cleanup.

## Heat Folder Decision

`public/assets/riftfall/cards/heat/` must remain legacy/reference-only.

Do not create:

```txt
public/assets/cards/heat/
```

Useful images from the Heat folder may later be used only as Scar/Affliction inspiration or mapped to an existing Scar/Affliction content ID. They must not reintroduce Heat as a player-facing track, card category, or status.

## Equipment Resolver Implementation Notes

Equipment is now represented as a first-class card-art type in the resolver/catalog layer.

- Canonical active folder: `public/assets/cards/equipment/`
- Runtime path format: `/assets/cards/equipment/[equipmentId].png`
- Fallback path: `/assets/cards/fallbacks/equipment.svg`
- Runtime catalog type: `equipment`
- Asset prompt/audit asset type: `equipmentCardArt`

Ordinary gear should resolve through Equipment art. Artifact-tier gear can still resolve through Artifact art when the content record or projected shop item intentionally marks it as artifact-tier.

This implementation pass did not move, import, delete, or rename any legacy images. No new Equipment content records were added. The legacy Heat folder remains reference-only and no `/assets/cards/heat/` runtime path was created.

## First Equipment Import

This pass promotes only selected legacy `gear` and `wargear` images into the active Equipment card-art category. Legacy source files are retained in place for reference.

| source path | active target path | content ID | slot | category | tier | effect summary | lore summary |
|---|---|---|---|---|---|---|---|
| `public/assets/riftfall/cards/gear/weapon_ashlock_cleaver.png` | `public/assets/cards/equipment/ashlock-cleaver.png` | `ashlock-cleaver` | weapon | passive | standard | +1 Grit passive equipment source | Soot-bitten boarding cleaver with an oath notch in the spine. |
| `public/assets/riftfall/cards/gear/weapon_signal_pike.png` | `public/assets/cards/equipment/signal-pike.png` | `signal-pike` | weapon | passive | standard | +1 Signal passive equipment source | Conductor-blade used to pin unstable signals. |
| `public/assets/riftfall/cards/gear/armor_mirecoil_wardcloak.png` | `public/assets/cards/equipment/mirecoil-wardcloak.png` | `mirecoil-wardcloak` | armor | passive | standard | +1 Guile passive equipment source | Tar-wet coilwire cloak from the marsh wards. |
| `public/assets/riftfall/cards/gear/armor_saintplate_harness.png` | `public/assets/cards/equipment/saintplate-harness.png` | `saintplate-harness` | armor | passive | advanced | +1 Forge passive equipment source | Chapel plate scavenged from a saint-engine. |
| `public/assets/riftfall/cards/gear/consumable_cinder_stim_ampoule.png` | `public/assets/cards/equipment/cinder-stim-ampoule.png` | `cinder-stim-ampoule` | utility | consumable | standard | Discard to heal 1 wound using existing recovery effect handling | Red ampoule that burns the blood clean for a few seconds. |
| `public/assets/riftfall/cards/gear/consumable_voidsalt_poultice.png` | `public/assets/cards/equipment/voidsalt-poultice.png` | `voidsalt-poultice` | utility | consumable | standard | Discard to heal 1 wound using existing recovery effect handling | Cold salt and black herb paste for stubborn wounds. |
| `public/assets/riftfall/cards/wargear/wargear_riftblade.png` | `public/assets/cards/equipment/riftblade.png` | `riftblade` | weapon | passive | advanced | +1 Grit passive equipment source | Cracked blade that hums near broken routes. |
| `public/assets/riftfall/cards/wargear/wargear_scrap_drone.png` | `public/assets/cards/equipment/scrap-drone.png` | `scrap-drone` | utility | passive | standard | +1 Signal passive equipment source | Scavenger drone with battlefield memory. |
| `public/assets/riftfall/cards/wargear/wargear_void_plate.png` | `public/assets/cards/equipment/void-plate.png` | `void-plate` | armor | passive | advanced | +1 Forge passive equipment source | Heavy black plate with chapel lacquer and dead-star rivets. |

The import deliberately excludes `card_back_wargear.png`, `relic_choir_route_orb.png`, and `relic_oathchain_lens.png`. The two relic-named images remain deferred for a later Artifact/Relic pass.

Verification after import:

- `validate:content`: 33 gear records.
- `audit:assets`: 406/406 present.
- Active Equipment art: 9/9 present.
- Heat folder: retained as legacy/reference only; no active Heat category or `/assets/cards/heat/` runtime path was created.

## Recommended Implementation Sequence

1. Add Equipment as a first-class asset type in the resolver/catalog:
   - `equipment` in card image type definitions.
   - fallback path for equipment.
   - output directory `/assets/cards/equipment`.
   - runtime catalog support.
   - audit-assets support.
2. Add `public/assets/cards/equipment/`.
3. Promote a small first Equipment batch:
   - `ashlock-cleaver`
   - `signal-pike`
   - `mirecoil-wardcloak`
   - `cinder-stim-ampoule`
   - `riftblade`
   - `scrap-drone`
   - `void-plate`
4. Add or update content records using existing mechanics only.
5. Update phone inventory grouping so normal equipment is distinct from artifacts/relics.
6. Keep artifact-tier gear under Artifacts / Relics.
7. Leave legacy Heat, route-note, and unmatched threat/contract images as reference until their mechanics/content IDs are deliberately created.

## Implementation Risks

- Previous gear art was artifact-routed. Equipment fallback support must keep old gear readable until replacement art is imported.
- Several existing gear records have artifact IDs in the active artifact art catalog. Artifact-tier gear should preserve intentional artifact routing.
- `heatCost` still exists as cost metadata. It should not be displayed as Heat status.
- Route-note images should not be promoted unless a real route-note system is in scope.
- Legacy threat images look useful but are not safe to import without threat content records and lane validation.

## Audit And Resolver Acceptance

This audit and resolver support pass satisfies these criteria:

- Worktree was clean before the audit.
- Legacy source assets were inventoried.
- Active runtime assets were compared by hash and normalized filename.
- No duplicate deletion was recommended.
- Equipment folder path is `public/assets/cards/equipment/`.
- Equipment has first-class resolver/catalog/fallback support.
- Heat remains deprecated and unpromoted.
- No gameplay rules changed.
