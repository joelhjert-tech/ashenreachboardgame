# Anomaly PNG Asset Import Final

Date: 2026-07-03

## Executive Summary

Phase 5F2 selectively imported the 20 safe anomaly PNG replacements from `stash@{0}: wip-anomaly-png-assets-before-phase-4d`.

Only files under `public/assets/cards/anomalies/` were restored from the stash. No threat, scenario, Riftfall, board tile, bundle, code, JSON, resolver, or non-anomaly files were imported or changed.

All 20 imported files exactly match active anomaly content IDs and decode as valid PNG images at `1086x1448`.

## Source Stash

- `stash@{0}: On cleanup/remove-threejs: wip-anomaly-png-assets-before-phase-4d`

Selective import guardrails used:

- inspected with `git stash show --name-only 'stash@{0}'`
- confirmed all stashed paths were `public/assets/cards/anomalies/*.png`
- confirmed the stash contained exactly 20 PNGs
- restored only those 20 explicit paths

## Imported / Replaced Files

| Target path | Dimensions | Decode check | Active anomaly ID match |
| --- | --- | --- | --- |
| `public/assets/cards/anomalies/anomaly-ashfall-murmur.png` | `1086x1448` | ok | yes |
| `public/assets/cards/anomalies/anomaly-bellrain-inversion.png` | `1086x1448` | ok | yes |
| `public/assets/cards/anomalies/anomaly-blackstar-breath.png` | `1086x1448` | ok | yes |
| `public/assets/cards/anomalies/anomaly-choir-static.png` | `1086x1448` | ok | yes |
| `public/assets/cards/anomalies/anomaly-cinder-gate-echo.png` | `1086x1448` | ok | yes |
| `public/assets/cards/anomalies/anomaly-cinder-mirage-lane.png` | `1086x1448` | ok | yes |
| `public/assets/cards/anomalies/anomaly-crownfall-echo-court.png` | `1086x1448` | ok | yes |
| `public/assets/cards/anomalies/anomaly-glassmere.png` | `1086x1448` | ok | yes |
| `public/assets/cards/anomalies/anomaly-gutter-star-orbit.png` | `1086x1448` | ok | yes |
| `public/assets/cards/anomalies/anomaly-marrow-clock-drift.png` | `1086x1448` | ok | yes |
| `public/assets/cards/anomalies/anomaly-red-suture-field.png` | `1086x1448` | ok | yes |
| `public/assets/cards/anomalies/anomaly-relay-ghost-loop.png` | `1086x1448` | ok | yes |
| `public/assets/cards/anomalies/anomaly-saint-static-aperture.png` | `1086x1448` | ok | yes |
| `public/assets/cards/anomalies/anomaly-saltglass-fata-morgana.png` | `1086x1448` | ok | yes |
| `public/assets/cards/anomalies/anomaly-scar-tide-lattice.png` | `1086x1448` | ok | yes |
| `public/assets/cards/anomalies/anomaly-table-fire-writ.png` | `1086x1448` | ok | yes |
| `public/assets/cards/anomalies/anomaly-throne-shadow-jury.png` | `1086x1448` | ok | yes |
| `public/assets/cards/anomalies/anomaly-void-salt-tide.png` | `1086x1448` | ok | yes |
| `public/assets/cards/anomalies/anomaly-warbell-parallax.png` | `1086x1448` | ok | yes |
| `public/assets/cards/anomalies/anomaly-webglass-stutter.png` | `1086x1448` | ok | yes |

## Active Path Confirmation

The active anomaly art path remains:

- `public/assets/cards/anomalies/[anomalyId].png`

No resolver, manifest, or content path changed in this pass.

## Verification

Commands run:

- `npm.cmd run validate:content` passed
- `npm.cmd run typecheck` passed
- `npm.cmd run test:engine` passed, 207 tests
- `npm.cmd run test:client` passed, 136 tests
- `npm.cmd run test` passed, 511 tests
- `npm.cmd run build` passed with the known Vite large chunk warning
- `npm.cmd run audit:assets` passed

Final asset audit result:

- `402/402 present`
- `0 missing`
- `0 invalid`
- `0 placeholders`
- `0 releaseBlocking`

## Browser QA

Browser QA was performed against the live Vite app after import.

Routes checked:

- `/tv` at `1920x1080`
- `/tv` at `1366x768`
- `/` at `390x844`

Direct anomaly image URLs checked:

- `/assets/cards/anomalies/anomaly-ashfall-murmur.png`
- `/assets/cards/anomalies/anomaly-blackstar-breath.png`
- `/assets/cards/anomalies/anomaly-choir-static.png`
- `/assets/cards/anomalies/anomaly-glassmere.png`
- `/assets/cards/anomalies/anomaly-webglass-stutter.png`

Browser QA acceptance:

- no broken anomaly image paths
- no console/page errors
- `canvasCount: 0`
- local dev ports `5173` and `2385` were clear after QA

## Confirmation

No non-anomaly files were imported.

No stashes were applied wholesale.

`stash@{0}` was intentionally left in place for a later stash cleanup pass.
