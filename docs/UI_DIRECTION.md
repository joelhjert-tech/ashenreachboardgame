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

## TV + Phone Controller UX Rules

- The TV is shared public state: room code, QR, joined players, ready state, active player, phase, map, public results, route glow, and visible table pressure.
- The phone is private command input: current prompt, available actions, confirmations, inventory, legal movement destinations, hidden objectives, and player-specific choices.
- The TV should explain what the group is waiting on: host setup, all players ready, a player choosing destination, a player resolving an event, a player shopping, or a player resolving battle.
- The phone should put the current required action above generic tabs. Tabs remain navigation; the prompt is the command priority.
- Do not show private rivalry objectives, hidden agendas, private cards, or secret action text on the TV unless the game explicitly reveals them.
- Rivalry mode may show a public warning that hidden agendas are active, but private victory paths belong on the phone payload.
- Co-op mode should emphasize shared objective progress, group pressure, and help/team actions.
- Do not show a full permanent character sheet during battle or event resolution on the TV. Show only the current duel or check: relevant stat, roll, modifier, total, target, and outcome.
- Do not show debug, test, raw state, planner internals, or development controls in the normal host display.
- Missing private payload data should be documented as TODOs instead of invented in the UI.

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
