# Remaining Legacy Card Assets Audit

Baseline: `c32a573 archive-promoted-legacy-card-assets`

Purpose: audit the legacy Riftfall card folders that remain after Equipment and Artifact / Relic promotion. This pass does not move, delete, import, or create content. It only classifies the remaining files and proposes safe next steps.

## Summary

- Remaining legacy files audited: 42.
- Exact active duplicates found by SHA-256: 0.
- Normalized active matches found: 0 content matches. Two card-back names match fallback concepts only: `contract` and `artifact`.
- Runtime dependency on `public/assets/riftfall/cards/`: none found in runtime client/server content paths. Remaining direct references are design prompt sources, generated prompt output, reports, and docs.
- Heat decision: deprecated/reference-only. Do not create `/assets/cards/heat/`.
- Route-note decision: route notes exist as note text/mechanics, but not as a first-class active card-art category. Keep route-note images reference-only until a real route-note card system is scoped.
- Artifact blocker: `relic_choir_route_orb.png` remains deferred because artifact cards are at the validation maximum of 30/30.

## Content Capacity Check

Current counts come from the repository validation targets and current content loaders.

| category | current | target range | remaining capacity | audit implication |
|---|---:|---:|---:|---|
| threats | 94 | 40-120 | 26 | Threat candidates can be promoted later, but only with lane-specific content and art under `public/assets/cards/threats/<lane>/`. |
| contracts | 21 | 20-30 | 9 | Contract candidates can be promoted later, but not all 12 mission images can become new contracts without retiring or merging some. |
| artifacts | 30 | 12-30 | 0 | No artifact imports should happen until one artifact is retired or the cap is deliberately changed. |
| scars | 15 | 12-18 | 3 | Heat images may inspire scars later, but only three new scar slots are available under current caps. |
| escalations | 16 | 15-25 | 9 | No remaining legacy folder maps cleanly to escalations in this pass. |
| gear / equipment | 37 gear | no explicit content target | n/a | Equipment promotion is already complete for the first useful set. |
| afflictions | 30 | 30-30 | 0 | No new affliction content can be added under current caps. |

## Remaining Legacy Files

