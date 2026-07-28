# Ashenreach Host Admin Dashboard

## Purpose

The Host Admin Dashboard is an authenticated, pre-player-lobby authoring surface inside Signal Theatre. It consolidates content inspection, topology review, detached simulations, report summaries, and sanitized Codex handoffs without becoming part of gameplay state.

The dashboard is deliberately unavailable:

- Before the TV has a valid room and host token.
- While the room subscription is unsynchronized.
- After the first player phone has joined the room.
- During an active game.
- After victory or defeat.

Opening the dashboard keeps the public room subscription alive. Any loss of synchronization, authoritative lobby status, or first-player join closes the surface immediately.

## Access model

The TV may enter through the lobby `Admin Dashboard` action or a guarded `?admin=` link. Legacy `library` and `map` query values route to the corresponding dashboard tab.

Every server operation independently verifies:

1. The current room code.
2. The canonical host token.
3. Authoritative room status `lobby`.
4. No setup-host seat has been claimed by a player phone.

After a local server restart, the TV may reclaim the canonical host token through the guarded pre-player endpoint. Reclaim is rejected after the first player joins and never resets the room.

Repository writes additionally require the local `--admin-content-editor` capability. Detached simulations do not require that write capability.

## Dashboard sections

### Overview

The overview derives its counts from the current canonical registries. It reports family and lifecycle totals, artwork warnings, duplicate IDs, invalid or unreachable content, topology health, phone derivative status, report freshness, and server capability interlocks.

### Content Archive

The archive currently normalizes 417 source records across gameplay cards, gear, Followers, Tile Challenges, operatives, legacy Missions, scenarios, and nemeses. The older 398-record P23 lifecycle matrix is retained as evidence and marked stale when its count differs.

Authored hidden text is visible with a permanent spoiler warning. Live private assignments, inventories, choices, tokens, room codes, and player data are never loaded into the archive.

### Map and Presentation Inspector

The inspector preserves the 49-sector canonical topology and detached movement tools. Each sector exposes links to relevant content plus the status of:

- Signal Theatre environment art.
- Signal Cartography art.
- Legacy compatibility tile art.

Compatibility assets remain explicitly labelled and are not treated as production presentation.

### Test Lab

The Test Lab uses the existing canonical detached resolver. Single-card runs and bounded batches may use fixed or seeded dice, operative presets, inventory, prompt continuation, effect traces, and state diffs.

Simulation isolation prohibits gameplay broadcasts, persistence writes, gameplay timers, and append-only room events. The browser never executes shell commands.

### Reports and Codex Tools

The dashboard reads only an allowlisted set of repository-relative reports. Missing reports remain visible as missing evidence. Known record counts are compared with the current canonical archive.

Codex handoffs export JSON or Markdown containing:

- Canonical ID and family.
- Repository-relative source and artwork paths.
- Authored gameplay and lifecycle data.
- Relationships and warnings.
- Focused test files.

Exports exclude credentials, room codes, player names, absolute workstation paths, and live private state.

## Accessibility and motion

- The rail is keyboard navigable and uses native buttons.
- Scrollable work areas remain bounded to the viewport.
- Selected tabs use text and shape in addition to colour.
- Authoring-spoiler and authorization states are text-labelled.
- Reduced motion disables dashboard and entry transitions.
- Returning to the lobby restores the normal Signal Theatre surface.
