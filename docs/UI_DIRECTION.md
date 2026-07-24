# UI Direction

Ashen Reach is a digital board game with a host TV presentation surface and private phone controller surface. The production host direction is Signal Theatre: a cinematic, active-sector environment that changes as the operative moves through the outer, middle, inner, and center reaches.

## Host TV

- The host screen is a command display, not a marketing page.
- Keep the active operative, phase, scenario pressure, and board readable at TV distance.
- Keep the active sector environment as the dominant surface, with compact supporting rails.
- Signal Theatre resolves one original wide environment per canonical sector through `signalTheatreEnvironmentManifest.ts`; it does not render legacy tile art.
- Authoritative route sectors drive environment changes and operative-piece motion. Visual transitions never generate or delay movement.
- The active-sector brief should show location, operative, required public action, and compact session context.
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

- Current production host direction: Signal Theatre active-sector environments with deterministic chess-piece-style operative markers.
- The legacy board renderer remains available only through the explicit `hostDesign=legacy` development/compatibility route.
- Signal Theatre environment assets live under `public/assets/riftfall/environments/signal-theatre/sectors/` and are wired through `src/client/tv/signalTheatreEnvironmentManifest.ts`.
- Existing tile assets under `public/assets/map/tiles/` remain protected legacy/runtime material; Signal Theatre does not reuse them.
- Keep movement topology in authored data, not visual-only coordinates.
- Use CSS/WAAPI/React animations for environment transitions, piece movement, arrival, card reveal, and battle scenes.
- Do not introduce Three.js unless a future task proves it is necessary.

## Battle And Encounter Display

- Signal Theatre uses the production host treatment "The Sector Answers" for battles and tile challenges.
- An opposed battle pairs the existing operative portrait with existing enemy art in a cinematic split reveal. Only the two authoritative totals and result remain on the focused TV surface.
- A tile challenge pairs the operative portrait with its existing public challenge artwork. The challenge is labelled as a sector challenge, never as an enemy, and uses the canonical fixed threshold as its authoritative total.
- Detailed dice, bases, raw values, and modifiers remain available on the controlling phone rather than competing with the TV portrait reveal.
- Signal Theatre host resolution is `SignalSectorResolution`; the legacy host route retains `HostBattleOverlay`. Phone battle/action controls remain in `PhoneActionPanel`.
- Authoritative arrival presentation completes before either battle or tile-challenge focus begins.
- Avoid duplicate battle overlays or secondary card trays that compete with the active resolution.

## Avoid Reviving

- Debug-card board as final map.
- Old placeholder single-background board as final map.
- Duplicate movement scan panel on the host right rail.
- Separate tactical-map experiments that bypass authoritative route data.
- Three.js map experiments unless intentionally reintroduced with tests and a clear performance/UX reason.
