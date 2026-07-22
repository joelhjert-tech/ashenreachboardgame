# P5 Setup and Lobby Compression

## Outcome

P5 replaces duplicated client setup inference with a public-safe server setup projection and compresses the path from joining to starting. It does not change modes, scenarios, character eligibility, Ready rules, room ownership, saves, or command outcomes.

## Architecture

Previously, the server enforced Start through `getSessionStartReadiness`, while the phone and TV independently reconstructed parts of setup readiness and waiting copy. The final presentation uses `buildSetupProjection` in the room server. It derives a semantic stage, responsible seat, one allowed command, public instructions, canonical Start legality, and all public-safe blockers from existing room state. Both TV and phone receive that same projection.

- Room creation, joining, seat identity, Host Phone ownership, selections, Ready, and Start remain server-authoritative.
- `getSessionStartReadiness` remains the canonical legality source and now returns all blockers as well as the first reason.
- The projection does not create a parallel setup state machine and is not saved.
- Co-op, Rivalry, Solo, and Nemesis Relay remain selectable under existing rules. No mode silently defaults to Rivalry.
- Scenario and operative stable IDs remain internal authority; the UI presents display data only.
- Reconnect rebuilds the projection from authoritative room state, preserving identity, operative, mission, Ready, and current stage.

## Host lobby UX

- The room code and QR are readable at TV distance without exposing a raw LAN URL or internal room key.
- The lobby shows every configured seat, including quiet open seats, in stable order.
- Each occupied seat shows player display name, connection, Host marker, public operative, and textual Ready state.
- Mode, scenario, connected count, and Ready count are grouped in one setup summary.
- The TV shows all canonical Start blockers by player name, or `READY TO BEGIN` when clear.
- Six occupied seats now fit at 1366×768 without clipping.
- Scenario selection remains a public presentation while selection and confirmation stay private on the Host Phone.

## Phone setup UX

- Join keeps room code primary, preserves the entered name after recoverable errors, locks duplicate submission, and distinguishes invalid/full rooms with player-facing copy.
- Host configuration places mode first, uses concise two-column cards, preserves text/shape selection, then shows a bounded scenario carousel.
- The only setup confirmation remains visible at 360×800 and 390×844.
- Starting mission choices use real private server options; their Select action is visible above the fold.
- A confirmed mission collapses to a compact summary so Ready, Start, blockers, and waiting status remain visible.
- Detailed operative stats, ability, and starting equipment move below the main flow in `Review operative details`.
- Setup stage changes reset the lobby scroll position, preventing a later stage from opening halfway down stale content.
- Start uses the server projection and locks immediately while submitting.

## Privacy and authority

- Rivalry objectives, private missions, hidden starting information, tokens, socket values, and internal room IDs are absent from TV setup projection.
- Other phones receive only public actor/status copy, not another seat's controls or private options.
- Host Phone authority remains the existing `setupHostSeatId`; no host migration or second Host Phone path was added.
- Client-side controls cannot make Start legal and do not enter gameplay optimistically.

## Visual correction pass

Initial screenshots found three defects: Host Phone confirmation below the fold, an oversized confirmed-mission card, and the sixth TV player row clipped at 1366×768. The final pass reduced setup-only card heights, retained a two-column mode grid at 360px, added a compact confirmed-mission layout, reset stale setup scroll, and tightened the crowded TV lobby. A first compact-TV attempt caused QR copy overlap; it was rejected and corrected before the final archive.

## Four-seat critique

- **New player:** the stage heading, selected mode/scenario, named blocker, and one primary action now explain the next step. Mission selection no longer presents an empty fixture state.
- **Optimizer:** scenario/operative choices remain available without removing rules detail; full detail is collapsed rather than discarded.
- **Family/casual:** join code, mode cards, 44px controls, textual selected/Ready states, and short waiting copy remain readable at target sizes.
- **Rules lawyer:** Start is derived from canonical validation; duplicate/stale commands still reject; reconnect cannot create a second seat; mode cannot silently change; Rivalry secrets remain private.

## Files in the P5 slice

- `src/game/rules/sessionStart.ts`
- `src/client/shared/types.ts`
- `src/server/roomServer.ts`
- `src/server/phaseOneQaFixture.ts`
- `src/server/__tests__/requiredActionProjection.test.ts`
- `src/client/phone/PhoneApp.tsx`
- `src/client/phone/PortraitControllerView.tsx`
- `src/client/tv/TvApp.tsx`
- `src/client/styles.css`
- `scripts/capture-p5-setup-lobby-qa.ts`
- `docs/qa/p5-setup-lobby/`

## Scope confirmation

No AI seat behavior, matchmaking, spectator mode, account flow, gameplay board, movement, encounter, battle, shop, inventory, save-version, or mode-rule redesign was added. Existing unrelated dirty work was preserved. No commit or push was made.

## Verification

- Content validation: passed — 18 characters, 71 gear, 109 threats, 36 contracts, 20 anomalies, 30 artifacts, 24 followers, 24 scars, 16 escalations, and 30 afflictions.
- Typecheck: passed.
- Focused setup/phone/TV projection tests: 89/89 passed in the final focused run.
- Engine and rules: 763/763 passed.
- Server integration: 352/352 passed.
- Client: 398/398 passed.
- Independent total: 1,513/1,513 passed.
- Aggregate wrapper: passed with exit code 0 in 370.5 seconds.
- Production build: passed.
- Asset audit: 435/435 present; zero missing, invalid, placeholder, or release-blocking assets.
- Browser QA: 46 screenshots and six recordings; zero horizontal overflow and zero captured console/page errors.
- `git diff --check`: passed.
- `git diff --cached --check`: passed.
- Ports 5173 and 8080: free after QA cleanup.
- Branch/head remained `ui/tv-movement-focus-mode` at `6bd4fc0`; no commit or push occurred.

## Remaining risks

- Start currently transitions synchronously, so there is no durable server loading percentage to display or fixture without inventing state. Submission locking and reconnect-to-result behavior are tested instead.
- Known fallback-art warnings appear only in tests deliberately exercising missing-art behavior; the complete asset audit remains clean.
