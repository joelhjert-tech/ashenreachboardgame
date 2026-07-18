# Scenario Gameplay Review — Relic Cross-Reference

Date: 2026-07-13  
Scope: report-only review of the six current Ashen Reach scenarios  
Baseline: `phase/heat-retirement-1x` at `6e081aff6e3d5823b5853684b574803b57cd474d`

## Verdict

Ashen Reach has a stronger scenario foundation than a simple alternate-ending system: every scenario has public telemetry, persistent server-owned state, mode-aware setup, board hooks, and a bespoke confrontation plan. The six concepts are meaningfully distinct.

The main problem is not a lack of scenario ideas. It is that the authored sheets, objective-trigger system, ambient rules, and final confrontation do not yet form one authoritative contract. In several scenarios, the sheet promises mechanics that are only partly implemented; more importantly, side-objective triggers write to the same counter used by the confrontation and can end the game without reaching the Cinder Gate.

The best next step is therefore a scenario-contract alignment pass, not six redesigns. Preserve the themes and current state model, decide which rules are canonical, then make preparation feed a visible final confrontation instead of competing with it as a second victory route.

## Relic reference model

The useful comparison is structural, not thematic.

The official *Relic* rulebook defines a scenario sheet as four things: a title, special rules that affect all players throughout the game, a confrontation at the center space, and—where applicable—enemy attributes. The active player resolves the confrontation on the center space, and the first player to satisfy that confrontation's winning condition wins. The special rules can significantly change the whole game, but they remain legible on one sheet.

The *Nemesis* expansion demonstrates a second useful pattern: ordinary play can build a scenario-specific resource or deck, and the center confrontation consumes or tests that preparation over repeated attempts. Preparation and climax are linked, but not confused.

What Ashen Reach should borrow:

- One unmistakable global rule or pressure identity per scenario.
- Preparation that materially changes the final confrontation.
- A climax that owns victory unless an alternate-win condition is explicitly authored.
- Scenario rules compact enough to explain before the first turn.
- Failure that creates forward pressure without erasing hours of preparation.

What Ashen Reach should not copy:

- Relic's IP, names, card text, or exact scenarios.
- Long stretches where only the final space matters.
- High-variance confrontations that invalidate preparation.
- A uniform “reach center and roll” ending for every scenario.

## Current architecture

| Layer | Current role | Finding |
|---|---|---|
| `src/game/data/scenarios.ts` | Authored sheet, presentation, gate text, confrontation plan | Rich design intent, but several described rules are not authoritative runtime behavior. |
| `src/game/rules/scenarioAmbient.ts` | Persistent pressure and lifecycle hooks | Implements the strongest scenario differentiation, but only a subset of each sheet. |
| `src/game/rules/scenarioObjectiveTriggers.ts` | Contract, threat, and sector objective marks | Uses each scenario's confrontation progress key and may complete the scenario directly. |
| `src/server/roomServer.ts` | Gates, modifiers, rolls, mutation, continuation | Server-authoritative, but contains several proxies and gate checks that do not pay the costs described on sheets. |
| `src/game/engine/reducer.ts` | Applies progress and ends sessions | `SCENARIO_OBJECTIVE_COMPLETED` ends the game outside the final confrontation. |
| Phone/TV projections | Public status and private actions | Strong public telemetry and privacy boundary; some labels expose the authored/runtime mismatch. |

### Highest-priority contract defect

All six objective-trigger maps write to `scenario.winConditionKey`. Reaching `scenario.victoryThreshold` dispatches `SCENARIO_OBJECTIVE_COMPLETED`, which ends the session. The final confrontation writes to the same key.

Consequences:

- A side activity can win without entering the Cinder Gate.
- One side-objective mark bypasses final-gate checks because gate validation returns early whenever the win-condition counter is already above zero.
- The same label can mean preparation, confrontation success, and game victory.
- Some ambient hooks and objective hooks respond to the same event and can update related state twice.

Recommendation: split scenario state into explicit concepts:

