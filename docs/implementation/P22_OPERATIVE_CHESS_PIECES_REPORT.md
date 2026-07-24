# P22 Operative Chess Pieces Implementation Report

Date: 2026-07-23

## Outcome

Signal Theatre now presents the active sector as a full-screen original environment and places public operatives on it as six selectable custom Signal Pieces. Existing gameplay, movement topology, server authority, save version, privacy projections, character data, and enemies are unchanged. The public seat message gains one optional presentation-only field, `signalPieceId`, so the TV can restore the choice across devices.

## Six-piece expansion — 2026-07-24

- Beacon: tall split signal crown
- Bastion: broad fortress silhouette
- Lantern: caged halo reliquary
- Harrow: forked directional blade
- Reliquary: ancient split shield
- Compass: four-point signal crown

Players choose a piece on the phone before selecting their operative. The server validates the six-value catalog and stores the choice on the seat. Older snapshots without the optional field receive a deterministic seat-order fallback. No save-version migration is required.

The previous straight journey asset is no longer rendered. `SignalJourneyTrack` recreates the lower route as a jagged or curved SVG signal rift with small way-stops and one central event stop. The path varies deterministically by confirmed route and current sector; cross-ring travel uses a distinct warm broken-crown path. The selected piece waits at center during stable events and challenges, exits only after a confirmed movement, crosses intermediate environments, and enters the destination to settle at center. The track never dispatches a command or calculates movement.

## Environment system

Forty-nine original Ashenreach environment PNGs were generated with the built-in image generator and stored under:

`public/assets/riftfall/environments/signal-theatre/sectors/`

All images are 1672×941. They have 49 unique SHA-256 hashes and total 111,353,470 bytes. The catalog covers 24 outer, 16 middle, 8 inner, and 1 center sector. Signal Theatre renders zero legacy map-tile images.

The runtime manifest, asset path registry, prompt catalog, content audit, and UI direction now share the canonical environment root.

## Presentation architecture

- `signalTheatreEnvironmentManifest.ts` maps every canonical sector to one environment.
- `operativePiecePresentation.ts` owns stable public identity and deterministic formation geometry.
- `OperativeChessPiece.tsx` frames the chosen generated piece around existing portraits, player symbol, colour, and initials.
- `SignalJourneyTrack.tsx` renders the non-linear authoritative route and selected movement marker.
- `hostMovementPresentation.ts` recognizes only a server-confirmed move matching the prior authoritative destination.
- `useSignalTheatreJourney.ts` presents the prior route, cancels timers on change/unmount, suppresses reconnect replay, and honors reduced motion.
- `SignalTheatreHost.tsx` composes environment, pieces, current public action, scenario pressure, result, battle, roster, and handoff.
- Development-only fixtures and the `pieceVariant` query support visual comparison without adding protocol, save, or server fixture state.

## Integration

- **Overview / turn start:** active sector dominates; active player, operative, location, and required action remain visible.
- **Movement:** only canonical route sectors are shown; cross-ring transitions use a longer visual segment.
- **Arrival / encounter:** piece landing and destination ring complete before the encounter presentation takes visual focus.
- **Battle / result:** authoritative arithmetic and consequences remain above the environment; pieces recede without disappearing.
- **Waiting / handoff:** public actor and action remain explicit; emphasis transfers once.
- **Victory / defeat:** the final stable sector remains atmospheric background beneath the authoritative result.
- **Reconnect:** stable public state restores without replaying completed movement.

## Files added

- `src/client/tv/OperativeChessPiece.tsx`
- `src/client/tv/OperativeChessPiece.css`
- `src/client/tv/operativePiecePresentation.ts`
- `src/client/tv/hostMovementPresentation.ts`
- `src/client/tv/useSignalTheatreJourney.ts`
- `src/client/tv/signalTheatreEnvironmentManifest.ts`
- `src/client/tv/signalTheatreDevFixtures.ts`
- `src/client/tv/SignalJourneyTrack.tsx`
- `src/client/tv/signalJourneyPathPresentation.ts`
- `src/shared/signalPieceCatalog.ts`
- `src/server/__tests__/signalPieceSelection.integration.test.ts`
- P22-focused tests and browser capture script
- 49 new Signal Theatre environment PNGs
- 6 new Signal Piece PNGs
- P22 design, implementation, and QA documents

## Files updated

- `src/client/tv/SignalTheatreHost.tsx`
- `src/client/tv/SignalTheatreHost.css`
- `src/client/tv/TvApp.tsx`
- `src/client/shared/assetPaths.ts`
- `src/client/shared/types.ts`
- `src/client/phone/PhoneApp.tsx`
- `src/client/styles.css`
- `src/game/schema/session.schema.ts`
- `src/server/roomServer.ts`
- `src/server/sessionState.ts`
- `src/game/assets/design/imagePrompts.ts`
- `docs/UI_DIRECTION.md`
- `docs/ASSET_PIPELINE.md`

## Art protection

- Existing legacy map art modified: 0
- Existing operative portraits modified: 0
- Existing Signal Theatre UI art modified: 0
- Existing art removed: 0
- New character art: 0
- New environment art: 49, explicitly authorized by the P22 clarification
- New player-marker art: 6, generated specifically for the selectable Signal Piece family
- Reference-game assets transferred: 0

Portraits are loaded from their existing runtime path and cropped only in CSS. Missing portraits use a text/SVG fallback.

## Verification summary

- Content validation: pass
- Typecheck: pass
- P22 focused tests: 5 files, 22 tests passed
- Client suite: 65 files, 500 tests passed
- Server integration suite: 44 files, 380 tests passed
- Engine plus rules suite: 71 files, 771 tests passed
- Rules-only suite: 13 files, 72 tests passed
- Production build: pass
- Asset audit: 501/501 present, 0 missing, 0 invalid, 0 placeholders
- Browser QA: 66 P22 screenshots, 36 Signal Theatre resolution-integration screenshots, and 11 focused recordings
- Browser console errors: 0
- Canvas/WebGL nodes: 0
- Overflow, escaped pieces, and severe piece overlap: 0

Physical-room TV testing was intentionally excluded at the user's direction; browser QA at the three target resolutions is complete.
