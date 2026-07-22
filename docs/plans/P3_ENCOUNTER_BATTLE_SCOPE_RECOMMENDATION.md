# P3 encounter and battle scope recommendation

## Recommendation

Implement one controlled vertical slice only:

`Threat focus -> battle entry -> one authoritative opposed comparison -> optional pre/post-roll reaction -> final totals -> outcome -> consequence summary -> one Continue -> board`

This is a recommendation, not an implementation. P0, P1, and P2 remain unchanged.

## In scope

- One shared encounter-focus shell for enemy battle and the existing fixed-difficulty check variants.
- Clear active operative, opponent/Threat, tested stat, difficulty or enemy total.
- One calculation model: active effective stat, die, named modifiers, helper contribution where already canonical, final total.
- Automatic authoritative enemy roll shown once.
- Existing legal pre-roll and post-roll reactions, including reroll cost and decline.
- Success, failure, and tie language from the canonical resolver.
- Wound/reward/consequence rows already produced by the server.
- One owner Continue action after all blocking follow-ups resolve.
- Public TV result plus private active-phone controls and named waiting states.
- Reconnect and reduced-motion fixtures for every stage.

## Out of scope

- Inventory or Equipment architecture redesign.
- Shop presentation, transactions, pricing, or stock.
- New battle rules, probability, dice, modifiers, reward types, or encounter content.
- Movement, topology, tile-arrival, mission, Scar, assistance, or economy changes.
- New audio/assets or ambient effects.
- Competitive target/reward rule changes.

## Server authority boundary

The server remains sole owner of encounter ID, resolution ID, combatants, tested stat, base/effective values, modifiers, dice, rerolls, timing windows, outcome, consequence, pending owner choice, Continue eligibility, and completion. Clients submit only existing typed intents. Animation never advances gameplay. Stale, wrong-owner, duplicate, early-roll, early-Continue, and replayed reaction intents reject.

## Projection boundary

### TV public payload

Encounter identity/art, public combatants, tested stat, public modifier labels, dice after reveal, totals, outcome, public consequences, and a public-safe waiting reason. Never private inventory, unselected reaction options, hidden missions, Rivalry targets, or owner-only reward choices.

### Active phone payload

Exact current stage, one primary action, legal private reactions, costs, usable item identity/effect, calculation breakdown, private consequence choice, and Continue when legal.

### Waiting phone payload

Public encounter identity, acting player's display name, and a precise waiting reason. No controls or private choice data.

## Host responsibilities

- Keep the board visible during encounter entry and return.
- Focus on large combatant/Threat art during calculation.
- Show both totals simultaneously and the outcome once.
- Hold the public result while a private consequence is pending.
- Never require TV input.

## Active-phone responsibilities

- Auto-route to the battle/required-action view.
- Keep one primary action above the fold.
- Show reroll/use/decline only in the legal timing window.
- Show exact costs and invalid reasons.
- Restore the same stage on reconnect without replay.

## Waiting-phone responsibilities

- State who acts and what is pending.
- Avoid unusable buttons and hidden tactical information.
- Transition when the authoritative projection changes.

## Reconnect behavior

- Restore `activeResolution` and its stage exactly.
- Completed dice, reactions, spends, consequences, and rewards do not animate as new events.
- A pending reaction remains owner-only and usable once.
- A completed Continue cannot replay.
- Legacy pending-enemy-roll normalization remains supported.

## Reduced motion

- Replace card travel with opacity/scale emphasis.
- Settle dice immediately while retaining raw values.
- Show modifier and total rows without staged motion.
- Preserve the same hold state, outcome, and next action.

## Deterministic screenshot fixtures

1. Enemy battle entry.
2. Pre-roll reaction available and declined.
3. Reroll accepted with explicit cost.
4. One ordinary roll and one multi-source modifier roll.
5. Enemy die revealed exactly once.
6. Success, failure, and tie.
7. Wound consequence.
8. Reward consequence and private pending choice.
9. Public TV waiting state.
10. Reconnect before roll, after roll, at consequence, and before Continue.
11. Reduced-motion equivalents at phone 390 x 844 and TV 1920 x 1080 / 1366 x 768.

## Focused tests

- Correct combatants, owner, tested stat, raw dice, modifiers, totals, and result.
- Enemy die generated once; reconnect does not reroll.
- Optional reaction appears only to owner and only in its timing window.
- Reroll cost is validated and applied once.
- Tie wording matches rules.
- Consequences/rewards apply once and precede Continue.
- TV never receives private inventory/reaction/reward options.
- Waiting phones receive no actionable controls.
- Continue is absent while a canonical prompt blocks completion.
- Duplicate/stale/wrong-owner intents reject.
- Reduced motion changes presentation only.

## Likely files affected

- `src/client/tv/HostBattleOverlay.tsx`
- `src/client/tv/HostBattleChamber.tsx`
- `src/client/tv/hostBattleState.ts`
- `src/client/tv/BattleDiceAnimation.tsx`
- `src/client/phone/PhoneBattleView.tsx`
- `src/client/phone/PhoneRequiredActionShell.tsx`
- `src/client/phone/inventoryPresentation.ts`
- `src/client/shared/types.ts`
- narrow projection/state selectors in `src/server/roomServer.ts`
- focused TV, phone, integration, reconnect, and privacy tests

The reducer should change only if a proven projection/stage defect cannot be fixed at the presentation boundary; no rules rewrite is authorized.

## Risks

- Existing staged resolution paths may use slightly different data for battle, Hazard, Anomaly, and tile Challenge.
- Modifier duplication can occur if passive and active presentation sources are merged incorrectly.
- Reconnect may replay purely visual transitions if animation identity is not keyed to the stable resolution/stage.
- Private reaction or reward choices can leak if TV consumes owner projections.
- Long names and six-player waiting context can crowd 1366 x 768.

## Acceptance criteria

1. The combatants and tested stat are identifiable immediately.
2. Raw die, modifier sources, and final totals are visually distinct and authoritative.
3. Enemy roll and each player roll occur exactly once.
4. Optional reaction cost/timing is explicit; decline is clear.
5. Outcome and exact consequence appear once and remain reviewable.
6. One Continue is shown only after all blockers resolve.
7. TV is public-safe; only the owner phone can act.
8. Waiting phones name the actor and pending action.
9. Reconnect restores without replay or duplicate effect.
10. Reduced motion loses no information.
11. Phone 390 x 844 and TV 1920 x 1080 / 1366 x 768 have no overflow or clipped primary action.
12. Existing engine/rules/integration/client tests remain green; movement, shop, inventory, economy, topology, saves, and Heat retirement are unchanged.

## Four-seat gate

- **New player:** can identify participants, stat, outcome, and next action without opening a log.
- **Optimizer:** can audit every legal modifier and reaction cost without browsing unrelated inventory.
- **Family player:** can follow the sequence with one acknowledgement and readable couch-distance totals.
- **Rules lawyer:** can prove projection ownership, exact calculation, stage order, reconnect identity, and replay rejection.