| legacy path | filename | folder/category | visual guess | active equivalent exists? | exact active duplicate? | normalized active match? | likely active target category | recommended action | proposed active ID | lore seed | mechanic seed using existing systems only | risk |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `public/assets/riftfall/cards/contracts/card_back_contract.png` | `card_back_contract.png` | contracts | contract deck back | fallback concept exists | no | fallback `contract.svg` only | card back/reference only | keep reference-only | n/a | Old contract deck back. | none | Low; not active content. |
| `public/assets/riftfall/cards/contracts/mission_break_the_raider_chain.png` | `mission_break_the_raider_chain.png` | contracts | mission / contract | no | no | no | contract/mission | promote later as new contract if capacity remains | `break-the-raider-chain` | Break a raider toll-chain before it closes the road. | Complete by defeating red lane raiders or clearing a danger sector; reward salvage or gear. | Medium; contract cap pressure. |
| `public/assets/riftfall/cards/contracts/mission_choir_quietus.png` | `mission_choir_quietus.png` | contracts | mission / contract | no | no | no | contract/mission | promote later as new contract | `choir-quietus` | Silence a choir signal before it repeats the party's names. | Complete a blue Signal or anomaly objective; reward route note or Signal gear. | Medium; needs objective wording. |
| `public/assets/riftfall/cards/contracts/mission_cleanse_ember_sanctum.png` | `mission_cleanse_ember_sanctum.png` | contracts | mission / contract | no | no | no | contract/mission | promote later as new contract | `cleanse-ember-sanctum` | Cleanse an ember sanctum before its votives become teeth. | Complete a sector action on a hazard or red/forge site; reward scar relief or salvage. | Medium. |
| `public/assets/riftfall/cards/contracts/mission_gatefire_vigil.png` | `mission_gatefire_vigil.png` | contracts | mission / contract | no | no | no | contract/mission | promote later as new contract | `gatefire-vigil` | Hold vigil at a gatefire until the route admits its price. | Complete by ending a turn on a gate/transition sector after clearing blockers. | Medium; must not alter movement gates. |
| `public/assets/riftfall/cards/contracts/mission_hold_the_ridge.png` | `mission_hold_the_ridge.png` | contracts | mission / contract | no | no | no | contract/mission | promote later only if image quality is acceptable; otherwise regenerate | `hold-the-ridge` | Hold a failing ridge line against pressure. | Complete by defeating a threat on a danger tile; reward scenario progress or salvage. | Medium; prior audit noted lower resolution. |
| `public/assets/riftfall/cards/contracts/mission_hunt_breachborn.png` | `mission_hunt_breachborn.png` | contracts | mission / contract | no | no | no | contract/mission | promote later as new contract | `hunt-breachborn` | Track a breachborn thing through false crossings. | Complete by defeating a breach/anomaly-tag threat. | Medium. |
| `public/assets/riftfall/cards/contracts/mission_lattice_witness.png` | `mission_lattice_witness.png` | contracts | mission / contract | no | no | no | contract/mission | promote later as new contract | `lattice-witness` | Find the witness trapped inside the signal lattice. | Complete a Signal test or blue threat resolution; reward note/progress. | Medium. |
| `public/assets/riftfall/cards/contracts/mission_map_broken_paths.png` | `mission_map_broken_paths.png` | contracts | mission / contract | no | no | no | contract/mission | promote later as new contract | `map-broken-paths` | Map broken paths before the map starts editing the party. | Complete movement/route-note objective without changing pathfinding. | Medium; avoid changing movement rules. |
| `public/assets/riftfall/cards/contracts/mission_pilgrim_convoy.png` | `mission_pilgrim_convoy.png` | contracts | mission / contract | no | no | no | contract/mission | promote later as new contract | `pilgrim-convoy` | Escort a pilgrim convoy through hostile toll smoke. | Complete by reaching a named sector and clearing blockers. | Medium. |
| `public/assets/riftfall/cards/contracts/mission_restart_void_relay.png` | `mission_restart_void_relay.png` | contracts | mission / contract | no | no | no | contract/mission | promote later as new contract | `restart-void-relay` | Restart a void relay without letting it learn a voice. | Complete a Signal/Forge action at relay-tagged sector; reward Signal gear or progress. | Medium. |
| `public/assets/riftfall/cards/contracts/mission_salvage_the_bellframe.png` | `mission_salvage_the_bellframe.png` | contracts | mission / contract | no | no | no | contract/mission | promote later as new contract | `salvage-the-bellframe` | Strip a bellframe before the Red March retunes it. | Complete by clearing a red threat or salvage sector; reward salvage/equipment. | Medium. |
| `public/assets/riftfall/cards/contracts/mission_span_of_the_last_seal.png` | `mission_span_of_the_last_seal.png` | contracts | mission / contract | no | no | no | contract/mission | promote later only if contract cap room is reserved | `span-of-the-last-seal` | Cross the last seal span before it folds shut. | Complete at a seal/gate sector; reward scenario progress. | Medium-high; can overlap scenario objectives. |
| `public/assets/riftfall/cards/threat-red/card_back_threat_red.png` | `card_back_threat_red.png` | threat-red | red threat deck back | no | no | no | card back/reference only | keep reference-only | n/a | Old red threat deck back. | none | Low. |
| `public/assets/riftfall/cards/threat-red/red_asset_breach_halberd.png` | `red_asset_breach_halberd.png` | threat-red | asset/boon or weapon | no | no | no | threat red or equipment | keep reference-only until role is chosen | `breach-halberd` | A halberd cut from breach-rusted iron. | If threat: red asset reward with `gain_gear`; if equipment: advanced weapon. | Medium-high; asset vs threat role unclear. |
| `public/assets/riftfall/cards/threat-red/red_encounter_shattered_barricade.png` | `red_encounter_shattered_barricade.png` | threat-red | encounter/hazard | no | no | no | threat red | promote later as red hazard | `shattered-barricade` | A barricade that collapses into teeth and rebar. | Red hazard using Grit/Forge check, wound or blocker on failure. | Medium. |
| `public/assets/riftfall/cards/threat-red/red_enemy_cinder_hounds.png` | `red_enemy_cinder_hounds.png` | threat-red | enemy | no | no | no | threat red | promote later as red enemy | `cinder-hounds` | Furnace hounds hunting warm breath. | Red enemy, Grit battle, wound on loss, salvage/trophy on win. | Medium. |
| `public/assets/riftfall/cards/threat-red/red_enemy_red_maw_raiders.png` | `red_enemy_red_maw_raiders.png` | threat-red | enemy | no | no | no | threat red | promote later as red enemy | `red-maw-raiders` | Raiders whose masks grin wider than their knives. | Red enemy, Command/Grit, lose salvage on failure. | Medium. |
| `public/assets/riftfall/cards/threat-red/red_event_trench_blast.png` | `red_event_trench_blast.png` | threat-red | event/hazard | no | no | no | threat red | promote later as red event | `trench-blast` | A trench breathes fire where someone stepped wrong. | Red event, Forge/Grit check, wound or note on outcome. | Medium. |
| `public/assets/riftfall/cards/threat-blue/blue_asset_sanctifier_beads.png` | `blue_asset_sanctifier_beads.png` | threat-blue | asset/boon | no | no | no | threat blue or equipment | keep reference-only until role is chosen | `sanctifier-beads` | Prayer beads strung around a live signal shard. | If threat asset: blue reward with `gain_gear`; if equipment: utility relic/equipment. | Medium-high; asset vs equipment ambiguity. |
| `public/assets/riftfall/cards/threat-blue/blue_encounter_hushed_chapel.png` | `blue_encounter_hushed_chapel.png` | threat-blue | encounter/hazard | no | no | no | threat blue | promote later as blue hazard | `hushed-chapel` | A chapel where sound is collected by the walls. | Blue Signal/Command check, gain note or suffer scar pressure. | Medium. |
| `public/assets/riftfall/cards/threat-blue/blue_enemy_choir_wraith.png` | `blue_enemy_choir_wraith.png` | threat-blue | enemy | no | no | no | threat blue | promote later as blue enemy | `choir-wraith` | A signal-wraith carrying the note that killed it. | Blue enemy, Signal battle, route-note interaction. | Medium. |
| `public/assets/riftfall/cards/threat-blue/blue_enemy_veil_censor.png` | `blue_enemy_veil_censor.png` | threat-blue | enemy | no | no | no | threat blue | promote later as blue enemy | `veil-censor` | A censor that edits witnesses from the room. | Blue enemy, Signal/Guile, discard note or miss reward on loss. | Medium. |
| `public/assets/riftfall/cards/threat-blue/blue_event_rift_whispers.png` | `blue_event_rift_whispers.png` | threat-blue | event/hazard | no | no | no | threat blue | promote later as blue event | `rift-whispers` | Whispering routes that argue over which one is real. | Blue event, Signal test, record route note or take scar pressure. | Medium. |
| `public/assets/riftfall/cards/threat-blue/card_back_threat_blue.png` | `card_back_threat_blue.png` | threat-blue | blue threat deck back | no | no | no | card back/reference only | keep reference-only | n/a | Old blue threat deck back. | none | Low. |
| `public/assets/riftfall/cards/threat-yellow/card_back_threat_yellow.png` | `card_back_threat_yellow.png` | threat-yellow | yellow threat deck back | no | no | no | card back/reference only | keep reference-only | n/a | Old yellow threat deck back. | none | Low. |
| `public/assets/riftfall/cards/threat-yellow/yellow_asset_wireghost_key.png` | `yellow_asset_wireghost_key.png` | threat-yellow | asset/boon or utility | no | no | no | threat yellow or equipment | keep reference-only until role is chosen | `wireghost-key` | A key that remembers every lock as a wound. | If threat asset: yellow reward with `gain_gear`; if equipment: utility key. | Medium-high; asset vs equipment ambiguity. |
| `public/assets/riftfall/cards/threat-yellow/yellow_encounter_locked_vault.png` | `yellow_encounter_locked_vault.png` | threat-yellow | encounter/obstacle | no | no | no | threat yellow | promote later as yellow hazard | `locked-vault` | A vault that defends its contents with old law. | Yellow Guile/Forge check, salvage reward or blocker on failure. | Medium. |
| `public/assets/riftfall/cards/threat-yellow/yellow_enemy_null_drone.png` | `yellow_enemy_null_drone.png` | threat-yellow | enemy | no | no | no | threat yellow | promote later as yellow enemy | `null-drone` | A null drone policing the route for impossible cargo. | Yellow enemy, Signal/Forge, disable equipment on loss if existing rules allow. | Medium. |
| `public/assets/riftfall/cards/threat-yellow/yellow_enemy_shiv_market_crew.png` | `yellow_enemy_shiv_market_crew.png` | threat-yellow | enemy | no | no | no | threat yellow | promote later as yellow enemy | `shiv-market-crew` | Market cutters who sell the wound before making it. | Yellow enemy, Guile/Command, lose salvage on failure. | Medium. |
| `public/assets/riftfall/cards/threat-yellow/yellow_event_route_splice.png` | `yellow_event_route_splice.png` | threat-yellow | event/hazard | no | no | no | threat yellow | promote later as yellow event | `route-splice` | A route splice that joins two wrong streets together. | Yellow event, Guile/Signal, record route note or lose next option. | Medium; do not alter movement topology. |
| `public/assets/riftfall/cards/route-notes/card_back_route_note.png` | `card_back_route_note.png` | route-notes | route-note deck back | no active route-note deck | no | no | route-note/reference only | keep reference-only | n/a | Old route-note deck back. | none | Low until route-note card system exists. |
| `public/assets/riftfall/cards/route-notes/route_note_command_burst.png` | `route_note_command_burst.png` | route-notes | temporary command aid | no active route-note deck | no | no | route-note/reference only | keep reference-only | `command-burst` if system exists later | A shouted order caught in a broken milepost. | Future route-note modifier only; no current card import. | Medium; route-note card mechanics not scoped. |
| `public/assets/riftfall/cards/route-notes/route_note_last_second.png` | `route_note_last_second.png` | route-notes | timing aid | no active route-note deck | no | no | route-note/reference only | keep reference-only | `last-second` if system exists later | A last-second route correction written in ash. | Future timing note only. | Medium. |
| `public/assets/riftfall/cards/route-notes/route_note_rift_focus.png` | `route_note_rift_focus.png` | route-notes | focus aid | no active route-note deck | no | no | route-note/reference only | keep reference-only | `rift-focus` if system exists later | A calm point inside the wrong road. | Future route/anomaly support note only. | Medium. |
| `public/assets/riftfall/cards/heat/card_back_heat.png` | `card_back_heat.png` | heat | deprecated Heat deck back | no | no | no | heat deprecated/reference only | do not import | n/a | Deprecated Heat deck back. | none | High if restored. |
| `public/assets/riftfall/cards/heat/heat_card_black_mirror.png` | `heat_card_black_mirror.png` | heat | corruption/scar inspiration | no | no | no | scar inspiration only | keep reference-only or later map to scar if cap available | `black-mirror-scar` only if created later | A reflection that charges interest on every false choice. | Future scar/affliction only; never Heat. | High if Heat is restored. |
| `public/assets/riftfall/cards/heat/heat_card_hollow_voice.png` | `heat_card_hollow_voice.png` | heat | corruption/scar inspiration | no | no | no | scar inspiration only | keep reference-only or later map to scar if cap available | `hollow-voice-scar` only if created later | A voice left behind after the bearer stops speaking. | Future scar/affliction only; never Heat. | High if Heat is restored. |
| `public/assets/riftfall/cards/heat/heat_card_rift_scar.png` | `heat_card_rift_scar.png` | heat | scar/corruption art | no | no | no | scar inspiration only | keep reference-only or later map to scar if cap available | `rift-scar` only if created later | A split in the body where the route looks back. | Future scar/affliction only; never Heat. | High if Heat is restored. |
| `public/assets/riftfall/cards/wargear/card_back_wargear.png` | `card_back_wargear.png` | wargear | legacy wargear deck back | no active wargear category | no | no | card back/reference only | keep reference-only | n/a | Old wargear deck back. | none | Low; Equipment replaced ordinary wargear. |
| `public/assets/riftfall/cards/artifacts/card_back_artifact.png` | `card_back_artifact.png` | artifacts | legacy artifact deck back | fallback concept exists | no | fallback `artifact.svg` only | card back/reference only | keep reference-only | n/a | Old artifact deck back. | none | Low; not active content. |
| `public/assets/riftfall/cards/gear/relic_choir_route_orb.png` | `relic_choir_route_orb.png` | gear | relic route orb | no | no | no | artifact/relic | blocked by artifact content cap | `artifact-choir-route-orb` | Choir-glass orb humming toward safer roads. | Charged route/signal support using existing note effects. | Medium; artifact cap is full. |

