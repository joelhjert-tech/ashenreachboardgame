# Asset Pipeline

Assets are runtime data. Do not delete an asset just because TypeScript does not import it directly; many assets are referenced through JSON, generated prompt catalogs, or runtime manifest functions.

## Runtime Asset Roots

- Current board tiles: `public/assets/map/tiles/`
- Current board base/region/corner assets: `public/assets/map/board/`, `public/assets/map/corners/`
- Signal Theatre sector environments: `public/assets/riftfall/environments/signal-theatre/sectors/`
- Signal Theatre selectable player pieces: `public/assets/riftfall/ui/signal-theatre/player-pieces/`
- Signal Cartography marker coins: `public/assets/riftfall/ui/signal-cartography/markers/`
- Signal Theatre host intro video: `public/assets/riftfall/ui/signal-theatre/intro/`
- Signal Theatre Edge Card animation frames: `public/assets/riftfall/ui/signal-theatre/edge-card/`
- Host TV shop-category emblems: `public/assets/riftfall/ui/shop/categories/`
- Current generated card art: `public/assets/cards/`
- Active card backs: `public/assets/cards/backs/`
- Legacy/reference card art source: `public/assets/riftfall/cards/`
- Runtime portraits, nemeses, tokens, UI frames: `public/assets/riftfall/`
- Fallback card art: `public/assets/cards/fallbacks/`
- Phone-optimized raster manifest: `public/assets/phone-image-manifest.json`

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
- `public/assets/cards/followers/`
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
- Deferred artifact:
  - `relic_choir_route_orb.png`
- Card backs: active contract, threat, generated character, and generated artifact backs live under `public/assets/cards/backs/`; legacy artifact and wargear templates remain only under `public/assets/riftfall/cards/`.
- Map tile reverse: the generated square tile back lives at `public/assets/map/tiles/map_tile_back.png` and is registered by `src/client/tv/mapAssetRegistry.ts`.

## Manifests And Lookups

- Board tile manifest: `src/client/tv/tileAssetManifest.ts`
- Board runtime asset list: `src/client/tv/mapAssetRegistry.ts`
- Signal Theatre environment manifest: `src/client/tv/signalTheatreEnvironmentManifest.ts`
- Signal Theatre host intro resolver: `getHostGameIntroVideoPath` in `src/client/shared/assetPaths.ts`
- Runtime portrait/frame lookups: `src/client/shared/assetPaths.ts`
- Host TV shop-category emblem lookup: `getHostShopCategoryIconPath` in `src/client/shared/assetPaths.ts`
- Prompt manifest root: `src/game/assets/design/imagePrompts.ts`
- Signal Theatre prompt catalog: `src/game/assets/design/signalTheatreEnvironmentPrompts.ts`
- Signal Piece prompt catalog: `src/game/assets/design/signalPiecePrompts.ts`
- Signal Cartography coin prompt catalog: `src/game/assets/design/signalCartographyCoinPrompts.ts`
- Inventory category emblem prompt catalog: `src/game/assets/design/inventoryCategoryIconPrompts.ts`
- Objective category emblem prompt catalog: `src/game/assets/design/objectiveCategoryIconPrompts.ts`
- Result-ready verdict gate prompt catalog: `src/game/assets/design/resultReadyVisualPrompts.ts`
- Edge Card animation prompt catalog: `src/game/assets/design/edgeCardAnimationPrompts.ts`
- Generated card image prompt catalog: `src/game/assets/design/generatedCardImagePrompts.ts`
- Card fallback and output directories: `src/game/assets/design/cardImageCatalog.ts`
- Phone derivative generator: `scripts/generate-phone-images.ts`

## Naming

