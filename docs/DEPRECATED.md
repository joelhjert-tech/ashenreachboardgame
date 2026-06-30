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

These files may contain useful design notes, but they are not the current source of truth:

- `docs/ASHENREACH_RULE_SPINE.md`: older rule-spine language; use `docs/CURRENT_PROJECT_STRUCTURE.md`, `docs/UI_DIRECTION.md`, and `docs/MVP_RULES.md` for implementation direction.
- `docs/ASHENREACH_RULES_SKELETON.md`: future-facing rules skeleton, not current implementation guidance.
- `docs/ASHENREACH_CARD_ECONOMY_SPINE.md`: economy design notes, not current content schema.
- `docs/CARD_IMAGE_PROMPTS.md`: large generated prompt dump; active prompt source is TypeScript under `src/game/assets/design/`.
- `design-qa.md`: historical phone-sheet QA note.
- `.asset-audit/`: historical asset audit work products.
- `qa-artifacts/`: historical QA screenshots.

Do not delete or move these in bulk without first preserving still-useful notes in the current docs and proving no scripts/tests depend on them.

## Deprecated Asset Areas

- Root `generated/` files are generated prompt/report outputs, not runtime source.
- `artifacts/`, `.tmp-playtest/`, `dist/`, `tmp-*.log`, and `node_modules/` are local generated output and should stay ignored.
- Older generated board/prompt contact sheets should be archived, not mixed into runtime asset folders.

## Current Preferred Direction

- Host TV command display.
- Player phone/controller UI.
- Board built from individual tile PNGs.
- Concentric/tiered board layout.
- CSS/WAAPI/React animation path.
- Compact host layout with active operative clarity.
- Command Hub diagnostics separated from the normal host play surface.
