# Threat Asset Lane Migration

Phase 5B migrated active threat card art from the old flat folder into canonical `threatLane` folders.

## Canonical Structure

- `public/assets/cards/threats/red/`
- `public/assets/cards/threats/blue/`
- `public/assets/cards/threats/yellow/`

Folder mapping uses `threatLane` only:

- `red` = `threatLane: red`
- `blue` = `threatLane: blue`
- `yellow` = `threatLane: yellow`

`enemyFamily` was not used for folder mapping. It remains metadata for theme, faction, filtering, and rules.

## Counts

- Total threat JSON files: 94
- Red authored threats: 21
- Blue authored threats: 30
- Yellow authored threats: 43

## PNG Migration

- Total PNGs moved: 84
- Red PNGs moved: 19
- Blue PNGs moved: 27
- Yellow PNGs moved: 38

The old flat active threat folder contains no direct `.png` files after migration.

## Missing PNGs After Migration

- `/assets/cards/threats/red/ash-cinder-runt.png` - beast/red
- `/assets/cards/threats/yellow/bridge-toll-runt.png` - bureaucracy/yellow
- `/assets/cards/threats/blue/cracked-censer-novice.png` - choir/blue
- `/assets/cards/threats/blue/glasswing-midge-cloud.png` - vermin/blue
- `/assets/cards/threats/blue/gutter-bell-mite.png` - vermin/blue
- `/assets/cards/threats/red/lantern-ash-ghoul.png` - revenant/red
- `/assets/cards/threats/yellow/rust-mote-drone.png` - machine/yellow
- `/assets/cards/threats/yellow/soot-stained-cutpurse.png` - human/yellow
- `/assets/cards/threats/yellow/toll-scrip-urchins.png` - human/yellow
- `/assets/cards/threats/yellow/wire-chewer-pack.png` - beast/yellow

These remain intentionally missing for Phase 5C generation/import.

## Reference Audit

Active flat threat card paths were removed from source, generated prompt manifests, tests, and docs.

Remaining `riftfall/cards/threat-*` references are legacy Riftfall prompt/card-back paths and were not changed in this pass.

`public/assets/riftfall` was not touched.
