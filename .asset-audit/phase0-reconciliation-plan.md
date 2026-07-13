# Phase 0 Reconciliation Plan

Branch: `codex/asset-state-cleanup`

Baseline commands saved:

- `.asset-audit/phase0-baseline-audit-assets.txt`
- `.asset-audit/phase0-baseline-validate-content.txt`

Baseline asset audit:

- Expected: 291
- Present: 155
- Missing: 136

Baseline content validation:

- Passed
- `12 characters, 16 gear, 60 threats, 21 contracts, 20 anomalies, 20 artifacts, 15 followers, 15 scars, 16 escalations`

No source files, manifest files, data model files, or assets have been edited in Phase 0. The only new files are baseline audit artifacts and contact sheets under `.asset-audit/`.

## Proposed Phase 1 Moves, Renames, Rewires, and Deletes

Phase 1 will reconcile drift only. No new art will be generated.

## Board Full Background

Use the existing TV-ready board as the canonical full board asset.

- Move/rename `public/assets/riftfall/board/full-board/ashen_reach_tv_board_v2.png` -> `public/assets/riftfall/board/full-board/ashen_reach_board_main.png`
- Proposed delete after review: `public/assets/riftfall/board/full-board/riftfall_board_main.png`

Rationale: `ashen_reach_tv_board_v2.png` is the stronger runtime source for the TV board background. `riftfall_board_main.png` appears to be an older full-board alternate.

## Board Tile Drift

Move old tile filenames to the canonical manifest paths, and rewire the TV board static references where needed.

- Move/rename `public/assets/riftfall/board/tiles/outer/outer_st_antias_sanctuary.png` -> `public/assets/riftfall/board/tiles/outer/outer_saint_sanctuary.png`
- Rewire `src/client/tv/TalismanBoardSurface.tsx` reference for `outer_ember_sanctum` to `/assets/riftfall/board/tiles/outer/outer_saint_sanctuary.png`
- Move/rename `public/assets/riftfall/board/tiles/outer/outer_hive_city.png` -> `public/assets/riftfall/board/tiles/outer/outer_ashstack_city.png`
- Move/rename `public/assets/riftfall/board/tiles/middle/middle_hive_sprawl.png` -> `public/assets/riftfall/board/tiles/middle/middle_ashstack_sprawl.png`
- Rewire `src/client/tv/TalismanBoardSurface.tsx` reference for `middle_shard_sprawl` to `/assets/riftfall/board/tiles/middle/middle_ashstack_sprawl.png`
- Move/rename `public/assets/riftfall/board/tiles/middle/middle_riftspawn_pit.png` -> `public/assets/riftfall/board/tiles/middle/middle_breachspawn_pit.png`
- Rewire `src/client/tv/TalismanBoardSurface.tsx` reference for `middle_rivalry_pit` to `/assets/riftfall/board/tiles/middle/middle_breachspawn_pit.png`

## Missions to Contracts

Create `public/assets/riftfall/cards/contracts/` if needed, then move/rename mission assets to canonical contract paths.

