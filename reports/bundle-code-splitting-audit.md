# Bundle Code-Splitting Audit

## Executive summary

The current client build still ships as one JavaScript runtime chunk:

| File | Size | Gzip |
| --- | ---: | ---: |
| `dist/assets/index-CRTY9GZt.js` | 867.52 kB | 196.23 kB |
| `dist/assets/index-Brf9ctHp.css` | 227.43 kB | 45.62 kB |

Vite reports the expected large chunk warning because the JS chunk is above 500 kB.

The main causes are:

1. `src/client/main.tsx` statically imports both `PhoneApp` and `TvApp`, so phone-only and TV-only code are always in the same initial chunk.
2. Runtime card-art helpers import design prompt catalogs, especially `generatedCardImagePrompts.ts`, which contributes about 301.8 kB of source content to the browser bundle even though runtime rendering only needs output paths.
3. TV board/map, TV overlays, QR generation, phone action panels, and shared game data all ride in the same chunk.

No Three.js, `@react-three/*`, drei, React Three Canvas, or WebGL runtime imports were found.

## Current build output

Command:

```text
npm.cmd run build
```

Output:

```text
dist/index.html                 0.45 kB | gzip:   0.30 kB
dist/assets/index-Brf9ctHp.css 227.43 kB | gzip:  45.62 kB
dist/assets/index-CRTY9GZt.js  867.52 kB | gzip: 196.23 kB

(!) Some chunks are larger than 500 kB after minification.
```

A sourcemap build for audit only produced the same JS shape:

```text
dist/assets/index-CRTY9GZt.js 867.57 kB | gzip: 196.27 kB | map: 2,352.17 kB
```

## Largest sourcemap source contributors

The sourcemap source-content totals are not minified byte-for-byte output, but they identify what is in the chunk:

| Source | Approx source KB |
| --- | ---: |
| `react-dom/client` production runtime | 523.5 |
| `src/game/assets/design/generatedCardImagePrompts.ts` | 301.8 |
| `src/client/tv/TvApp.tsx` | 84.1 |
| `src/client/phone/PhoneActionPanel.tsx` | 77.0 |
| `src/game/data/scenarios.ts` | 43.1 |
| `src/game/data/boardSpaces.ts` | 36.0 |
| `src/client/tv/BoardMap.tsx` | 25.8 |
| `src/client/phone/PortraitControllerView.tsx` | 24.5 |
| `src/client/shared/explainabilityPrompts.ts` | 23.0 |
| `src/client/phone/PhoneApp.tsx` | 17.8 |
| `src/client/tv/HostBattleOverlay.tsx` | 15.7 |
| `src/client/phone/inventoryPresentation.ts` | 14.9 |
| `src/game/assets/design/boardTilePrompts.ts` | 14.9 |
| `qrcode` core | 14.8 |
| `src/client/tv/HostShopOverlay.tsx` | 14.0 |

Grouped by source path:

| Group | Approx source KB | Notes |
| --- | ---: | --- |
| Vendor | 636.9 | React, React DOM, scheduler, qrcode. |
| Design prompts | 341.1 | Runtime leakage from image/design prompt catalogs. |
| TV-only | 193.2 | Host TV app, board, overlays, QR, audio controls. |
| Phone-only | 147.2 | Phone controller, action panel, inventory/useful-now views. |
| Game data | 117.8 | Scenarios, board spaces, threat decks, missions, characters. |
| Client shared | 82.8 | Shared prompts, card art, networking, labels. |
| Audio | 22.7 | Host audio manager and selectors. |
| Legacy board data | 8.7 | Riftfall board node data used by board renderer. |

## Entry point findings

`src/client/main.tsx` is the highest-priority split point:

```ts
import { PhoneApp } from "./phone/PhoneApp.js";
import { TvApp } from "./tv/TvApp.js";

const App = pathname.startsWith("/tv") ? TvApp : PhoneApp;
```

Because both are static imports, every phone load includes TV code and every TV load includes phone code. This also means the phone route currently receives:

- `TvApp`
- TV board/map modules
- TV battle/shop overlays
- QR generation via `qrcode`
- host audio controls
- tile/map registries

And the TV route currently receives:

