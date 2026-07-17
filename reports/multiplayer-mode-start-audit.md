# Multiplayer Mode And Start Flow Audit

Date: 2026-07-08

## Scope

This audit covers Ashen Reach pre-game multiplayer setup, mode selection, start validation, reconnect behavior, and hidden-agenda privacy. It intentionally does not change or evaluate movement rules, battle math, tile encounter generation, item use, shop behavior, or scenario mechanics outside setup/start gating.

## Current Mode Values

- `SessionMode`: `single-player`, `multiplayer`
- `InteractionMode`: `co-op`, `rivalry`, `ruthless`
- `GameMode`: `standard`, `nemesis_relay`
- Player-facing setup labels: Solo, Co-op, Nemesis

Nemesis is mapped to the existing `rivalry`/`ruthless` hidden-agenda system. No second parallel Nemesis mode was created.

## Co-op State

Co-op is implemented, not only displayed:

- Multiplayer sessions can be created with `interactionMode: "co-op"`.
- Single-player sessions force `interactionMode: "co-op"`.
- Co-op phone projections return `privateRivalry: null`.
- Rivalry agenda reveal/progress is rejected or inert in co-op.
- Shared scenario pressure remains public.
- Player missions/contracts remain per-player when assigned.

## Nemesis / Rivalry State

The existing rivalry/ruthless implementation is the Nemesis rules layer:

- Rivalry/ruthless multiplayer creates owner-private agenda state.
- Owner phone projections include `privateRivalry`.
- Other phone projections do not include another player's private agenda details.
- TV projections do not include `privateRivalry`.
- TV can show only public-safe reveal/completion summaries.
- Spoofed agenda actions are rejected by seat ownership and reveal-state validation.

## Host Start Button Checks

The host start button uses `getSessionStartReadiness()` and the server uses the same helper through `GameRoomServer.startSession()`.

Start is rejected when:

- no player has joined
- single-player has more than one occupied seat
- multiplayer has fewer than two occupied seats
- Nemesis Relay has more than four occupied seats
- an occupied seat has no selected character
- an occupied seat has no selected starting mission
- an occupied seat is not ready
- the room is already active

Start succeeds only after selected starting missions are promoted into `character.activeContract`, turn order is created, and the session becomes active.

## Phone Ready Checks

Phone Ready is server-authoritative:

- `SET_READY` requires a joined seat.
- Ready is rejected until a starting mission is selected.
- Single-player auto-start is attempted only after character, starting mission, and ready are complete.
- Phone projections carry `canReady` and `readyDisabledReason`.

## Solo Auto-Start

Solo is `sessionMode: "single-player"` with `interactionMode: "co-op"`. When the single player presses Ready, the server checks the same start-readiness rules and starts only after character, starting mission, and ready are complete.

## Disconnect And Reconnect

Disconnect behavior:

- Socket disconnect marks the seat as disconnected.
- Character, selected starting mission, and ready state are preserved.
- A fully ready disconnected player does not block host start; setup state is authoritative, not socket presence.

Reconnect behavior:

- Join returns a signed seat token.
- Phone auth persists in localStorage.
- `REJOIN` validates session id, signed token, and seat token.
- Successful reconnect restores the same seat and private phone projection.
- Failed reconnect clears stale local auth and shows a reclaim failure message.

## Hidden Agenda Privacy

Privacy boundary:

- Co-op and solo do not show private agenda sections.
- Nemesis/rivalry owner phones see their own agenda.
- Other phones do not see private owner details.
- TV receives public-safe reveal/completion summaries only.
- TV never receives `privateRivalry`.

## Notes

- Internal code still uses `rivalry` and `ruthless` identifiers. This is intentional to avoid creating duplicate gameplay systems.
- Host setup now labels the competitive hidden-agenda protocol as Nemesis.
- Nemesis Relay remains a separate co-op game mode and is distinct from Nemesis hidden-agenda multiplayer.