- Move/rename `public/assets/riftfall/cards/missions/card_back_mission.png` -> `public/assets/riftfall/cards/contracts/card_back_contract.png`
- Move/rename `public/assets/riftfall/cards/missions/mission_break_the_raider_chain.png` -> `public/assets/riftfall/cards/contracts/mission_break_the_raider_chain.png`
- Move/rename `public/assets/riftfall/cards/missions/mission_choir_quietus.png` -> `public/assets/riftfall/cards/contracts/mission_choir_quietus.png`
- Move/rename `public/assets/riftfall/cards/missions/mission_cleanse_ember_sanctum.png` -> `public/assets/riftfall/cards/contracts/mission_cleanse_ember_sanctum.png`
- Move/rename `public/assets/riftfall/cards/missions/mission_gatefire_vigil.png` -> `public/assets/riftfall/cards/contracts/mission_gatefire_vigil.png`
- Move/rename `public/assets/riftfall/cards/missions/mission_hold_the_ridge.png` -> `public/assets/riftfall/cards/contracts/mission_hold_the_ridge.png`
- Move/rename `public/assets/riftfall/cards/missions/mission_hunt_riftspawn.png` -> `public/assets/riftfall/cards/contracts/mission_hunt_breachborn.png`
- Move/rename `public/assets/riftfall/cards/missions/mission_lattice_witness.png` -> `public/assets/riftfall/cards/contracts/mission_lattice_witness.png`
- Move/rename `public/assets/riftfall/cards/missions/mission_map_broken_paths.png` -> `public/assets/riftfall/cards/contracts/mission_map_broken_paths.png`
- Move/rename `public/assets/riftfall/cards/missions/mission_pilgrim_convoy.png` -> `public/assets/riftfall/cards/contracts/mission_pilgrim_convoy.png`
- Move/rename `public/assets/riftfall/cards/missions/mission_restart_void_relay.png` -> `public/assets/riftfall/cards/contracts/mission_restart_void_relay.png`
- Move/rename `public/assets/riftfall/cards/missions/mission_salvage_the_bellframe.png` -> `public/assets/riftfall/cards/contracts/mission_salvage_the_bellframe.png`
- Move/rename `public/assets/riftfall/cards/missions/mission_span_of_the_last_seal.png` -> `public/assets/riftfall/cards/contracts/mission_span_of_the_last_seal.png`
- Proposed delete after review: `public/assets/cards/missions/hold-the-ridge.png`

## Power to Route Notes

Inspection confirms the old `power` deck assets are route-note style assets.

- Create `public/assets/riftfall/cards/route-notes/` if needed
- Move/rename `public/assets/riftfall/cards/power/card_back_power.png` -> `public/assets/riftfall/cards/route-notes/card_back_route_note.png`
- Move/rename `public/assets/riftfall/cards/power/power_card_command_burst.png` -> `public/assets/riftfall/cards/route-notes/route_note_command_burst.png`
- Move/rename `public/assets/riftfall/cards/power/power_card_last_second.png` -> `public/assets/riftfall/cards/route-notes/route_note_last_second.png`
- Move/rename `public/assets/riftfall/cards/power/power_card_rift_focus.png` -> `public/assets/riftfall/cards/route-notes/route_note_rift_focus.png`

## Corruption to Heat

Inspection confirms the old `corruption` deck assets are heat/scar-pressure style assets.

- Create `public/assets/riftfall/cards/heat/` if needed
- Move/rename `public/assets/riftfall/cards/corruption/card_back_corruption.png` -> `public/assets/riftfall/cards/heat/card_back_heat.png`
- Move/rename `public/assets/riftfall/cards/corruption/corruption_card_black_mirror.png` -> `public/assets/riftfall/cards/heat/heat_card_black_mirror.png`
- Move/rename `public/assets/riftfall/cards/corruption/corruption_card_hollow_voice.png` -> `public/assets/riftfall/cards/heat/heat_card_hollow_voice.png`
- Move/rename `public/assets/riftfall/cards/corruption/corruption_card_rift_scar.png` -> `public/assets/riftfall/cards/heat/heat_card_rift_scar.png`

## Relics to Artifacts

Inspection confirms the old `relics` deck assets are artifact-style assets.

- Move/rename `public/assets/riftfall/cards/relics/card_back_relic.png` -> `public/assets/riftfall/cards/artifacts/card_back_artifact.png`
- Move/rename `public/assets/riftfall/cards/relics/relic_choir_lantern.png` -> `public/assets/riftfall/cards/artifacts/artifact_choir_lantern.png`
- Move/rename `public/assets/riftfall/cards/relics/relic_saint_antias_star.png` -> `public/assets/riftfall/cards/artifacts/artifact_route_star.png`
- Move/rename `public/assets/riftfall/cards/relics/relic_void_key.png` -> `public/assets/riftfall/cards/artifacts/artifact_void_key.png`
- Move/rename `public/assets/cards/artifacts/gate-saint-key.png` -> `public/assets/cards/artifacts/artifact-gate-saint-key.png`