- `PhoneApp`
- `PortraitControllerView`
- `PhoneActionPanel`
- phone inventory/useful-now panels
- phone-only controller logic

## TV-only modules

These are safe candidates to keep out of the phone root chunk:

- `src/client/tv/TvApp.tsx`
- `src/client/tv/TacticalMapBoard.tsx`
- `src/client/tv/BoardMap.tsx`
- `src/client/tv/TalismanBoardSurface.tsx`
- `src/client/tv/HostBattleOverlay.tsx`
- `src/client/tv/HostShopOverlay.tsx`
- `src/client/tv/HostPlayerCard.tsx`
- `src/client/tv/JoinQrCard.tsx`
- `src/client/tv/mapAssetRegistry.ts`
- `src/client/tv/boardTileLayout.ts`
- `src/client/tv/tileAssetManifest.ts`
- `src/client/audio/HostAudioControls.tsx`
- `src/client/audio/AshenReachAudioManager.ts`

Risk: `/tv` must still boot directly and QR/LAN join URLs from Phase 5G2 must stay intact.

## Phone-only modules

These are safe candidates to keep out of the TV chunk:

- `src/client/phone/PhoneApp.tsx`
- `src/client/phone/PortraitControllerView.tsx`
- `src/client/phone/PhoneActionPanel.tsx`
- `src/client/phone/PhoneInventoryPanel.tsx`
- `src/client/phone/MobilePlayerCard.tsx`
- `src/client/phone/inventoryPresentation.ts`
- `src/client/phone/usefulNowPresentation.ts`
- `src/client/phone/MobileDebugDrawer.tsx`
- `src/client/phone/RotatePhoneOverlay.tsx`

Risk: phone root `/` must still boot directly, room-code query params must survive, and the LAN-safe join flow must still work.

## Shared modules that should stay eager

These are used by both surfaces or are tiny enough that splitting them early is not worth the churn:

- `src/client/shared/network.ts`
- `src/client/shared/useRoomSubscription.ts`
- `src/client/shared/types.ts`
- `src/client/shared/statLabels.ts`
- `src/client/shared/resultDeltas.ts`
- `src/client/shared/ResultDeltaChips.tsx`
- `src/client/shared/GameButton.tsx`
- `src/client/shared/ChallengeBadge.tsx`
- `src/game/ui/challengeTheme.ts`

React and React DOM should remain vendor/runtime.

## Asset/prompt runtime leakage

The largest non-vendor issue is not a component: it is prompt data loaded by runtime helpers.

Runtime path 1:

```text
CardArtImage.tsx
-> assetPaths.ts
-> generatedCardImagePrompts.ts
```

`assetPaths.ts` only needs `cardType`, `cardId`, and `outputPath`, but it imports the generated prompt catalog containing long generation prompts and negative prompts.

Runtime path 2:

```text
TacticalMapBoard.tsx
-> assetManifest.ts
-> imagePrompts.ts
-> generatedCardImagePrompts.ts / boardTilePrompts.ts / uiPrompts.ts / scenarioSheetPrompts.ts
```

`TacticalMapBoard` only needs the full board asset path for its static fallback, but `getAssetPath("full_board_main")` imports the full image prompt manifest.

Recommended fix after route-level splitting:

- Create a runtime-only card art path manifest containing only card type, id, lane/path, and fallback.
- Keep design prompt catalogs for scripts/audits, not browser runtime.
- Replace `TacticalMapBoard` fallback path resolution with a lightweight runtime asset path or an existing map asset registry helper.

This should be a separate implementation step from route splitting, because it changes asset helper plumbing and should be verified with `audit:assets`.

## Board/map loading

`TvApp` eagerly imports `TacticalMapBoard`, which imports `BoardMap`, `TalismanBoardSurface`, board layout, tile manifests, map registries, and legacy board nodes.

After route-level splitting, this will be isolated to the TV route. If the TV chunk remains too large, the board/map surface is the next safe lazy-load target:

- Lazy-load `TacticalMapBoard` inside `TvApp`.
- Keep a TV-style loading panel that preserves the board region dimensions.
- Avoid flicker during active movement by loading the map immediately after TV route boot.

