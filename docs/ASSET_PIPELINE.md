# Asset Pipeline

Assets are runtime data. Do not delete an asset just because TypeScript does not import it directly; many assets are referenced through JSON, generated prompt catalogs, or runtime manifest functions.

## Runtime Asset Roots

- Current board tiles: `public/assets/map/tiles/`
- Current board base/region/corner assets: `public/assets/map/board/`, `public/assets/map/corners/`
- Current generated card art: `public/assets/cards/`
- Runtime portraits, nemeses, tokens, UI frames: `public/assets/riftfall/`
- Fallback card art: `public/assets/cards/fallbacks/`

## Manifests And Lookups

- Board tile manifest: `src/client/tv/tileAssetManifest.ts`
- Board runtime asset list: `src/client/tv/mapAssetRegistry.ts`
- Runtime portrait/frame lookups: `src/client/shared/assetPaths.ts`
- Prompt manifest root: `src/game/assets/design/imagePrompts.ts`
- Generated card image prompt catalog: `src/game/assets/design/generatedCardImagePrompts.ts`
- Card fallback and output directories: `src/game/assets/design/cardImageCatalog.ts`

## Naming

- Board tile PNGs in the current map system use `map_tile_*` names under `public/assets/map/tiles/`.
- Card art generated from content uses the card ID as the PNG filename under `public/assets/cards/<type>/`.
- Runtime character portraits use character IDs where possible.
- Avoid adding mockups, prompt sheets, or contact sheets to runtime asset folders.

## Validation

Run:

```bash
npm run audit:assets
```

Current baseline from this cleanup audit:

- 402 expected assets
- 392 present
- 10 missing threat card PNGs
- 0 invalid assets
- 0 placeholder violations

The missing baseline threat images are:

- `/assets/cards/threats/ash-cinder-runt.png`
- `/assets/cards/threats/bridge-toll-runt.png`
- `/assets/cards/threats/cracked-censer-novice.png`
- `/assets/cards/threats/glasswing-midge-cloud.png`
- `/assets/cards/threats/gutter-bell-mite.png`
- `/assets/cards/threats/lantern-ash-ghoul.png`
- `/assets/cards/threats/rust-mote-drone.png`
- `/assets/cards/threats/soot-stained-cutpurse.png`
- `/assets/cards/threats/toll-scrip-urchins.png`
- `/assets/cards/threats/wire-chewer-pack.png`

Do not remove those content cards or manifest entries to make the audit green. Add the missing art instead.

## Cleanup Rules

- Keep all assets returned by `getRuntimeAssetPaths()`, `getBoardTileAssetPaths()`, `imagePrompts`, or `generatedCardImagePrompts`.
- Treat `public/assets/riftfall/board/tiles/` as fallback/design-pipeline material until `mapAssetRegistry.ts` and `imagePrompts.ts` no longer reference it.
- Move mockups/reference images out of runtime asset folders only after confirming no manifest or content JSON references them.
- Archive useful prompt/contact-sheet history under `_archive/old-generated-content/` if it is no longer part of the active pipeline.
- Delete disposable local output only when it is ignored and reproducible.
