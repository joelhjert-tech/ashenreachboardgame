# Current Project Structure

This is the source-of-truth map for the current Ashen Reach implementation. Prefer this file over older prompt dumps, rule spines, QA notes, or generated asset reports when deciding where to work.

## Runtime Surfaces

- Host TV UI: `src/client/tv/TvApp.tsx`
- Host board container: `src/client/tv/TacticalMapBoard.tsx`
- Host board renderer: `src/client/tv/BoardMap.tsx`
- Tile-PNG board surface: `src/client/tv/TalismanBoardSurface.tsx`
- Board stage geometry shell: `src/client/tv/BoardStage.tsx`
- Board tile layout calibration: `src/client/tv/boardTileLayout.ts`
- Board tile asset manifest: `src/client/tv/tileAssetManifest.ts`
- Host battle overlay: `src/client/tv/HostBattleOverlay.tsx`
- Host shop overlay: `src/client/tv/HostShopOverlay.tsx`
- Host diagnostics/debug drawer: `src/client/shared/DebugPanel.tsx`, rendered from `TvApp.tsx`
- Phone UI: `src/client/phone/PhoneApp.tsx`
- Phone action/controller panels: `src/client/phone/PhoneActionPanel.tsx`, `src/client/phone/PortraitControllerView.tsx`, `src/client/phone/PhoneInventoryPanel.tsx`

## Game Logic

- Server entrypoint: `src/server/index.ts`
- Room/session server: `src/server/roomServer.ts`
- Session state helpers: `src/server/sessionState.ts`
- Engine reducer: `src/game/engine/reducer.ts`
- Engine action types: `src/game/engine/actions.ts`
- Phase helpers: `src/game/engine/phases.ts`
- Movement planner: `src/game/rules/movementPlanner.ts`
- Movement phase profile: `src/game/rules/movementPhase.ts`
- Battle/engagement flow: `src/game/rules/engagementPhase.ts`, `src/game/engine/reducer.ts`, `src/client/tv/HostBattleOverlay.tsx`
- Scenario resolver: `src/game/rules/scenarioResolver.ts`
- Scenario ambient rules: `src/game/rules/scenarioAmbient.ts`
- Contract objective resolver: `src/game/contracts/objectives.ts`

## Board And Content Data

- Board spaces and sector text: `src/game/data/boardSpaces.ts`
- Canonical sector graph: `src/game/data/canonicalSectorGraph.ts`
- Board node coordinates/topology for UI: `src/data/riftfallBoardNodes.ts`
- Sector JSON content: `content/sectors/borderlight.json`
- Character JSON content: `content/characters/`
- Gear JSON content: `content/gear/`
- Threat cards: `content/cards/threats/`
- Contract cards: `content/cards/contracts/`
- Anomaly cards: `content/cards/anomalies/`
- Artifact cards: `content/cards/artifacts/`
- Follower cards: `content/followers/`
- Scar cards: `content/cards/scars/`
- Escalation cards: `content/cards/escalations/`
- Scenario definitions: `src/game/data/scenarios.ts`

## Assets

- Current board tile PNGs: `public/assets/map/tiles/`
- Current board base and region layers: `public/assets/map/board/`
- Current card art generated from content: `public/assets/cards/`
- Runtime portraits, nemeses, UI frames, tokens: `public/assets/riftfall/`
- Runtime portrait and frame lookups: `src/client/shared/assetPaths.ts`
- Design/image prompt manifest: `src/game/assets/design/imagePrompts.ts`
- Card image prompt catalog: `src/game/assets/design/generatedCardImagePrompts.ts`
- Asset audit script: `scripts/audit-assets.ts`

## Validation And Tests

- Content validation: `scripts/validate-content.ts`
- Asset validation: `scripts/audit-assets.ts`
- TypeScript: `npm run typecheck`
- Client tests: `npm run test:client`
- Engine tests: `npm run test:engine`
- Server/integration tests: `npm run test:integration`
- Full build: `npm run build`

## Common Tasks

- Add a board tile: edit `src/game/data/boardSpaces.ts`, update `src/data/riftfallBoardNodes.ts` if topology changes, add the PNG under `public/assets/map/tiles/`, then wire it in `src/client/tv/tileAssetManifest.ts`.
- Adjust board geometry: edit `src/client/tv/boardTileLayout.ts`; use `?boardDebug=1` calibration in the host URL for coordinate work.
- Change movement rules: edit `src/game/rules/movementPlanner.ts` and tests under `src/server/__tests__/` or `src/game/engine/__tests__/`.
- Add a playable character: add JSON under `content/characters/`, add/load portrait path in `src/client/shared/assetPaths.ts`, run content and asset validation.
- Add card content: add JSON under the matching `content/cards/` folder, update generated card art prompts if needed, run content validation.
- Add a scenario: edit `src/game/data/scenarios.ts`, add scenario art under `public/assets/riftfall/scenarios/`, and extend scenario tests.

## Deprecated Or Non-Source Areas

- `generated/` is ignored transient prompt/report output, not runtime source-of-truth.
- `.asset-audit/` and `qa-artifacts/` are ignored local evidence folders, not active runtime code.
- `_archive/` is ignored local archival space; verified duplicate assets must not be committed there.
- `artifacts/`, `.tmp-playtest/`, `dist/`, `tmp-*.log`, and `node_modules/` are local generated/runtime output and should stay ignored.
