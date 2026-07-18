# Project Cleanup Final Report

The audit-first pass established the source-of-truth boundaries. The July 2026
follow-up applied the proven-safe cleanup and removed reproducible or duplicate
historical material from version control.

## Files Deleted

- Historical `.asset-audit/` outputs and contact sheets.
- Tracked `qa-artifacts/` captures and dated report screenshot folders.
- Reproducible `generated/` prompt/report output.
- Superseded rule-spine, economy-spine, prompt-dump, and design-QA documents.
- Verified duplicate promoted-card archives under `_archive/`.
- Duplicate active-folder artifact and wargear backs; their legacy templates
  remain under `public/assets/riftfall/cards/`.
- Two untracked quarantined Heat conversion audits.

## Files Archived

None. Historical material remains recoverable through Git history rather than a
second tracked archive copy.

## Files Kept

All runtime source, canonical content, manifests, active assets, legacy
compatibility code, and unresolved/uncertain source candidates were kept.

## Dependencies Removed

None. `package.json` does not include Three.js, `@react-three/fiber`, drei,
Framer Motion, or obvious obsolete animation dependencies. Existing dependency
ranges were refreshed with `npm update`; the resulting install reports zero
known vulnerabilities.

## Assets Refreshed

- Added the six contract illustrations that the current 36-card Contract catalog
  required: Black Route Exchange, Crosswind Ledger, Echo Triangulation,
  Equipment Requisition, Three Lantern Circuit, and Foundry Proof Marks.
- Regenerated the deterministic TypeScript prompt catalog from current content.
- Updated the runtime art catalog to include only files that exist under
  `public/`.
- Asset audit baseline is now 422/422, including 36/36 Contract illustrations.

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
- Focused prompt/runtime/Contract catalog tests: 20 passed.
- `npm run test:engine`: 706 passed.
- `npm run test:integration`: 233 passed.
- `npm run test:client`: 260 passed.
- `npm run test`: 1,199 passed.
- `npm run audit:assets`: passed at 422/422.
- `npm run audit:assets:release`: passed with zero release blockers.
- `npm run build`: passed.
- `git diff --check` and `git diff --cached --check`: passed.

## Known Remaining Cleanup Risks

- Some old-looking assets remain because manifests or fallback paths still use
  them; they were not deleted based on static imports alone.
- Zero-reference TypeScript candidates remain intentionally untouched pending
  dedicated runtime and product review.
- Legacy Heat save fields remain compatibility-owned and mechanically inert.

## Recommended Next Cleanup Pass

1. Review uncertain zero-reference TypeScript files individually.
2. Keep generated evidence in ignored local folders.
3. Run the complete validation stack after future cleanup batches.