Risk: movement markers, route glow, selected route preview, and sector brief depend on authoritative planner output and must remain unchanged.

## Overlay loading

`HostBattleOverlay` and `HostShopOverlay` are TV-only and currently eager inside `TvApp`.

After route-level splitting, lazy-loading these overlays is safe if:

- The fallback is a neutral host-stage panel.
- Battle overlay continues to outrank shop/sector context.
- Shop overlay remains public-only and does not leak private rivalry data.

Do not split these before route-level splitting; the first split will already move them out of the phone bundle.

## QR dependency

`qrcode` appears in the main chunk because `JoinQrCard` is statically imported by `TvApp`, and `TvApp` is statically imported by `main.tsx`.

Route-level splitting should keep `qrcode` out of the phone route. If the TV chunk still needs reduction later, `JoinQrCard` can dynamically import `qrcode` inside the effect that renders the QR SVG.

Risk: Phase 5G2 LAN-safe URL behavior must remain tested.

## Tests/dev/debug runtime check

No test modules appeared in the production sourcemap.

Runtime debug components are intentionally imported:

- `DebugPanel`
- `MobileDebugDrawer`

They are small. They can remain eager for now, but a later cleanup could gate them behind dynamic imports if debug payloads grow.

## Three.js / WebGL guard

Search found no active runtime/package imports for:

- `three`
- `@react-three/*`
- drei
- React Three Canvas
- WebGL renderer usage

Only the existing Three.js removal regression test mentions those strings.

## Safe Phase 6B plan

### 6B1: Route-level split first

Replace static app imports in `src/client/main.tsx` with path-based dynamic imports:

- `/tv` imports `./tv/TvApp.js`
- `/` imports `./phone/PhoneApp.js`

Keep `styles.css` eager for now to avoid visual churn. Add a small Ashenreach loading shell while the route chunk loads.

Expected outcome:

- Main entry chunk shrinks.
- TV-only code moves to a TV chunk.
- Phone-only code moves to a phone chunk.
- `qrcode` should no longer load on the phone route.

Verification:

- `/tv` direct load.
- phone `/` direct load.
- LAN join URL flow.
- browser `canvasCount: 0`.
- full test/build/audit suite.

### 6B2: Runtime asset manifest slim-down

Stop importing design prompt catalogs into runtime asset helpers:

- Replace `generatedCardImagePrompts` runtime use in `assetPaths.ts` with a compact card-art path map.
- Replace `TacticalMapBoard` use of `assetManifest.getAssetPath("full_board_main")` with a runtime map/board asset path.
- Keep prompt catalogs available for `scripts/audit-assets.ts` and image generation scripts.

Expected outcome:

- Remove roughly 341 KB source-content worth of prompt data from the browser graph.
- Reduce both TV and phone chunks if the path map is shared.

Verification:

- `audit:assets` must remain 402/402.
- Card art fallback tests must pass.
- TV board fallback must still render.

### 6B3: TV board and overlay component splitting

Only if warning remains after 6B1 and 6B2:

- Lazy-load `TacticalMapBoard`.
- Lazy-load `HostBattleOverlay`.
- Lazy-load `HostShopOverlay`.
- Consider dynamic import for `qrcode` inside `JoinQrCard`.

### 6B4: Phone panel splitting

Only after TV/asset work:

- Lazy-load `PhoneActionPanel` after a phone joins a room.
- Consider lazy-loading inventory/shop/battle-heavy panels inside the phone action shell.
- Preserve CurrentPrompt and bottom tabs; avoid loading flicker during active play.

## Must remain eager

- App bootstrap and route selector.
- Shared networking/origin logic from Phase 5G2.
- `useRoomSubscription`.
- Shared public/private payload types.
- Small common controls and labels.
- Global CSS until a later CSS-splitting plan exists.

## Acceptance notes for implementation

Phase 6B must preserve:

- `/tv` direct boot.
- `/` direct phone boot.
- QR/LAN join URL behavior.
- WebSocket/API origin behavior.
- no private rivalry leaks.
- no movement/shop/battle/scenario mechanics changes.
- no Three.js/WebGL/canvas reintroduction.

The first implementation should be route-level only. Deep component splits can wait until after route-level measurements prove what remains.
