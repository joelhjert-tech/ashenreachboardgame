# Missing Threat Art Import

Date: 2026-07-03

## Scope

Phase 5C imported only the ten missing threat card PNGs reported by the asset audit after the threat lane migration. No mechanics, UI, content JSON, board tiles, scenario art, anomaly art, or legacy Riftfall folders were changed.

## Prompt Source

The card prompts and canonical output paths were already present in:

- `generated/card-image-prompts.json`
- `src/game/assets/design/generatedCardImagePrompts.ts`

Images were generated from those prompt entries using the built-in image generation path, then copied into the canonical lane folders under `public/assets/cards/threats/`.

Generated originals remain in the Codex generated image folder. The workspace copies were edge-cleaned to remove watermark-like lower-right generation artifacts while preserving the final card dimensions.

## Imported Files

All imported files decode as PNG and are `1086x1448`.

| Lane | Card ID | File |
| --- | --- | --- |
| Red | `ash-cinder-runt` | `public/assets/cards/threats/red/ash-cinder-runt.png` |
| Red | `lantern-ash-ghoul` | `public/assets/cards/threats/red/lantern-ash-ghoul.png` |
| Blue | `cracked-censer-novice` | `public/assets/cards/threats/blue/cracked-censer-novice.png` |
| Blue | `glasswing-midge-cloud` | `public/assets/cards/threats/blue/glasswing-midge-cloud.png` |
| Blue | `gutter-bell-mite` | `public/assets/cards/threats/blue/gutter-bell-mite.png` |
| Yellow | `bridge-toll-runt` | `public/assets/cards/threats/yellow/bridge-toll-runt.png` |
| Yellow | `rust-mote-drone` | `public/assets/cards/threats/yellow/rust-mote-drone.png` |
| Yellow | `soot-stained-cutpurse` | `public/assets/cards/threats/yellow/soot-stained-cutpurse.png` |
| Yellow | `toll-scrip-urchins` | `public/assets/cards/threats/yellow/toll-scrip-urchins.png` |
| Yellow | `wire-chewer-pack` | `public/assets/cards/threats/yellow/wire-chewer-pack.png` |

## Validation Notes

- PNG signature and IHDR dimensions were checked for all ten files.
- Representative visual spot checks were performed for:
  - `red/ash-cinder-runt.png`
  - `blue/cracked-censer-novice.png`
  - `yellow/wire-chewer-pack.png`
- `npm.cmd run audit:assets` should now treat these ten threat card references as present.
