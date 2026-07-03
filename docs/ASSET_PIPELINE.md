# Asset Pipeline

Assets are runtime data. Do not delete an asset just because TypeScript does not import it directly; many assets are referenced through JSON, generated prompt catalogs, or runtime manifest functions.

## Runtime Asset Roots

- Current board tiles: `public/assets/map/tiles/`
- Current board base/region/corner assets: `public/assets/map/board/`, `public/assets/map/corners/`
- Current generated card art: `public/assets/cards/`
- Legacy/reference card art source: `public/assets/riftfall/cards/`
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
- Active threat card art is organized by `threatLane` under `public/assets/cards/threats/red/`, `public/assets/cards/threats/blue/`, and `public/assets/cards/threats/yellow/`.
- Do not add new Ashenreach card art under `public/assets/riftfall/cards/`. Treat that folder as legacy/source/reference material until a later archive pass proves it can move.
- Runtime character portraits use character IDs where possible.
- Avoid adding mockups, prompt sheets, or contact sheets to runtime asset folders.

## Validation

Run:

```bash
npm run audit:assets
```

Current baseline after Phase 5C/5D:

- 402 expected assets
- 402 present
- 0 missing card PNGs
- 0 invalid assets
- 0 placeholder violations

The previous ten missing lane-based threat images were added under `public/assets/cards/threats/<lane>/`.

## Cleanup Rules

- Keep all assets returned by `getRuntimeAssetPaths()`, `getBoardTileAssetPaths()`, `imagePrompts`, or `generatedCardImagePrompts`.
- Use `public/assets/riftfall/cards/` as an import source only: audit, classify, match to active content IDs, copy to `public/assets/cards/...`, update resolver/manifest if needed, then validate.
- Treat `public/assets/riftfall/board/tiles/` as fallback/design-pipeline material until `mapAssetRegistry.ts` and `imagePrompts.ts` no longer reference it.
- Move mockups/reference images out of runtime asset folders only after confirming no manifest or content JSON references them.
- Archive useful prompt/contact-sheet history under `_archive/old-generated-content/` if it is no longer part of the active pipeline.
- Delete disposable local output only when it is ignored and reproducible.