## Heat Decision

Heat remains deprecated. The legacy Heat files are not active content, are not duplicates of active Scar art, and must not create a `/assets/cards/heat/` path.

Allowed future uses:

- reference-only archive material
- scar or affliction inspiration
- mapped to a real existing Scar/Affliction ID only if the Heat name/text is rewritten and content capacity allows it

Not allowed:

- active Heat deck
- player-facing Heat status
- Heat result chips
- Heat as a second persistent harm track beside Scars

## Route-Note Decision

Route-note text exists in characters, followers, gear, threats, sectors, missions, and server result notes. However, this is currently a note/effect concept, not an active card-art category with content records and resolver paths.

The route-note images should stay reference-only until a future pass defines:

- route-note content records
- active folder, likely `public/assets/cards/route-notes/`
- resolver/catalog support
- audit coverage
- phone/TV UI ownership

Do not promote route-note images as generic Equipment or Artifact art just because their effects mention routes.

## Contract / Mission Decision

The 12 legacy mission images are plausible Contract candidates, but none has an exact active content ID or exact active image duplicate. Current contract capacity is 9, so a future import must choose a subset or retire/merge existing contracts first.

Suggested first subset if a contract expansion pass is desired:

1. `restart-void-relay`
2. `pilgrim-convoy`
3. `salvage-the-bellframe`
4. `choir-quietus`
5. `gatefire-vigil`
6. `map-broken-paths`
7. `break-the-raider-chain`
8. `hunt-breachborn`
9. `lattice-witness`

