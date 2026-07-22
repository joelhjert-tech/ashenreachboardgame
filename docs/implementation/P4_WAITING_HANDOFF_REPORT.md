# P4 — Waiting, Resolution, and End-Turn Handoff

## Outcome

P4 now uses the existing server-owned `requiredAction` projection as the single presentation contract for result acknowledgement, private resolution, end-turn readiness, and turn handoff. No gameplay phase, command, turn-order rule, save field, or resolver was replaced.

The implemented path is:

`authoritative result → Continue where supported → remaining turn actions → server-confirmed End Turn → TURN_COMPLETED → next authoritative action`

## Architecture

### Previous state

- The server already owned `activeResolution`, private prompts, `canEndTurn`, `CONTINUE_RESOLUTION`, `PHASE_ADVANCED`, and `TURN_COMPLETED`.
- The projection identified the actor and tab, but did not distinguish result, continuation, end-turn readiness, or next-turn readiness.
- The phone inferred end-turn readiness from several client fields.
- Any later patch sequence could clear the phone submission lock even when the required action had not changed.
- TV changed active-player identity immediately but had no stable public handoff identity.

### Final state

`RequiredActionProjection` now adds optional, backwards-compatible presentation semantics:

- `transitionStage`
- `allowedCommand`
- `inputEnabled`
- active, waiting, and host instructions
- authoritative revision
- public-safe `handoff`, derived from the append-only `TURN_COMPLETED` event

The server continues to decide legality and state. The new fields describe existing state; they do not advance it.

### Continue behavior

Resolved battle/test presentations expose `continue-available` and the existing `CONTINUE_RESOLUTION` command. The phone locks the entire projected command tree immediately after submission and keeps it locked until the required-action identity changes or the server rejects the action. The existing ten-second server fallback remains unchanged.

### End Turn behavior

The projection calls canonical `canEndTurn(state, seatId)`. It emits `end-turn-available` only during legal Action or Broadcast states. The existing commands remain unchanged:

- Action → Resolution: `PHASE_ADVANCED` (`finish-actions` presentation)
- Broadcast → Start/next turn: `PHASE_ADVANCED` (`end-turn` presentation)

The phone places the legal End Turn action before optional inventory actions. A blocked End Turn is demoted into the collapsed blocked summary with the server reason.

### Handoff behavior

The TV handoff is derived from the latest authoritative `TURN_COMPLETED` event and current active seat. It names the previous and next players, distinguishes a round wrap, lasts 900 ms, and never blocks the already-authoritative next action. The handoff ID is stored in TV session storage so reconnecting the same display does not replay it.

## Result UX

- Public results remain in the existing battle/test or tile presentation until server advancement.
- Long consequences remain scrollable while Continue stays within the encounter action region.
- Private payment, Equipment, Mission, and Scar decisions continue to project only owner controls.
- Waiting phones receive one concise status block; a duplicated second waiting panel found during screenshot review was removed.
- Submission labels are specific: `CONTINUING`, `FINISHING ACTIONS`, and `ENDING TURN`.
- Stale recovery uses player-facing copy: “The turn has advanced. The current required action has been restored.”

## Phone and accessibility

- The existing P1 action shell is reused.
- Continue and End Turn use existing minimum-touch-target button primitives.
- The next enabled primary control receives focus once when a new authoritative action arrives.
- Waiting copy is one restrained `aria-live` region and names the actor and public action.
- Busy controls use a disabled fieldset, preventing duplicate input.
- Reduced motion changes only the transition animation, not available information or gameplay timing.

## TV presentation

- The board remains the default background.
- A compact industrial handoff strip presents `TURN COMPLETE → NEXT OPERATIVE`.
- The existing live-status banner uses the server’s public instruction.
- Private option IDs, mission content, Scar candidates, inventory choices, and Rivalry information are absent.

## Reconnect and stale actions

- Result and End Turn restore from the same deterministic projection.
- Pending phone submission state is local feedback only and cannot author a result.
- Reconnect does not execute Continue or End Turn.
- Same-display TV reconnect does not replay an already-seen handoff.
- Duplicate and stale commands remain rejected by the existing server reducers and intent validation.

## QA fixtures

The development-only `waiting-handoff` fixture supplies deterministic result, long-result, private-choice, end-turn, handoff, and next-turn states. Existing canonical fixtures supply public damage and private Equipment reward states. The QA endpoint remains environment-gated and token-authorized.

AI-seat turns are not implemented in the canonical game. No AI-turn state, screenshot, or recording was fabricated. Nemesis automation is not a player seat and was intentionally not relabelled as AI.

## Four-seat critique

### New player

The current actor, result, and next action are now explicit. The most important correction was moving End Turn above optional gear once legal.

### Optimizer

The immediate fieldset lock prevents double submission. Handoff is derived from a stable event identity, and the next player can act immediately without waiting for decorative motion.

### Family/casual player

Waiting screens no longer repeat the same status. The 900 ms handoff is readable across the room without slowing repeated turns.

### Rules lawyer

Presentation matches the existing authoritative stages. `canEndTurn` remains the legality source, the previous player loses ownership at `TURN_COMPLETED`, and private prompts retain their existing owner/public split.

## Verification

- Content validation: PASS — 18 characters, 71 gear, 109 threats, 36 contracts, 20 anomalies, 30 artifacts, 24 followers, 24 scars, 16 escalations, 30 afflictions.
- Typecheck: PASS.
- Focused P4 regression set: PASS — 53/53.
- Client: PASS — 398/398.
- Server integration: PASS — 351/351.
- Engine/rules: PASS — 763/763.
- Independent total: PASS — 1,512/1,512.
- Production build: PASS — 550 modules.
- Asset audit: PASS — 435/435 present.
- Browser QA: PASS — 60 screenshots, four recordings, zero horizontal overflow, zero console/page errors.
- Aggregate wrapper: TIMEOUT after 364.048 seconds; it reported no failing assertion before timeout. It is not claimed as passed.
- Save version: unchanged at 2; legacy behavior unchanged.
- Heat: not restored.
- Commit/push: none.
- QA services: closed; ports 5173 and 8080 free.

## Files changed for P4

- `src/client/shared/types.ts`
- `src/server/roomServer.ts`
- `src/client/phone/PhoneRequiredActionShell.tsx`
- `src/client/phone/PortraitControllerView.tsx`
- `src/client/phone/PhoneActionPriorityStack.tsx`
- `src/client/tv/TvApp.tsx`
- `src/client/styles.css`
- `src/server/phaseOneQaFixture.ts`
- focused server/client tests
- `scripts/capture-p4-waiting-handoff-qa.ts`
- P4 QA evidence and reports

These files contained earlier P0–P3 and map/action work before P4. That work was preserved and not reformatted or reverted.

## Remaining risks

- A true human-to-AI handoff cannot be validated until a canonical AI seat/turn system exists.
- Result and Continue are present in the same authoritative patch; the UI does not add an artificial gameplay delay before enabling Continue.
- The aggregate wrapper remains slower than its 364-second execution window even though every constituent suite passes independently.
