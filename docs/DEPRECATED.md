# Deprecated Concepts

This file exists so future agents do not revive older directions that conflict with the current game.

## Deprecated UI And Map Concepts

- Debug-card board as the final map.
- Single background image pretending to be the final board.
- Placeholder/card-grid map systems as the production host board.
- Duplicate Movement Scan panel in the host right rail.
- Duplicate route destination list on the TV when phone movement planner and board route overlays already show it.
- Three.js map/board experiments unless explicitly reintroduced with a clear need.
- Duplicate battle overlays or shop overlays competing with the active host overlay.

## Deprecated Or Historical Docs

The superseded rule spines, generated prompt dump, historical design QA note,
tracked asset-audit output, and tracked QA screenshots were removed in the
July 2026 repository cleanup. Git history remains the recovery path.

## Deprecated Asset Areas

- Root `generated/` files are ignored, reproducible prompt/report outputs, not runtime source.
- `artifacts/`, `.tmp-playtest/`, `dist/`, `tmp-*.log`, and `node_modules/` are local generated output and should stay ignored.
- `.asset-audit/`, `qa-artifacts/`, and `_archive/` are local-only ignored folders.
- Older generated board/prompt contact sheets must stay outside runtime asset folders and version control.

## Current Preferred Direction

- Host TV command display.
- Player phone/controller UI.
- Board built from individual tile PNGs.
- Concentric/tiered board layout.
- CSS/WAAPI/React animation path.
- Compact host layout with active operative clarity.
- Command Hub diagnostics separated from the normal host play surface.