Defer unless cap changes:

- `cleanse-ember-sanctum`
- `hold-the-ridge`
- `span-of-the-last-seal`

## Threat Decision

The 15 non-card-back threat lane images are plausible future Threat cards. None is an exact active duplicate or normalized content match. Threat capacity is 26, so all could technically fit, but imports must preserve lane identity and current encounter budget rules.

Recommended next threat import shape:

- red lane: 2 enemies, 2 events/hazards, 1 asset/reward candidate
- blue lane: 2 enemies, 2 events/hazards, 1 asset/reward candidate
- yellow lane: 2 enemies, 2 events/hazards, 1 asset/reward candidate

The three `*_asset_*` files are the riskiest because they may belong as Equipment or reward gear rather than threat blockers. Decide their role before import.

## Reference Safety

Current source/design references to `public/assets/riftfall/cards/` are prompt/reference surfaces:

- `src/game/assets/design/cardArtPrompts.ts`
- `src/game/assets/design/cardTemplatePrompts.ts`
- `generated/manual-image-prompts-all.txt`
- older reports and documentation

Runtime client/server content should continue to resolve active card art through `public/assets/cards/`.

Files safe for a future archive-only pass after prompt updates:

- legacy card backs if active fallbacks fully replace them in prompt catalogs
- route-note images if no route-note card system is planned
- Heat images if scar-inspiration decisions are documented elsewhere

