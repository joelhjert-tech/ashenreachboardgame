# Legacy Promoted Card Assets Archive

Baseline: `17d8c34 add-artifact-relic-assets-and-cleanup-audit`

This pass archives only legacy source images that now have active, verified copies under `public/assets/cards/`.

Archive root:

- `_archive/legacy-promoted-card-assets/equipment/`
- `_archive/legacy-promoted-card-assets/artifacts/`

No active runtime assets were moved. No gameplay, content balance, movement, battle, shop, mission, multiplayer, scar, scenario, or lobby mechanics changed.

## Verification Method

Each archived source was compared against its active replacement by:

- SHA-256 file hash
- image dimensions
- reference search for old active runtime/prompt paths

All archived files were exact hash matches with their active replacements.

## Archived Equipment Sources

| archive path | active replacement path |
|---|---|
| `_archive/legacy-promoted-card-assets/equipment/weapon_ashlock_cleaver.png` | `public/assets/cards/equipment/ashlock-cleaver.png` |
| `_archive/legacy-promoted-card-assets/equipment/weapon_signal_pike.png` | `public/assets/cards/equipment/signal-pike.png` |
| `_archive/legacy-promoted-card-assets/equipment/armor_mirecoil_wardcloak.png` | `public/assets/cards/equipment/mirecoil-wardcloak.png` |
| `_archive/legacy-promoted-card-assets/equipment/armor_saintplate_harness.png` | `public/assets/cards/equipment/saintplate-harness.png` |
| `_archive/legacy-promoted-card-assets/equipment/consumable_cinder_stim_ampoule.png` | `public/assets/cards/equipment/cinder-stim-ampoule.png` |
| `_archive/legacy-promoted-card-assets/equipment/consumable_voidsalt_poultice.png` | `public/assets/cards/equipment/voidsalt-poultice.png` |
| `_archive/legacy-promoted-card-assets/equipment/wargear_riftblade.png` | `public/assets/cards/equipment/riftblade.png` |
| `_archive/legacy-promoted-card-assets/equipment/wargear_scrap_drone.png` | `public/assets/cards/equipment/scrap-drone.png` |
| `_archive/legacy-promoted-card-assets/equipment/wargear_void_plate.png` | `public/assets/cards/equipment/void-plate.png` |

## Archived Artifact / Relic Sources

| archive path | active replacement path |
|---|---|
| `_archive/legacy-promoted-card-assets/artifacts/artifact_choir_lantern.png` | `public/assets/cards/artifacts/artifact-choir-lantern.png` |
| `_archive/legacy-promoted-card-assets/artifacts/artifact_route_star.png` | `public/assets/cards/artifacts/artifact-route-star.png` |
| `_archive/legacy-promoted-card-assets/artifacts/artifact_void_key.png` | `public/assets/cards/artifacts/artifact-void-key.png` |
| `_archive/legacy-promoted-card-assets/artifacts/relic_oathchain_lens.png` | `public/assets/cards/artifacts/artifact-oathchain-lens.png` |

## Deliberately Retained Legacy Files

The following legacy files were not archived:

- `public/assets/riftfall/cards/wargear/card_back_wargear.png`
- `public/assets/riftfall/cards/artifacts/card_back_artifact.png`
- `public/assets/riftfall/cards/gear/relic_choir_route_orb.png`
- all Heat files
- all route-note files
- all contract files
- all threat files

Reasons:

- Card backs are reference/template assets and were not promoted.
- `relic_choir_route_orb.png` remains deferred because the artifact card cap is full.
- Heat is deprecated and remains reference-only.
- Route-note, contract, and threat cleanup is out of scope for this pass.

## Prompt References

Promoted Wargear and Artifact prompt seed paths were retargeted to active card-art paths where the prompt source still referenced promoted legacy locations. Generated prompt outputs were regenerated afterward.

Remaining old-path mentions are historical audit/report references, not active runtime or prompt-generation dependencies.
