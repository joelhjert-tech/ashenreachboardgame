# P13 Dice Presentation and Synchronization Report

## Outcome

P13 adds one shared, lightweight presentation layer for authoritative movement, battle, Hazard, Anomaly, and Challenge rolls. It does not add a dice resolver or change the game rules. The server still creates every face, total, modifier, outcome, reroll, and movement value. The clients receive those values and present them.

The final sequence is:

`legal roll -> immediate local command lock -> one server command -> authoritative faces received -> local CSS presentation -> stable raw dice and arithmetic -> existing next state`

## Previous architecture

- `src/game/engine/dice.ts` owned deterministic/server randomness.
- `RoomServer` issued movement and check/battle actions and stored their results in state and the append-only event log.
- Battle projections exposed useful arithmetic, but phone and TV rendered rolls differently.
- Movement exposed only the final movement number; its recorded raw face was not part of the public movement-planner projection.
- Reroll actions were authoritative, but the presentation did not preserve a concise before/after face comparison.
- Reconnect restored gameplay state but presentation components had no shared rule for suppressing a completed animation.

## Final presentation architecture

- `AuthoritativeDicePresentation` is a view-only component used by phone movement, phone battle/check, phone Hazard/Challenge, TV movement, and TV battle/check surfaces.
- `PublicMovementPlannerState` now includes the recorded raw face and stable roll resolution ID from the matching `MOVEMENT_ROLLED` event.
- `BattleSidePresentation` now carries the expected server-authored dice count, raw ordered faces, optional previous faces, rerolled indices, totals, and modifiers.
- The TV and phone use the same public result data. Owner-only reroll actions remain in the owner projection and do not enter TV dice data.
- Fixed-difficulty tests explicitly say that no opposing die is rolled. They no longer display a misleading pending enemy die.
- Legacy/bootstrap payloads remain supported: the new presentation count is optional at the client boundary, with canonical current checks defaulting to the existing two-die rule.

## Synchronization and reconnect

The shared component animates only when the same mounted resolution changes from no face to an authoritative face. A component that mounts with an already-resolved result displays it immediately and does not replay the tumble. Timers are cleared on update and unmount.

The dice animation never dispatches a gameplay action and never controls progression. Movement destinations and battle outcomes continue to appear from the server projection.

## Visual design

- Blackened alloy body with ceramic/bone numerals.
- Worn metal rim, recessed face, restrained ember reflection, and dark casting tray.
- Numeric values always accompany the physical treatment.
- Multi-die values remain separate and retain stable order.
- Raw roll, named modifiers, final value, target, and outcome use unequal hierarchy so the final value is clear without hiding the arithmetic.
- TV dice are larger, but remain inside the map or battle context.

## Rerolls

Existing canonical reroll eligibility, costs, charges, and actions are unchanged. When the server event history contains the prior roll, the presentation marks only changed dice and renders `previous -> new · Rerolled`. No reroll controls or private resource balances are added to TV.

## Input locking

Phone movement and battle/test roll controls set a local submitted state before sending the existing intent. This prevents a second tap while the authoritative update is in flight. The server remains the final duplicate/stale-command guard.

## Files changed for P13

- `src/client/shared/AuthoritativeDicePresentation.tsx`
- `src/client/shared/types.ts`
- `src/client/phone/PhoneMovementView.tsx`
- `src/client/phone/PhoneActionPanel.tsx`
- `src/client/phone/PhoneBattleView.tsx`
- `src/client/phone/PhoneHazardChallengePrototype.tsx`
- `src/client/tv/HostBattleOverlay.tsx`
- `src/client/tv/TvApp.tsx`
- `src/client/tv/__tests__/TvApp.test.tsx`
- `src/client/styles.css`
- `src/server/roomServer.ts`
- `src/client/shared/__tests__/AuthoritativeDicePresentation.test.tsx`
- `src/server/__tests__/dicePresentationProjection.test.ts`
- `scripts/capture-p13-dice-qa.ts`
- P13 design, QA, and implementation documents.

## Browser QA and correction pass

The first render found two defects:

1. Fixed-difficulty Hazards displayed a pending opposition die. This was replaced by an explicit fixed opposing value.
2. The compact 1366x768 TV movement header crowded the actor name. Its compact status label was shortened while retaining the full accessible context.

The first reconnect capture also revealed that the QA URL still contained `resetAuth=1`. The capture harness now removes that one-time query before reconnect testing, so the result is restored instead of intentionally clearing authentication.

The second review found a canonical count mismatch in the battle-ready label. Current server checks roll two dice, so the server projection now includes `diceCount: 2` before faces exist. The phone and TV no longer infer a one-die pre-roll state.

Final browser evidence: 34 screenshots, four WebM recordings, all required target viewport families, zero horizontal overflow, zero console errors, public-safe waiting phone, stable reconnect result, and reduced-motion result.

## Four-seat critique

### New player

The reason, actor, dice count, individual values, final value, and next action are now visible together. Fixed targets are no longer mistaken for enemy rolls.

### Optimizer

Raw ordered faces and modifiers remain auditable. Rerolled faces preserve their old value. The 980 ms local presentation does not delay server state or add an acknowledgement.

### Family/casual player

Numerals remain large and upright after settling. The phone retains the sticky existing primary action. Reduced motion provides the same result and arithmetic without the throw.

### Rules lawyer

Every displayed result comes from server projection or recorded server events. No `Math.random()` or client result resolver was introduced. Reconnect mounts settled state, and fixed difficulty explicitly has zero opponent dice.

## Scope confirmation

- Random generation and seed behavior unchanged.
- Probability, dice sides, movement distance, battle formulas, modifiers, and outcomes unchanged.
- Reroll legality/cost and resource spending unchanged.
- No save schema or save version change.
- No gameplay timing depends on animation.
- No private reroll option was added to TV or waiting phones.
- No unrelated subsystem was redesigned.
- No commit or push was made.

## Verification results

- Focused dice/movement/TV tests: 138/138 passed.
- Client suite: 419/419 passed after repairing stale-command recovery.
- Server integration suite: 357/357 passed.
- Engine/rules suite: 763/763 passed.
- Rules-only suite: 64/64 passed.
- Content validation: passed (18 characters, 71 gear, 109 threats, 36 contracts, 20 anomalies, 30 artifacts, 24 followers, 24 scars, 16 escalations, 30 afflictions).
- Typecheck: passed.
- Production build: passed.
- Asset audit: 435/435 present; zero missing, invalid, placeholder, or release-blocking assets.
- Browser QA: 34 screenshots and four recordings; zero horizontal overflow and zero browser console errors.
- Aggregate `npm test`: attempted for 524 seconds and timed out without reporting a test failure. It is not claimed as passed; every constituent suite passed independently as listed above.
- `git diff --check` and `git diff --cached --check`: passed.
- Final ports 5173/8080: free; no Ashen Reach dev server or Vitest process remains.
- Branch/checkpoint retained: `ui/tv-movement-focus-mode` at `6bd4fc05a292df3749d024070260c27cf61c517a`.

## Concrete remaining risks

- No canonical current fixture resolves three or more operative dice, so P13 did not fabricate a 3+ die example.
- The existing haptic layer has no roll-specific API. P13 documents the future hook but does not add a vibration subsystem.
- The existing audio manager exposes a dice hook, but no new approved original sound asset was available; no sound was added.