Files that should remain reference-only for now:

- all Heat files
- all route-note files
- all card backs
- `relic_choir_route_orb.png`
- asset-role threat files until their category is decided

## Recommended Next Passes

1. Contract candidate selection pass: choose up to 9 mission images, create active Contract content and art only for selected IDs.
2. Threat candidate selection pass: add lane-specific threat content using active threat resolver paths.
3. Route-note design pass: decide whether route notes are cards, counters, or text-only notes.
4. Heat archive/scar-inspiration pass: either archive Heat files or map selected images to Scar/Affliction concepts without restoring Heat.
5. Prompt catalog cleanup pass: retarget or remove old Riftfall prompt outputs once the remaining reference decisions are final.

## Threat Promotion Implementation

Commit pass: `promote-legacy-lane-threat-assets`

The 15 non-card-back threat candidates were promoted as active lane-specific Threat cards. Legacy sources were retained in place for a later archive-only pass.

| legacy source | active threat ID | active image path | lane | role |
|---|---|---|---|---|
| `public/assets/riftfall/cards/threat-red/red_asset_breach_halberd.png` | `breach-halberd` | `public/assets/cards/threats/red/breach-halberd.png` | red | asset hazard |
| `public/assets/riftfall/cards/threat-red/red_encounter_shattered_barricade.png` | `shattered-barricade` | `public/assets/cards/threats/red/shattered-barricade.png` | red | encounter hazard |
| `public/assets/riftfall/cards/threat-red/red_enemy_cinder_hounds.png` | `cinder-hounds` | `public/assets/cards/threats/red/cinder-hounds.png` | red | enemy |
| `public/assets/riftfall/cards/threat-red/red_enemy_red_maw_raiders.png` | `red-maw-raiders` | `public/assets/cards/threats/red/red-maw-raiders.png` | red | enemy |
| `public/assets/riftfall/cards/threat-red/red_event_trench_blast.png` | `trench-blast` | `public/assets/cards/threats/red/trench-blast.png` | red | event hazard |
| `public/assets/riftfall/cards/threat-blue/blue_asset_sanctifier_beads.png` | `sanctifier-beads` | `public/assets/cards/threats/blue/sanctifier-beads.png` | blue | asset hazard |
| `public/assets/riftfall/cards/threat-blue/blue_encounter_hushed_chapel.png` | `hushed-chapel` | `public/assets/cards/threats/blue/hushed-chapel.png` | blue | encounter hazard |
| `public/assets/riftfall/cards/threat-blue/blue_enemy_choir_wraith.png` | `choir-wraith` | `public/assets/cards/threats/blue/choir-wraith.png` | blue | enemy |
| `public/assets/riftfall/cards/threat-blue/blue_enemy_veil_censor.png` | `veil-censor` | `public/assets/cards/threats/blue/veil-censor.png` | blue | enemy |
| `public/assets/riftfall/cards/threat-blue/blue_event_rift_whispers.png` | `rift-whispers` | `public/assets/cards/threats/blue/rift-whispers.png` | blue | event hazard |
| `public/assets/riftfall/cards/threat-yellow/yellow_asset_wireghost_key.png` | `wireghost-key` | `public/assets/cards/threats/yellow/wireghost-key.png` | yellow | asset hazard |
| `public/assets/riftfall/cards/threat-yellow/yellow_encounter_locked_vault.png` | `locked-vault` | `public/assets/cards/threats/yellow/locked-vault.png` | yellow | encounter hazard |
| `public/assets/riftfall/cards/threat-yellow/yellow_enemy_null_drone.png` | `null-drone` | `public/assets/cards/threats/yellow/null-drone.png` | yellow | enemy |
| `public/assets/riftfall/cards/threat-yellow/yellow_enemy_shiv_market_crew.png` | `shiv-market-crew` | `public/assets/cards/threats/yellow/shiv-market-crew.png` | yellow | enemy |
| `public/assets/riftfall/cards/threat-yellow/yellow_event_route_splice.png` | `route-splice` | `public/assets/cards/threats/yellow/route-splice.png` | yellow | event hazard |