- `preparation` or named scenario resources: Seal Integrity, Crown claims, Engine Keys, etc.
- `confrontationProgress`: marks earned only during the current or cumulative final confrontation, according to the scenario.
- `victory`: emitted only by the approved climax or an explicitly named alternate-win rule.

Do not implement the split until each scenario's intended accumulation/reset semantics are approved and snapshot compatibility is designed.

## Scenario-by-scenario review

### 1. The Broken Seal

Current identity: tutorial co-op scenario with a fluctuating Seal Integrity track, restorative board actions, and three final checks.

What works:

- The pressure die is easy to explain.
- Solo tuning is already distinct: 8 starting seals and softer turn-start pressure.
- Collapse/reset creates recoverable danger rather than abrupt defeat.
- The final gate teaches Artifacts and Contracts.
- Public telemetry clearly exposes seals, pressure odds, collapses, and restoration marks.

Current contract gaps:

- The sheet says pressure occurs at end of round; runtime rolls at turn start.
- The sheet says Blue threats restore seals; runtime ambient logic restores a seal after any enemy defeat.
- Contracts and the shrine advance `sealRestorationMarks`, but do not restore `sealTokens` through the ambient rule.
- The sheet describes Artifact-charge restoration, shrine payment, shop conversion, and specific board setup that are not represented as one complete authoritative flow.
- Objective triggers can reach the victory threshold and end the game before the final confrontation.
- The first objective mark bypasses the final gate on later confrontation attempts.

Relic-informed improvement:

Make Seal Integrity the journey resource and restoration marks the confrontation resource. Board actions should restore or stabilize Seal Integrity; they should not themselves win. At the Core, current Seal Integrity should grant a deterministic benefit, such as reducing one or more difficulties or preventing one backlash. This makes the whole run matter in the climax.

Recommended contract:

- Keep the pressure die and two-collapse structure.
- Choose one timing: round end is easier to forecast; turn start is more urgent. The sheet and telemetry must match it.
- Restrict enemy restoration to Blue threats if that is the intended teaching goal.
- Make Contracts and shrine actions restore Seal Integrity, matching the sheet.
- Require a Cinder Gate confrontation for victory.
- Reset confrontation marks after a failed attempt if the intended rule is “two successes in one engagement”; current cumulative storage contradicts that wording.

Priority: **P0 contract alignment; otherwise retain design.**

### 2. The Throne of Ash

Current identity: hybrid rivalry scenario where Crowns improve battle performance, weaken skill checks, and can be lost when wounded.

What works:

- Crown ownership creates visible table politics.
- The +1 battle / -1 skill trade-off is mechanically enforced.
- Wounds return Crowns, giving opponents and threats a way to alter the race.
- Crown count changes the number and difficulty of final checks.

Current contract gaps:

- Runtime grants a Crown after every enemy defeat, while the sheet says Elite victories.
- The objective map separately advances the same `crownClaims` key for revenant defeats, Contracts, and one sector action.
- Because ambient and objective hooks both run after qualifying events, Crown ownership and scenario-completion progress are conflated.
- Authored Crown Hunger, all-Crowns-held timing, Scar pressure, Crown sectors, paid Crown claims, and Ash Regent spawn are not represented as a complete runtime loop.
- `crownClaims` acts as total supply, per-seat benefit source, confrontation context, and victory counter.
- The sheet says six throne claims; runtime caps Crown claims at three and uses confrontation threshold one.

Relic-informed improvement:

Relic's best competitive scenarios alter incentives globally while retaining a clear confrontation. Here, Crowns should be positional leverage, not also the victory counter. Keep three physical/public Crown claims and add Crown Hunger only if it creates a meaningful table response.

Recommended contract:

- Separate `crownsInPlay`, per-seat Crown ownership, and confrontation progress.
- Define qualifying Crown sources exactly; recommend Elite/revenant victories, Contract completion, and named Crown sectors—not every enemy.
- Decide whether Crown Hunger is production scope. If yes, implement a visible 0–6 track and a precise Ash Regent transition. If no, remove it from current player-facing sheet text.
- Final confrontation remains mandatory; owned Crowns reduce required checks exactly as now.
- Avoid a hard reset of all preparation on one bad roll. Returning one Crown per suffered Wound is already sufficient counterplay.

