# Project Cleanup Final Report

This pass was intentionally audit-first. It created current source-of-truth documentation and a cleanup plan, but did not delete or archive tracked project files.

## Files Deleted

None.

## Files Archived

None.

## Files Kept

All existing source, content, and asset files were kept. See `reports/project-cleanup-audit.md` for keep/archive/uncertain classifications.

## Dependencies Removed

None. `package.json` does not include Three.js, `@react-three/fiber`, drei, Framer Motion, or obvious obsolete animation dependencies.

## Docs Consolidated

- Updated `README.md` to point at current source-of-truth docs and validation commands.
- Added `docs/CURRENT_PROJECT_STRUCTURE.md`.
- Added `docs/UI_DIRECTION.md`.
- Added `docs/CONTENT_GUIDE.md`.
- Added `docs/ASSET_PIPELINE.md`.
- Added `docs/DEPRECATED.md`.
- Added `reports/project-cleanup-audit.md`.

## Source Of Truth

See `docs/CURRENT_PROJECT_STRUCTURE.md`.

Short version:

- Host TV UI: `src/client/tv/TvApp.tsx`
- Player phone UI: `src/client/phone/PhoneApp.tsx`
- Board renderer: `src/client/tv/TacticalMapBoard.tsx`, `src/client/tv/BoardMap.tsx`, `src/client/tv/TalismanBoardSurface.tsx`
- Board layout/topology: `src/client/tv/boardTileLayout.ts`, `src/data/riftfallBoardNodes.ts`, `src/game/data/boardSpaces.ts`, `src/game/data/canonicalSectorGraph.ts`
- Tile asset manifest: `src/client/tv/tileAssetManifest.ts`
- Movement planner: `src/game/rules/movementPlanner.ts`
- Battle resolver/display: `src/game/engine/reducer.ts`, `src/game/rules/engagementPhase.ts`, `src/client/tv/HostBattleOverlay.tsx`
- Content validation: `scripts/validate-content.ts`
- Asset validation: `scripts/audit-assets.ts`

## Tests Run

- `npm run validate:content`: passed.
- `npm run typecheck`: passed.
- `npm run test:client`: passed, 14 test files and 110 tests.
- `npm run build`: passed. Vite reported the existing large chunk warning for the main JS bundle.
- `npm run audit:assets`: passed in development mode with 10 pre-existing missing threat card PNGs.

## Known Remaining Cleanup Risks

- Existing uncommitted host-board changes predated this cleanup branch; they were preserved.
- `src/client/tv/boardTileLayout.ts` and `src/client/tv/tileAssetManifest.ts` were untracked before this pass but are active dependencies of the current board work.
- Some old-looking assets are still referenced by prompt manifests or fallback paths.
- `.asset-audit/`, `qa-artifacts/`, and `generated/` contain tracked historical outputs; archive them only after preserving useful notes and confirming generation scripts no longer rely on their exact paths.
- Asset audit has 10 missing release-required threat card PNGs.

## Recommended Next Cleanup Pass

1. Add or commit the current board files so the cleanup has a stable base.
2. Move old docs/prompts into `_archive/` in small batches.
3. Review uncertain zero-reference TypeScript files individually.
4. Generate missing threat card art.
5. Run `npm run validate:content`, `npm run typecheck`, `npm run test:client`, `npm run build`, and `npm run audit:assets`.