Implementation notes:

- No Heat effects were added.
- No `/assets/cards/heat/` path was created.
- No movement, shop, mission, multiplayer, scar, scenario, or artifact rules were changed.
- Asset-role threat images were promoted as `resolutionType: "asset"` hazards using existing note/wound/scar effects, not as new Equipment.
- Each promoted threat was registered once in an appropriate canonical sector threat deck so the live deck reference set remains complete.
- Threat count increased from 94 to 109, still within the 40-120 validation target.

## Threat Source Archive Follow-up

Commit pass: `archive-promoted-legacy-threat-assets`

The 15 promoted legacy threat source PNGs were archived after SHA-256 verification against their active replacements. The legacy threat card backs were deliberately retained as reference/template assets.

| legacy source | archive path | active replacement |
|---|---|---|
| `public/assets/riftfall/cards/threat-red/red_asset_breach_halberd.png` | `_archive/legacy-promoted-card-assets/threats/red/red_asset_breach_halberd.png` | `public/assets/cards/threats/red/breach-halberd.png` |
| `public/assets/riftfall/cards/threat-red/red_encounter_shattered_barricade.png` | `_archive/legacy-promoted-card-assets/threats/red/red_encounter_shattered_barricade.png` | `public/assets/cards/threats/red/shattered-barricade.png` |
| `public/assets/riftfall/cards/threat-red/red_enemy_cinder_hounds.png` | `_archive/legacy-promoted-card-assets/threats/red/red_enemy_cinder_hounds.png` | `public/assets/cards/threats/red/cinder-hounds.png` |
| `public/assets/riftfall/cards/threat-red/red_enemy_red_maw_raiders.png` | `_archive/legacy-promoted-card-assets/threats/red/red_enemy_red_maw_raiders.png` | `public/assets/cards/threats/red/red-maw-raiders.png` |
| `public/assets/riftfall/cards/threat-red/red_event_trench_blast.png` | `_archive/legacy-promoted-card-assets/threats/red/red_event_trench_blast.png` | `public/assets/cards/threats/red/trench-blast.png` |
| `public/assets/riftfall/cards/threat-blue/blue_asset_sanctifier_beads.png` | `_archive/legacy-promoted-card-assets/threats/blue/blue_asset_sanctifier_beads.png` | `public/assets/cards/threats/blue/sanctifier-beads.png` |
| `public/assets/riftfall/cards/threat-blue/blue_encounter_hushed_chapel.png` | `_archive/legacy-promoted-card-assets/threats/blue/blue_encounter_hushed_chapel.png` | `public/assets/cards/threats/blue/hushed-chapel.png` |
| `public/assets/riftfall/cards/threat-blue/blue_enemy_choir_wraith.png` | `_archive/legacy-promoted-card-assets/threats/blue/blue_enemy_choir_wraith.png` | `public/assets/cards/threats/blue/choir-wraith.png` |
| `public/assets/riftfall/cards/threat-blue/blue_enemy_veil_censor.png` | `_archive/legacy-promoted-card-assets/threats/blue/blue_enemy_veil_censor.png` | `public/assets/cards/threats/blue/veil-censor.png` |
| `public/assets/riftfall/cards/threat-blue/blue_event_rift_whispers.png` | `_archive/legacy-promoted-card-assets/threats/blue/blue_event_rift_whispers.png` | `public/assets/cards/threats/blue/rift-whispers.png` |
| `public/assets/riftfall/cards/threat-yellow/yellow_asset_wireghost_key.png` | `_archive/legacy-promoted-card-assets/threats/yellow/yellow_asset_wireghost_key.png` | `public/assets/cards/threats/yellow/wireghost-key.png` |
| `public/assets/riftfall/cards/threat-yellow/yellow_encounter_locked_vault.png` | `_archive/legacy-promoted-card-assets/threats/yellow/yellow_encounter_locked_vault.png` | `public/assets/cards/threats/yellow/locked-vault.png` |
| `public/assets/riftfall/cards/threat-yellow/yellow_enemy_null_drone.png` | `_archive/legacy-promoted-card-assets/threats/yellow/yellow_enemy_null_drone.png` | `public/assets/cards/threats/yellow/null-drone.png` |
| `public/assets/riftfall/cards/threat-yellow/yellow_enemy_shiv_market_crew.png` | `_archive/legacy-promoted-card-assets/threats/yellow/yellow_enemy_shiv_market_crew.png` | `public/assets/cards/threats/yellow/shiv-market-crew.png` |
| `public/assets/riftfall/cards/threat-yellow/yellow_event_route_splice.png` | `_archive/legacy-promoted-card-assets/threats/yellow/yellow_event_route_splice.png` | `public/assets/cards/threats/yellow/route-splice.png` |