Priority: **P0 state separation; P1 Crown Hunger decision.**

### 3. The Mirror of False Heroes

Current identity: temptation scenario where acquiring power increases Reflection Pressure and raises final difficulty.

What works:

- It has the strongest moral/mechanical premise: shortcuts strengthen the final opposition.
- Reflection Pressure is server-owned and persists through reconnect/snapshot v2.
- The threshold comparison and final difficulty are tested.
- The final checks scale directly with pressure, so journey choices matter.

Current contract gaps:

- The sheet describes per-player Reflection; runtime uses a shared `mirrorPressure` counter, with Scars as a fallback/proxy.
- Completing any Contract raises pressure, although the sheet says selfish rewards do.
- Gaining any Gear raises pressure, although the sheet says Artifact use/forbidden power.
- Scars do not consistently feed the same authoritative counter described by the sheet.
- The public track says maximum 8, but the mode-sensitive confrontation threshold blocks attempts at 8 solo / 6 other modes.
- At threshold, confrontation ends immediately rather than spawning the False Hero described by the sheet.
- The confrontation plan still contains a legacy `gain_heat` effect at high pressure, but the earlier threshold block makes it unreachable in current ordinary flow.
- Objective triggers can complete the scenario through Contracts, breachborn defeats, or one sector action without facing the Mirror.

Relic-informed improvement:

This scenario should have one compact temptation rule, not several approximate proxies. Relic-style global rules work because players can remember what feeds the ending.

Recommended contract:

- Keep shared Reflection Pressure; it is simpler and already persisted. Remove claims of per-player Reflection unless a private system is deliberately added later.
- Define exactly three pressure sources using events the server already knows. Recommended: gain an Artifact, gain a Scar, accept a specifically typed selfish reward.
- Do not make ordinary Contract completion inherently selfish.
- Replace the hard “cannot confront” cutoff with one visible consequence: either the False Hero becomes the confrontation, or pressure adds difficulty up to a documented cap. Prefer the former for drama and to avoid an unwinnable lock.
- Remove the unreachable legacy Heat effect in a dedicated compatibility-safe phase.
- Side objectives may reduce pressure or unlock the gate, but should not directly win.

Priority: **P0 authored/runtime correction; highest design-risk scenario.**

### 4. The Devourer Beneath

Current identity: a roaming public boss that consumes unresolved threats, accelerates Doom, and wounds the table at eruption.

What works:

- This is the most complete and board-transforming scenario.
- The Devourer has an actual location, movement cadence, acceleration, and contact battle.
- Leaving threats unresolved creates an elegant shared cost.
- Doom rises and falls through understandable actions.
- The final confrontation is short and distinct.
- Public TV visuals can show the roaming threat and Doom state.

Current contract gaps:

- Runtime movement stays on the Outer Ring; authored Middle Ring entry at high Doom is not implemented.
- Threat consumption is live, but shop locking and placing Red threats at eruption are not part of the same authoritative loop.
- Eruption and contact damage mutate Wounds directly in ambient state, which should be reviewed against the normal prevention/recall pipeline.
- The gate says “spend” Trophy value or an Artifact charge, but runtime checks possession and does not consume either.
- Final difficulty reduction is derived from held plus equipped Gear (`salvageLeverage`), not Trophy value spent or the authored Maw Spike formula.
- Red-threat side objectives can directly complete the scenario instead of preparing the Maw confrontation.

Relic-informed improvement:

This already captures the best scenario-sheet lesson: one global rule makes the board feel different. Focus on honesty and cost resolution rather than adding features.

Recommended contract:

- Keep the roaming/consumption/Doom loop unchanged.
- Make the final gate a server-authoritative payment/consumption step, or rewrite “spend” to “possess.” Prefer actual Trophy spending because it creates a meaningful preparation decision.
- Replace the Gear-count difficulty proxy with the named inputs: Trophy spend and Maw Spike.
- Route eruption Wounds through ordinary prevention and recall handling.
- Defer Middle Ring movement and shop locks unless playtests show the current loop is too soft; both add substantial UI and route complexity.
- Side objectives should reduce Doom or create Maw preparation, not win outright.

