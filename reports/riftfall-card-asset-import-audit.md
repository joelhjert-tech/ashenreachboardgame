# Riftfall Card Asset Import Audit

Date: 2026-07-03

## Scope

Phase 5D reviewed `public/assets/riftfall/cards/` as a legacy/source folder. The folder was treated as quarantine/import material, not as the active Ashenreach card art root.

No files were imported in this pass because the legacy filenames do not safely match active content IDs, and the active card art audit is already green after Phase 5C.

## Active Runtime Direction

Active generated card art is resolved through:

- `src/game/assets/design/cardImageCatalog.ts`
- `src/game/assets/design/generatedCardImagePrompts.ts`
- `generated/card-image-prompts.json`
- `scripts/audit-assets.ts`

The active card art roots are:

- `public/assets/cards/threats/red/`
- `public/assets/cards/threats/blue/`
- `public/assets/cards/threats/yellow/`
- `public/assets/cards/contracts/`
- `public/assets/cards/anomalies/`
- `public/assets/cards/artifacts/`
- `public/assets/cards/scars/`
- `public/assets/cards/escalations/`

The current active card prompt catalog has `0` `/assets/riftfall/cards` outputs. The older design prompt files still reference `/assets/riftfall/cards` for sample card backs, sample mission/threat art, route notes, heat, artifacts, and wargear:

- `src/game/assets/design/cardArtPrompts.ts`
- `src/game/assets/design/cardTemplatePrompts.ts`
- `generated/manual-image-prompts-all.txt`

Those references are prompt/reference material, not evidence that the folder should be used for new active Ashenreach card art.

## Full Legacy Inventory

| Folder | Classification | Count | Files |
| --- | --- | ---: | --- |
| `artifacts` | artifact sample/reference | 4 | `artifact_choir_lantern.png`, `artifact_route_star.png`, `artifact_void_key.png`, `card_back_artifact.png` |
| `contracts` | contract / mission sample/reference | 13 | `card_back_contract.png`, `mission_break_the_raider_chain.png`, `mission_choir_quietus.png`, `mission_cleanse_ember_sanctum.png`, `mission_gatefire_vigil.png`, `mission_hold_the_ridge.png`, `mission_hunt_breachborn.png`, `mission_lattice_witness.png`, `mission_map_broken_paths.png`, `mission_pilgrim_convoy.png`, `mission_restart_void_relay.png`, `mission_salvage_the_bellframe.png`, `mission_span_of_the_last_seal.png` |
| `gear` | gear / wargear sample/reference | 8 | `armor_mirecoil_wardcloak.png`, `armor_saintplate_harness.png`, `consumable_cinder_stim_ampoule.png`, `consumable_voidsalt_poultice.png`, `relic_choir_route_orb.png`, `relic_oathchain_lens.png`, `weapon_ashlock_cleaver.png`, `weapon_signal_pike.png` |
| `heat` | heat sample/reference | 4 | `card_back_heat.png`, `heat_card_black_mirror.png`, `heat_card_hollow_voice.png`, `heat_card_rift_scar.png` |
| `route-notes` | route-note sample/reference | 4 | `card_back_route_note.png`, `route_note_command_burst.png`, `route_note_last_second.png`, `route_note_rift_focus.png` |
| `threat-blue` | old blue threat sample/reference | 6 | `blue_asset_sanctifier_beads.png`, `blue_encounter_hushed_chapel.png`, `blue_enemy_choir_wraith.png`, `blue_enemy_veil_censor.png`, `blue_event_rift_whispers.png`, `card_back_threat_blue.png` |
| `threat-red` | old red threat sample/reference | 6 | `card_back_threat_red.png`, `red_asset_breach_halberd.png`, `red_encounter_shattered_barricade.png`, `red_enemy_cinder_hounds.png`, `red_enemy_red_maw_raiders.png`, `red_event_trench_blast.png` |
| `threat-yellow` | old yellow threat sample/reference | 6 | `card_back_threat_yellow.png`, `yellow_asset_wireghost_key.png`, `yellow_encounter_locked_vault.png`, `yellow_enemy_null_drone.png`, `yellow_enemy_shiv_market_crew.png`, `yellow_event_route_splice.png` |
| `wargear` | wargear sample/reference | 4 | `card_back_wargear.png`, `wargear_riftblade.png`, `wargear_scrap_drone.png`, `wargear_void_plate.png` |

Total: 55 image files.

## Match Results

### Candidate Assets Matching Active Content IDs

None.

The audit compared exact filenames and normalized legacy names against active content IDs from:

- `content/cards/threats/`
- `content/cards/contracts/`
- `content/cards/anomalies/`
- `content/cards/artifacts/`
- `content/cards/scars/`
- `content/cards/escalations/`
- `content/gear/`

No exact or normalized legacy filename matched an active content ID.

### Candidate Assets That Could Replace Missing Active Assets

None.

`npm.cmd run audit:assets` currently reports all expected active assets present. The ten lane-based threat assets listed as missing before Phase 5C are now present under `public/assets/cards/threats/<lane>/`.

### Candidate Assets That Are Reference / Prompt-Only

All 55 files in `public/assets/riftfall/cards/` should remain available as legacy design and prompt-reference material for now.

### Assets With No Matching Active Content

All 55 files currently have no safe active content-ID match. The old mission, threat, route-note, heat, and wargear naming systems do not map cleanly to the active Ashenreach card content catalog.

### Assets Already Duplicated In `public/assets/cards`

None by exact or normalized filename.

There may be conceptual overlap, such as old artifact or gear themes, but no safe filename/content-ID match exists and active final art already exists where the current resolver expects it.

### Assets That Should Not Be Imported

All files should be skipped for active import in this pass.

Reasons:

- No active content-ID match.
- Active card art audit is already complete.
- Several folders (`route-notes`, `heat`, `wargear`) are older sample categories, not current active card image types in `cardImageCatalog.ts`.
- Threat assets use the old `threat-red`, `threat-blue`, `threat-yellow` folder naming and old sample IDs, not current lane-based active threat IDs.
- Importing would require speculative renaming or overwriting active final art.

## Recommended Canonical Target Paths

No import targets are recommended for this pass.

Future imports must use these patterns only after a verified content-ID match:

- Threat: `public/assets/cards/threats/[red|blue|yellow]/[cardId].png`
- Contract: `public/assets/cards/contracts/[contractId].png`
- Anomaly: `public/assets/cards/anomalies/[anomalyId].png`
- Artifact: `public/assets/cards/artifacts/[artifactId].png`
- Scar: `public/assets/cards/scars/[scarId].png`
- Escalation: `public/assets/cards/escalations/[escalationId].png`

Gear art is not currently part of the active `CARD_IMAGE_TYPES` runtime card-art catalog. If gear card art becomes active later, add an explicit resolver and tests before importing old `gear` or `wargear` samples.

## Overwrite Risk Notes

No overwrites were performed.

Overwriting active assets from `public/assets/cards/` with these legacy files would be high risk because active art is complete and the legacy filenames do not prove content identity.