Retained legacy threat files:

- `public/assets/riftfall/cards/threat-red/card_back_threat_red.png`
- `public/assets/riftfall/cards/threat-blue/card_back_threat_blue.png`
- `public/assets/riftfall/cards/threat-yellow/card_back_threat_yellow.png`

Prompt/reference handling:

- Promoted threat prompt paths in `generated/manual-image-prompts-all.txt` and `src/game/assets/design/cardArtPrompts.ts` were retargeted to the active lane folders.
- Remaining `public/assets/riftfall/cards/threat-*` mentions are historical reports, archived-file paths, card-back references, or legacy prompt IDs, not runtime asset paths.

## Contract Source Archive Follow-up

Commit pass: `archive-promoted-legacy-contract-assets`

The 9 selected legacy contract sources were promoted in `promote-selected-legacy-contract-assets` and then archived after SHA-256 verification against their active replacements.

| legacy source | archive path | active replacement |
|---|---|---|
| `public/assets/riftfall/cards/contracts/mission_break_the_raider_chain.png` | `_archive/legacy-promoted-card-assets/contracts/mission_break_the_raider_chain.png` | `public/assets/cards/contracts/break-the-raider-chain.png` |
| `public/assets/riftfall/cards/contracts/mission_hunt_breachborn.png` | `_archive/legacy-promoted-card-assets/contracts/mission_hunt_breachborn.png` | `public/assets/cards/contracts/hunt-breachborn.png` |
| `public/assets/riftfall/cards/contracts/mission_map_broken_paths.png` | `_archive/legacy-promoted-card-assets/contracts/mission_map_broken_paths.png` | `public/assets/cards/contracts/map-broken-paths.png` |
| `public/assets/riftfall/cards/contracts/mission_gatefire_vigil.png` | `_archive/legacy-promoted-card-assets/contracts/mission_gatefire_vigil.png` | `public/assets/cards/contracts/gatefire-vigil.png` |
| `public/assets/riftfall/cards/contracts/mission_salvage_the_bellframe.png` | `_archive/legacy-promoted-card-assets/contracts/mission_salvage_the_bellframe.png` | `public/assets/cards/contracts/salvage-the-bellframe.png` |
| `public/assets/riftfall/cards/contracts/mission_restart_void_relay.png` | `_archive/legacy-promoted-card-assets/contracts/mission_restart_void_relay.png` | `public/assets/cards/contracts/restart-void-relay.png` |
| `public/assets/riftfall/cards/contracts/mission_pilgrim_convoy.png` | `_archive/legacy-promoted-card-assets/contracts/mission_pilgrim_convoy.png` | `public/assets/cards/contracts/pilgrim-convoy.png` |
| `public/assets/riftfall/cards/contracts/mission_choir_quietus.png` | `_archive/legacy-promoted-card-assets/contracts/mission_choir_quietus.png` | `public/assets/cards/contracts/choir-quietus.png` |
| `public/assets/riftfall/cards/contracts/mission_cleanse_ember_sanctum.png` | `_archive/legacy-promoted-card-assets/contracts/mission_cleanse_ember_sanctum.png` | `public/assets/cards/contracts/cleanse-ember-sanctum.png` |

