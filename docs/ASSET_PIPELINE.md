# Asset Pipeline

Assets are runtime data. Do not delete an asset just because TypeScript does not import it directly; many assets are referenced through JSON, generated prompt catalogs, or runtime manifest functions.

## Runtime Asset Roots

- Current board tiles: `public/assets/map/tiles/`
- Current board base/region/corner assets: `public/assets/map/board/`, `public/assets/map/corners/`
- Current generated card art: `public/assets/cards/`
- Active card backs: `public/assets/cards/backs/`
- Legacy/reference card art source: `public/assets/riftfall/cards/`
- Runtime portraits, nemeses, tokens, UI frames: `public/assets/riftfall/`
- Fallback card art: `public/assets/cards/fallbacks/`

## Active Card Roots

Runtime card art must resolve through `public/assets/cards/`, never through `public/assets/riftfall/cards/`.

Active card roots:

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
- `public/assets/cards/backs/`

Reference/deferred legacy root:

- `public/assets/riftfall/cards/`

The legacy root is not an active runtime card-art source. It may contain only deferred/reference/prompt-only material.

Remaining legacy files:

- Heat files: deprecated/reference-only. Do not create `/assets/cards/heat/`.
- Route notes: reference-only until a real route-note card system exists.
- Deferred contracts:
  - `mission_lattice_witness.png`
  - `mission_hold_the_ridge.png`
  - `mission_span_of_the_last_seal.png`
- Deferred artifact:
  - `relic_choir_route_orb.png`
- Card backs: active contract, threat, generated character, and generated artifact backs live under `public/assets/cards/backs/`; legacy artifact and wargear sources remain reference/template material.
- Map tile reverse: the generated square tile back lives at `public/assets/map/tiles/map_tile_back.png` and is registered by `src/client/tv/mapAssetRegistry.ts`.

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
- Do not add new Ashenreach card art under `public/assets/riftfall/cards/`. Treat that folder as legacy/source/reference material only.
- Promote legacy art only by creating real content, copying art to `public/assets/cards/<category>/`, updating the resolver/catalog, validating it, and archiving the promoted legacy source after the active copy is verified.
- Runtime character portraits use character IDs where possible.
- Avoid adding mockups, prompt sheets, or contact sheets to runtime asset folders.

## Validation

Run:

```bash
npm run audit:assets
```

Current baseline after the promoted-card archive loop:

- 404 expected assets
- 404 present
- 0 missing card PNGs
- 0 invalid assets
- 0 placeholder violations

Contract card art is 30/30 present. Threat, Equipment, Artifact/Relic, and Contract assets promoted from legacy sources now live under active `public/assets/cards/` roots.

## Cleanup Rules

- Keep all assets returned by `getRuntimeAssetPaths()`, `getBoardTileAssetPaths()`, `imagePrompts`, or `generatedCardImagePrompts`.
- Use `public/assets/riftfall/cards/` as an import source only: audit, classify, match to active content IDs, copy to `public/assets/cards/...`, update resolver/manifest if needed, validate, then archive the promoted legacy source after hash/visual verification.
- Do not allow runtime catalogs, browser/client code, or active asset manifests to emit `/assets/riftfall/cards/`.
- Do not create active Heat card paths. Scars/Afflictions are the persistent harm/status card system.
- Treat `public/assets/riftfall/board/tiles/` as fallback/design-pipeline material until `mapAssetRegistry.ts` and `imagePrompts.ts` no longer reference it.
- Move mockups/reference images out of runtime asset folders only after confirming no manifest or content JSON references them.
- Archive useful prompt/contact-sheet history under `_archive/old-generated-content/` if it is no longer part of the active pipeline.
- Delete disposable local output only when it is ignored and reproducible.