## Anomaly Filename Drift

Existing anomaly art is missing the canonical `anomaly-` prefix expected by the generated prompts.

- Move/rename `public/assets/cards/anomalies/cinder-gate-echo.png` -> `public/assets/cards/anomalies/anomaly-cinder-gate-echo.png`
- Move/rename `public/assets/cards/anomalies/webglass-stutter.png` -> `public/assets/cards/anomalies/anomaly-webglass-stutter.png`

## Icons

Inspection confirms the old attribute/resource icons map cleanly to the canonical icon set.

- Move/rename `public/assets/riftfall/icons/icon_strength.svg` -> `public/assets/riftfall/icons/icon_grit.svg`
- Move/rename `public/assets/riftfall/icons/icon_willpower.svg` -> `public/assets/riftfall/icons/icon_signal.svg`
- Move/rename `public/assets/riftfall/icons/icon_cunning.svg` -> `public/assets/riftfall/icons/icon_guile.svg`
- Move/rename `public/assets/riftfall/icons/icon_life.svg` -> `public/assets/riftfall/icons/icon_wounds.svg`
- Move/rename `public/assets/riftfall/icons/icon_influence.svg` -> `public/assets/riftfall/icons/icon_trophy.svg`
- Move/rename `public/assets/riftfall/icons/icon_corruption.svg` -> `public/assets/riftfall/icons/icon_heat.svg`
- Move/rename `public/assets/riftfall/icons/icon_relic.svg` -> `public/assets/riftfall/icons/icon_artifact.svg`
- Move/rename `public/assets/riftfall/icons/icon_power.svg` -> `public/assets/riftfall/icons/icon_route_note.svg`

## Tokens

Inspection confirms old mission/influence tokens map to contract-progress/trophy.

- Move/rename `public/assets/riftfall/tokens/token_mission_progress.png` -> `public/assets/riftfall/tokens/token_contract_progress.png`
- Move/rename `public/assets/riftfall/tokens/token_influence.png` -> `public/assets/riftfall/tokens/token_trophy.png`

## Obsolete Prototype Threat Cards

These old color-deck card images are not referenced by the current content model or manifest. Proposed delete after review.

- Delete `public/assets/riftfall/cards/threat-blue/blue_asset_sanctifier_beads.png`
- Delete `public/assets/riftfall/cards/threat-blue/blue_encounter_hushed_chapel.png`
- Delete `public/assets/riftfall/cards/threat-blue/blue_enemy_choir_wraith.png`
- Delete `public/assets/riftfall/cards/threat-blue/blue_enemy_veil_censor.png`
- Delete `public/assets/riftfall/cards/threat-blue/blue_event_rift_whispers.png`
- Delete `public/assets/riftfall/cards/threat-red/red_asset_breach_halberd.png`
- Delete `public/assets/riftfall/cards/threat-red/red_encounter_shattered_barricade.png`
- Delete `public/assets/riftfall/cards/threat-red/red_enemy_cinder_hounds.png`
- Delete `public/assets/riftfall/cards/threat-red/red_enemy_red_maw_raiders.png`
- Delete `public/assets/riftfall/cards/threat-red/red_event_trench_blast.png`
- Delete `public/assets/riftfall/cards/threat-yellow/yellow_asset_wireghost_key.png`
- Delete `public/assets/riftfall/cards/threat-yellow/yellow_encounter_locked_vault.png`
- Delete `public/assets/riftfall/cards/threat-yellow/yellow_enemy_null_drone.png`
- Delete `public/assets/riftfall/cards/threat-yellow/yellow_enemy_shiv_market_crew.png`
- Delete `public/assets/riftfall/cards/threat-yellow/yellow_event_route_splice.png`

## Other Unmanifested Non-Scratch Files