Retained legacy contract files:

- `public/assets/riftfall/cards/contracts/mission_lattice_witness.png`
- `public/assets/riftfall/cards/contracts/mission_hold_the_ridge.png`
- `public/assets/riftfall/cards/contracts/mission_span_of_the_last_seal.png`
- `public/assets/riftfall/cards/contracts/card_back_contract.png`

Contract card-art prompt paths for promoted mission IDs were retargeted to active `public/assets/cards/contracts/` paths. Heat stayed deprecated/reference-only, and no `/assets/cards/heat/` path was created.

## Final Legacy Boundary

Commit pass: `finalize-legacy-card-asset-boundary`

After the Equipment, Artifact/Relic, Threat, and Contract promotion/archive passes, `public/assets/riftfall/cards/` is no longer an active runtime card-art source. It remains only for deferred, reference, and prompt-only material.

Active runtime card roots are:

- `public/assets/cards/threats/red/`
- `public/assets/cards/threats/blue/`
- `public/assets/cards/threats/yellow/`
- `public/assets/cards/contracts/`
- `public/assets/cards/anomalies/`
- `public/assets/cards/artifacts/`
- `public/assets/cards/equipment/`
- `public/assets/cards/scars/`
- `public/assets/cards/escalations/`
- `public/assets/cards/fallbacks/`

Remaining legacy files are limited to:

- Heat files, deprecated/reference-only.
- Route-note files, reference-only.
- Deferred contracts: `mission_lattice_witness.png`, `mission_hold_the_ridge.png`, `mission_span_of_the_last_seal.png`.
- Deferred artifact: `relic_choir_route_orb.png`.
- Card backs for contracts, threats, artifacts, and wargear.

Runtime boundary confirmation:

- browser/client runtime source does not reference `/assets/riftfall/cards/`
- runtime card art catalog paths resolve under `/assets/cards/`
- no active path emits `/assets/cards/heat/`
- deferred/reference legacy files are not active card-art entries

Current `audit:assets` result: 404/404 present.