Priority: **P0 gate honesty; P1 wound pipeline; otherwise closest to playtest-ready.**

### 5. The Labyrinth Engine

Current identity: a rotating five-mode rules machine that changes relevant stats and the final check sequence.

What works:

- Turn-start rotation is deterministic and visible.
- Grit mode's enemy modifier is enforced.
- Matching-stat failure raises Engine Instability.
- The final confrontation begins at the live mode and rotates through three stats.
- This is the strongest replayability concept in the catalog.

Current contract gaps:

- Only part of the five-mode rules are live. Command shop tax, Signal/Blue changes, Guile draw choice, Forge repair discount/exhaustion, and several rewards are sheet text rather than one enforced ruleset.
- A matching-stat success currently produces a summary but no persistent benefit, despite the sheet promising Salvage or Tactics.
- Engine Instability rises but has no complete collapse or threshold loop matching the sheet.
- Engine Keys appear in the gate but lack a single clear acquisition/state path.
- `buildScenarioPlan` reduces the five-mode index modulo three before creating the plan, so some live modes can map to the wrong starting confrontation mode.
- Objective triggers can complete the scenario through Contracts or sector actions without the Engine confrontation.

Relic-informed improvement:

The global rule must be memorable enough to check every turn. Five unrelated mode effects are ambitious; the best Relic sheets usually anchor play around one rule family.

Recommended contract:

- Preserve five modes, but give them one consistent grammar: “matching [stat] gets X; opposing lane gets Y.”
- First implementation candidate: each mode grants +1 to its matching stat check and +1 difficulty to its associated threat lane/category. Avoid five bespoke subsystems.
- Make matching successes award Engine Key progress, not generic Salvage/Tactic choices.
- Make Engine Instability a visible 0–6 clock with one precise consequence.
- Fix the modulo-three confrontation context so all five modes can start correctly.
- Require the final confrontation; Engine Keys reduce difficulty or absorb a failed check.

Priority: **P0 mode-index defect and authored/runtime truth; P1 simplify mode grammar.**

### 6. The Dying Star

Current identity: a hard public timer where each turn and each Wound burns Starfire, while Artifacts restore it.

What works:

- The timer is immediate and understandable.
- Wounds accelerating Starfire gives the whole table a reason to care about another player's danger.
- Artifact acquisition restores Starfire through a live hook.
- Zero does not simply end the game; eruption/reset creates a dramatic recovery cycle.
- Final checks have a clear Forge–Grit–Signal sequence.

Current contract gaps:

- The sheet says end of each player turn, which runtime enforces; expected duration and multiplayer scaling need testing because larger tables burn the track much faster per round.
- Contract, Star-sector, Forge, and Artifact-charge restoration are not all one complete live loop; objective triggers instead write ignition marks and may end the game.
- Artifact acquisition is detected through general Gear gain, which may count normal Equipment depending on the caller payload.
- Eruption and wound-triggered collapse apply direct Wounds, which should be reviewed against prevention and recall.
- The sheet says opening cost is an Artifact charge or two Wounds; runtime plan applies two Wounds only when the player holds no Gear, and does not clearly spend an Artifact charge.
- Failed confrontation checks remove Starfire in the sheet, but runtime instead adds Wounds per failed check; those Wounds may then burn Starfire through the ambient hook, coupling the effects indirectly.

Relic-informed improvement:

The scenario already has an excellent global rule. Make every repair action feed the same Starfire track and make the final opening cost explicit and atomic.

Recommended contract:

- Keep the end-of-turn timer and Wound burn.
- Scale initial Starfire or burn cadence by occupied player count after measured playtests; do not assume per-turn scaling is fair at 1–6 players.
- Make Contracts, named Star sectors, Forge work, and Artifact charges restore Starfire—not ignition/victory marks.
- Add an authoritative opening choice: spend one exact Artifact charge or suffer two Wounds through the normal Wound pipeline.
- Decide whether failed final checks cost Wounds, Starfire, or both. Recommend Wounds that naturally burn Starfire once; the sheet should state that single causal chain.
- Require three successful checks in one confrontation if that is the intended hard ending; current stored progress is cumulative.