These are not clearly scratch files. Proposed handling is listed for review.

- Keep `public/assets/riftfall/characters/char_ker_von_ker.png`; referenced by content and shared asset path logic
- Keep `public/assets/riftfall/characters/char_kira_dog.png`; referenced by content and shared asset path logic
- Proposed delete after review: `public/assets/riftfall/characters/char_kebab_falaffel.png`; unreferenced portrait with noncanonical name
- Proposed delete after review: `public/assets/riftfall/scenarios/scenario_broken_seal-v2.png`; unmanifested duplicate scenario sheet candidate
- Proposed delete after review: `public/assets/riftfall/ui/ui_phone_character_sheet_template.png`; unmanifested UI template/reference image
- Proposed delete after review: `public/assets/cards/scars/wound.png`; unmanifested old scar/wound image
- Keep `public/assets/riftfall/ui/placeholder_missing_asset.png`; fallback placeholder
- Keep `public/assets/cards/fallbacks/*.svg`; fallback assets, intentionally outside the manifest

## Scratch and Temp File Deletes

These match the user-approved junk patterns: numeric-only names and keyboard-mash names. Delete autonomously in Phase 1 and list again in the pass summary.

- Delete `public/assets/riftfall/board/center/443434.png`
- Delete `public/assets/riftfall/board/tiles/inner/343434.png`
- Delete `public/assets/riftfall/board/tiles/inner/44.png`
- Delete `public/assets/riftfall/board/tiles/inner/4444.png`
- Delete `public/assets/riftfall/board/tiles/inner/4656.png`
- Delete `public/assets/riftfall/board/tiles/inner/55555.png`
- Delete `public/assets/riftfall/board/tiles/inner/asdasdasd.png`
- Delete `public/assets/riftfall/board/tiles/inner/sdsdsd.png`
- Delete `public/assets/riftfall/cards/corruption/2.png`
- Delete `public/assets/riftfall/cards/missions/44.png`
- Delete `public/assets/riftfall/cards/power/66.png`
- Delete `public/assets/riftfall/cards/relics/33.png`
- Delete `public/assets/riftfall/cards/threat-blue/55.png`
- Delete `public/assets/riftfall/cards/threat-red/22.png`
- Delete `public/assets/riftfall/cards/threat-yellow/6666.png`
- Delete `public/assets/riftfall/cards/wargear/4545.png`
- Delete `public/assets/riftfall/characters/1.png`
- Delete `public/assets/riftfall/characters/2.png`
- Delete `public/assets/riftfall/characters/55.png`
- Delete `public/assets/riftfall/characters/5656.png`
- Delete `public/assets/riftfall/characters/66.png`
- Delete `public/assets/riftfall/characters/88.png`

## Empty Directory Cleanup

Remove these directories if they are empty after approved moves/deletes:

- `public/assets/riftfall/cards/missions/`
- `public/assets/riftfall/cards/power/`
- `public/assets/riftfall/cards/corruption/`
- `public/assets/riftfall/cards/relics/`

## Expected Phase 1 Audit Direction

The exact count must be verified by rerunning `npm run audit:assets` after Phase 1. Based on the drift found here, this pass should resolve approximately these missing categories:

- Full board: 1
- Board tiles: 4
- Card backs: 4
- Mission/contract legacy assets: 12
- Route notes: 3
- Heat: 3
- Artifact drift: 4
- Anomaly filename drift: 2
- Icons: 8
- Tokens: 2

Expected missing reduction: about 43, from 136 to about 93, before any generated art. Treat this as a planning estimate only; the post-Phase 1 audit is authoritative.

## Likely True Gaps After Reconciliation

To be verified after Phase 1, not assumed:

- Generated threat card art
- Most generated contract card art beyond old mission art
- Most generated anomaly card art beyond the two filename-prefix drifts
- Most generated artifact card art beyond relic/sample drift
- Generated scar card art
- Generated escalation card art
- Four scenario sheets