- Board tile PNGs in the current map system use `map_tile_*` names under `public/assets/map/tiles/`.
- Signal Theatre environment PNGs use the canonical sector ID under `public/assets/riftfall/environments/signal-theatre/sectors/`.
- Signal Theatre environment generation must create original Ashenreach locations and must not use legacy tile art or reference-game imagery as inputs.
- Signal Piece PNGs use the six stable catalog IDs: `beacon`, `bastion`, `lantern`, `harrow`, `reliquary`, and `compass`.
- Signal Cartography player coins reuse the six stable Signal Piece IDs under `markers/players/`; public objective coins use `route`, `challenge`, `hunt`, and `service` under `markers/objectives/`.
- The TV-only opening video uses the stable filename `ashenreach-intro.mp4` under the Signal Theatre intro root. Keep it H.264/AAC MP4 for browser and television compatibility.
- Edge Card TV frames use the stable names `edge-card-charge.png` and `edge-card-detonation.png`; both preserve the card-reveal chamber camera for a clean CSS crossfade.
- Private phone inventory category emblems use `edge-cards`, `artifacts`, `equipment`, `followers`, `status`, and `progression` under `public/assets/riftfall/ui/inventory-categories/`.
- Public Host TV shop-category emblems use `items`, `equipment`, `artifacts`, `route-aids`, `services`, and `sell` under `public/assets/riftfall/ui/shop/categories/`.
- Card art generated from content uses the card ID as the PNG filename under `public/assets/cards/<type>/`.
- Ordinary Followers use `public/assets/cards/followers/` and the dedicated Follower fallback. Artifact-deck Followers keep their existing Artifact presentation.
- Active threat card art is organized by `threatLane` under `public/assets/cards/threats/red/`, `public/assets/cards/threats/blue/`, and `public/assets/cards/threats/yellow/`.
- Do not add new Ashenreach card art under `public/assets/riftfall/cards/`. Treat that folder as legacy/source/reference material only.
- Phone-visible raster assets use a sibling \`*.phone.webp\` derivative generated at a maximum 960px long edge with WebP quality 72, no upscaling, and stripped metadata. Normal phone views use the derivative; explicit art inspection may request the full source.
- Promote legacy art only by creating real content, copying art to `public/assets/cards/<category>/`, updating the resolver/catalog, validating it, and archiving the promoted legacy source after the active copy is verified.
- Runtime character portraits use character IDs where possible.
- Runtime scenario-boss portraits use the canonical nemesis ID as
  `public/assets/riftfall/nemeses/<nemesis-id>.png`. Every production scenario
  must resolve to exactly one registered nemesis portrait and one generated
  portrait prompt.
- Avoid adding mockups, prompt sheets, or contact sheets to runtime asset folders.

## Validation

Run:

```bash
npm run generate:phone-images
npm run audit:assets
```

The asset audit validates the generated phone manifest, source and derivative hashes, byte counts, dimensions, maximum edge, no-upscale rule, and no-growth rule. SVG, animation, TV-only Signal Theatre environments, the TV-only intro video, shop interiors, cartography assets, and admin-only Lore Bible art are excluded from phone-image derivative generation. The intro MP4 remains registered and existence-checked through `getRuntimeAssetPaths()`.

The asset audit is the source of truth for the current expected count. Signal Theatre adds 49 distinct sector environments, 6 selectable player-piece renders, and 2 Edge Card animation frames. Signal Cartography adds 6 public player coins and 4 public objective coins. The phone inventory adds 6 original category emblems.

The runtime also includes six original SVG shop-category emblems. These are code-native UI vectors rather than card or environment artwork and must remain registered through `getRuntimeAssetPaths()`.

Previous baseline after the July 2026 repository cleanup and contract-art refresh:

- 422 expected assets
- 422 present
- 0 missing card PNGs
- 0 invalid assets
- 0 placeholder violations

Contract card art is 39/39 present. Threat, Equipment, Artifact/Relic, and Contract assets live under active `public/assets/cards/` roots; duplicate promoted archives are recoverable through Git history.

## Cleanup Rules

- Keep all assets returned by `getRuntimeAssetPaths()`, `getBoardTileAssetPaths()`, `imagePrompts`, or `generatedCardImagePrompts`.
- Use `public/assets/riftfall/cards/` as an import source only: audit, classify, match to active content IDs, copy to `public/assets/cards/...`, update resolver/manifest if needed, validate, then archive the promoted legacy source after hash/visual verification.
- Do not allow runtime catalogs, browser/client code, or active asset manifests to emit `/assets/riftfall/cards/`.
- Do not create active Heat card paths. Scars/Afflictions are the persistent harm/status card system.
- Treat `public/assets/riftfall/board/tiles/` as fallback/design-pipeline material until `mapAssetRegistry.ts` and `imagePrompts.ts` no longer reference it.
- Move mockups/reference images out of runtime asset folders only after confirming no manifest or content JSON references them.
- Keep historical prompt/contact-sheet output outside the tracked repository. Git history preserves deleted tracked evidence when it is needed later.
- Delete verified duplicate promotion archives once every archived file has an identical active runtime copy.
- Delete disposable local output only when it is ignored and reproducible.