Priority: **P0 opening-cost and progress alignment; P1 player-count tuning.**

## Comparative scorecard

Scores describe current implemented gameplay, not authored aspiration. Five is strongest.

| Scenario | Turn-one identity | Board impact | Preparation-to-climax link | Rules truthfulness | Mode scaling | Overall readiness |
|---|---:|---:|---:|---:|---:|---:|
| Broken Seal | 5 | 4 | 3 | 2 | 4 | 3 |
| Throne of Ash | 4 | 3 | 4 | 1 | 2 | 2 |
| Mirror of False Heroes | 4 | 2 | 5 | 1 | 2 | 2 |
| Devourer Beneath | 5 | 5 | 3 | 3 | 3 | 4 |
| Labyrinth Engine | 5 | 2 | 4 | 1 | 2 | 2 |
| Dying Star | 5 | 4 | 4 | 2 | 2 | 3 |

## Cross-scenario improvements

### 1. Establish a strict scenario contract

For every scenario, maintain a machine-verifiable matrix:

| Contract field | Required answer |
|---|---|
| Global rule | What changes from turn one? |
| Pressure | What moves it, when, and at what bounds? |
| Preparation | What can players deliberately do? |
| Gate | Is it possession, spending, or state threshold? |
| Confrontation | Are marks cumulative or per attempt? |
| Failure | What mutates, and through which authoritative pipeline? |
| Victory | What exact action can end the game? |
| Scaling | What changes at 1, 2, 3, 4, 5, and 6 players? |
| Projection | What must TV, owner phone, and other phones know? |

Validation should reject or flag player-facing scenario claims that have no mapped runtime hook.

### 2. Separate preparation from victory

Recommended invariant:

> Side objectives may alter scenario pressure, grant a named preparation resource, or unlock/modify the confrontation. Only the approved confrontation or explicitly authored alternate-win action ends the session.

This is the single most valuable lesson from Relic's scenario architecture.

### 3. Make costs honest and atomic

“Spend,” “pay,” and “exhaust” must invoke authoritative mutations. Possession checks must say “hold” or “carry.” Apply this to Devourer Trophy/Artifact gates and the Dying Star opening cost.

### 4. Use one memorable rule family per scenario

- Broken Seal: stabilize and restore.
- Throne: claim, carry, and drop Crowns.
- Mirror: choices feed Reflection.
- Devourer: unresolved threats feed the roaming boss.
- Labyrinth: current mode changes matching actions.
- Dying Star: turns and Wounds burn Starfire; repairs restore it.

Anything outside that sentence should earn its complexity through playtest evidence.

### 5. Standardize scenario harm

Ambient rules currently mutate Wounds and Scars directly in places. Scenario harm should use the same prevention, recall, actual-delta, and result-summary paths as encounters. This is especially important for Broken Seal collapse, Devourer eruption/contact, and Dying Star eruption.

### 6. Test player-count pressure by turns, not rounds alone

Devourer and Dying Star advance after each player turn; their pressure rate therefore increases with occupied seats. Larger tables also have more actions, but not necessarily equal access to the relevant repair opportunities. Build deterministic simulations for 1–4 players first, then separately validate 5–6 player claims.

### 7. Preserve public/private boundaries

Relic is almost entirely public; Ashen Reach's phone architecture can do better. Keep scenario tracks, gates, and public consequences on TV. Keep Rivalry agendas and private choices owner-only. Do not add private scenario state until it has a concrete mechanical use.

## Recommended implementation order

### Phase A — Contract and test alignment (highest value, no balance redesign)

1. Add scenario contract tests that distinguish preparation counters from confrontation counters.
2. Prevent side-objective completion from ending a scenario unless explicitly configured.
3. Remove the gate bypass caused by nonzero win progress.
4. Document cumulative-versus-per-attempt confrontation progress for all six scenarios.
5. Add validation or audit coverage for authored/runtime rule mapping.

### Phase B — Fix clear semantic defects

