# Anomaly PNG Asset Review

Date: 2026-07-03

## Executive Summary

Phase 5F1 inspected `stash@{0}: wip-anomaly-png-assets-before-phase-4d` without applying it.

The stash contains modified PNGs for all 20 active anomaly card IDs under `public/assets/cards/anomalies/`. Every stashed filename is an exact active anomaly content-ID match, and every current active anomaly PNG already exists.

No files were moved, copied, deleted, renamed, or overwritten in this audit pass.

## Stash Inspected

- `stash@{0}: On cleanup/remove-threejs: wip-anomaly-png-assets-before-phase-4d`

Inspection commands used:

- `git stash show --name-only 'stash@{0}'`
- `git stash show --stat 'stash@{0}'`

Patch inspection was not useful because all stash changes are binary PNG replacements.

## Files Reviewed

| File | Active ID Match | Current | Stashed | Classification |
| --- | --- | --- | --- | --- |
| `public/assets/cards/anomalies/anomaly-ashfall-murmur.png` | yes | `1024x1536`, 340407 bytes | `1086x1448`, 2784464 bytes | visual upgrade candidate |
| `public/assets/cards/anomalies/anomaly-bellrain-inversion.png` | yes | `1024x1536`, 329717 bytes | `1086x1448`, 3035437 bytes | visual upgrade candidate |
| `public/assets/cards/anomalies/anomaly-blackstar-breath.png` | yes | `1024x1536`, 314903 bytes | `1086x1448`, 3290270 bytes | visual upgrade candidate |
| `public/assets/cards/anomalies/anomaly-choir-static.png` | yes | `1024x1536`, 314032 bytes | `1086x1448`, 3020694 bytes | visual upgrade candidate |
| `public/assets/cards/anomalies/anomaly-cinder-gate-echo.png` | yes | `1086x1448`, 2821914 bytes | `1086x1448`, 2859225 bytes | visual replacement candidate |
| `public/assets/cards/anomalies/anomaly-cinder-mirage-lane.png` | yes | `1024x1536`, 340589 bytes | `1086x1448`, 2881786 bytes | visual upgrade candidate |
| `public/assets/cards/anomalies/anomaly-crownfall-echo-court.png` | yes | `1024x1536`, 351389 bytes | `1086x1448`, 3236970 bytes | visual upgrade candidate |
| `public/assets/cards/anomalies/anomaly-glassmere.png` | yes | `1086x1448`, 2959861 bytes | `1086x1448`, 3324060 bytes | visual replacement candidate |
| `public/assets/cards/anomalies/anomaly-gutter-star-orbit.png` | yes | `1024x1536`, 306472 bytes | `1086x1448`, 2878745 bytes | visual upgrade candidate |
| `public/assets/cards/anomalies/anomaly-marrow-clock-drift.png` | yes | `1024x1536`, 293637 bytes | `1086x1448`, 3385392 bytes | visual upgrade candidate |
| `public/assets/cards/anomalies/anomaly-red-suture-field.png` | yes | `1024x1536`, 313115 bytes | `1086x1448`, 3077078 bytes | visual upgrade candidate |
| `public/assets/cards/anomalies/anomaly-relay-ghost-loop.png` | yes | `1024x1536`, 311084 bytes | `1086x1448`, 2980000 bytes | visual upgrade candidate |
| `public/assets/cards/anomalies/anomaly-saint-static-aperture.png` | yes | `1024x1536`, 306148 bytes | `1086x1448`, 3165575 bytes | visual upgrade candidate |
| `public/assets/cards/anomalies/anomaly-saltglass-fata-morgana.png` | yes | `1024x1536`, 330296 bytes | `1086x1448`, 3049840 bytes | visual upgrade candidate |
| `public/assets/cards/anomalies/anomaly-scar-tide-lattice.png` | yes | `1024x1536`, 331049 bytes | `1086x1448`, 3235275 bytes | visual upgrade candidate |
| `public/assets/cards/anomalies/anomaly-table-fire-writ.png` | yes | `1024x1536`, 329202 bytes | `1086x1448`, 2943735 bytes | visual upgrade candidate |
| `public/assets/cards/anomalies/anomaly-throne-shadow-jury.png` | yes | `1086x1448`, 2884899 bytes | `1086x1448`, 2944969 bytes | visual replacement candidate |
| `public/assets/cards/anomalies/anomaly-void-salt-tide.png` | yes | `1024x1536`, 293649 bytes | `1086x1448`, 3459763 bytes | visual upgrade candidate |
| `public/assets/cards/anomalies/anomaly-warbell-parallax.png` | yes | `1024x1536`, 322647 bytes | `1086x1448`, 3206582 bytes | visual upgrade candidate |
| `public/assets/cards/anomalies/anomaly-webglass-stutter.png` | yes | `1086x1448`, 2588357 bytes | `1086x1448`, 3602899 bytes | visual replacement candidate |

## Active Anomaly ID Matches

All 20 stashed files match active anomaly content IDs from `content/cards/anomalies/`.

## Replacement Candidates

All 20 stashed files are replacement candidates for Phase 5F2 because:

- each filename exactly matches an active anomaly ID;
- each target file already exists under the active canonical anomaly folder;
- the stash path is already the canonical runtime target path;
- stashed files are real PNGs with readable dimensions;
- many current files are smaller generic purple anomaly images, while the stashed versions appear to be card-specific illustrated replacements.

## Unsafe / Ambiguous Files

No filename-level unsafe or unmatched files were found.

Remaining risk is visual/content-fit risk: this audit did not overwrite active art, so Phase 5F2 should still inspect or spot-check replacements before committing them.

## Files Skipped

All 20 stashed files were skipped in Phase 5F1 because this pass is audit-only.

## Recommended Phase 5F2 Import Plan

Proceed with a narrow Phase 5F2 import if the user wants the stashed anomaly art to become active:

1. Extract only these 20 PNGs from `stash@{0}`.
2. Copy them over the matching active files in `public/assets/cards/anomalies/`.
3. Do not apply the stash wholesale.
4. Do not touch threat, scenario, board tile, Riftfall, or bundle files.
5. Decode-check all 20 PNGs after copy.
6. Run `npm.cmd run audit:assets` and keep the baseline at `402/402 present`, `0 missing`, `0 invalid`, `0 placeholders`, `0 releaseBlocking`.
7. Browser-check at least one anomaly asset URL and the normal TV/phone routes if practical.

## Confirmation

No files were moved, copied, deleted, renamed, or overwritten during Phase 5F1.
