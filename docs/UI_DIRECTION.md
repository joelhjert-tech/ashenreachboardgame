# UI Direction

Ashen Reach is a digital board game with a host TV command surface and private phone controller surface. The current direction is compact, game-forward, and built around a tile-PNG board mosaic.

## Host TV

- The host screen is a command display, not a marketing page.
- Keep the active operative, phase, scenario pressure, and board readable at TV distance.
- Keep the board as the main focus, with compact supporting rails.
- The board is built from individual tile PNGs through `TalismanBoardSurface`.
- Movement routes, token positions, nemesis trails, scenario markers, and glow overlays belong on the board layer.
- The right rail should show a selected/active sector brief and session context.
- Do not duplicate the phone movement destination list in the host right rail.
- Command Hub diagnostics belong in a separate host-only debug/diagnostics tab or drawer.

## Player Phone

- The phone is the private controller.
- Portrait mode is the primary player experience.
- Actions should be clear and thumb-friendly.
- Private inventory, movement choices, battle choices, and ready/join flows live here.
- Debug information should stay hidden unless explicitly opened.

## Board

- Current board direction: Talisman/Relic-style concentric/tiered board feel.
- Current renderer direction: individual tile PNGs over board geometry, not a single flat debug-card map.
- Keep current tile assets under `public/assets/map/tiles/` and wire them through `src/client/tv/tileAssetManifest.ts`.
- Keep movement topology in authored data, not visual-only coordinates.
- Use CSS/WAAPI/React animations for board glow, route pulse, card reveal, and battle scenes.
- Do not introduce Three.js unless a future task proves it is necessary.

## Battle And Encounter Display

- Battle should read as total-vs-total: operative total, enemy/difficulty total, modifiers, and outcome.
- Host battle display is `HostBattleOverlay`; phone battle/action controls are in `PhoneActionPanel`.
- Avoid duplicate battle overlays or secondary card trays that compete with the active resolution.

## Avoid Reviving

- Debug-card board as final map.
- Old placeholder single-background board as final map.
- Duplicate movement scan panel on the host right rail.
- Separate tactical-map experiments that bypass the current tile PNG renderer.
- Three.js map experiments unless intentionally reintroduced with tests and a clear performance/UX reason.