1. Labyrinth five-mode index must remain five-mode through confrontation construction.
2. Devourer and Dying Star “spend” costs must actually spend or be reworded as possession.
3. Broken Seal must restore from the exact approved sources.
4. Throne must award Crowns only from exact approved sources.
5. Scenario Wounds/Scars must pass through authoritative prevention and recall rules.

### Phase C — Scenario-specific design approvals

1. Mirror: shared versus per-player Reflection and threshold outcome.
2. Throne: whether Crown Hunger and Ash Regent are in production scope.
3. Labyrinth: simplified five-mode grammar and Engine Instability consequence.
4. Dying Star: player-count scaling and final-failure consequence.
5. Devourer: whether Middle Ring movement and shop locking justify their complexity.

### Phase D — Browser and broad-playtest pass

For each scenario, run one deterministic browser session covering setup, one pressure tick, one recovery/preparation action, gate rejection, gate acceptance, failed confrontation, reconnect, and victory. Then run representative 1-, 2-, and 4-player sessions for pacing.

## Recommended first contained change

Do not start by adding missing Crown Hunger, Reflection choices, or five bespoke Engine modes.

Start with a report/specification and tests for **scenario progress ownership** across all six scenarios:

- Name every persistent counter and its owner.
- Decide which counters are preparation versus confrontation marks.
- Require confrontation victory for all six current sheets unless an explicit alternate win is approved.
- Preserve current pressure behavior while disentangling counters.
- Define snapshot migration before changing persisted keys.

This is the safest improvement because it fixes a cross-scenario rules contradiction without choosing new balance values.

## Four-seat critique

### New player

The six themes are strong, but a player cannot reliably infer which sheet text is live or why a side activity can suddenly end the game. Each scenario needs one short “during play” rule, one preparation goal, and one clearly labeled final confrontation.

### Optimizer

The largest exploit is progress-key conflation: the cheapest objective route can bypass gates or the climax. Possession checks presented as spending also preserve resources that the sheet says should be consumed. These should be corrected before balance tuning.

### Family player

Broken Seal, Devourer, and Dying Star are easiest to explain because their tracks visibly move. Throne, Mirror, and Labyrinth currently ask players to remember rules that are partly aspirational. Reduce each to its live rule family before adding more prompts or state.

### Rules lawyer

Authored timing, target restrictions, costs, counter ownership, and cumulative progress are not consistently aligned with runtime. A scenario contract table and direct integration tests should become the source of truth. Reconnect should only restore state; it must never reinterpret scenario rules or replay pressure.

## Conclusion

Ashen Reach should retain all six scenarios. None needs retirement or wholesale replacement. The strongest improvement is to make their existing identities mechanically honest:

- journey rules alter preparation;
- preparation modifies access or odds;
- the Cinder Gate confrontation owns victory;
- pressure and harm use authoritative shared systems;
- every visible rule corresponds to tested runtime behavior.

Once that contract is stable, the Devourer is the best benchmark for board impact, the Mirror for choice-to-climax linkage, and the Broken Seal for teachability.

## Sources reviewed

Repository:

- `src/game/data/scenarios.ts`
- `src/game/rules/scenarioAmbient.ts`
- `src/game/rules/scenarioObjectiveTriggers.ts`
- `src/game/rules/scenarioPressure.ts`
- `src/server/roomServer.ts`
- `src/server/sessionState.ts`
- `src/game/engine/reducer.ts`
- Scenario, pressure, objective, confrontation, projection, reconnect, and catalog tests under `src/game/**/__tests__` and `src/server/__tests__`
- `docs/ASHENREACH_RULE_SPINE.md`
- `docs/ASHENREACH_CARD_ECONOMY_SPINE.md`

External reference:

- Fantasy Flight Games, *Relic Rulebook*, especially “Scenario Sheets” and “Scenario Sheet Anatomy.”
- Fantasy Flight Games, *Relic: Nemesis Rulebook*, scenario-sheet setup and confrontation examples.

Relic was used only as a structural benchmark for global rules, preparation, and final confrontations. No Relic names, text, setting, or scenario mechanics are proposed for inclusion in Ashen Reach.
