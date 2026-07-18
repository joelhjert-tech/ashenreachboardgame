# Heat Retirement H7A — Gateblind Pulse cap-and-threshold approval

Status: **APPROVED H7A — IMPLEMENTED H7B**. The approved rule is implemented in `reports/heat-retirement-h7b-gateblind-pulse-implementation.md`.

Checkpoint: `68d800e feat: retire false route heat effect` on `phase/heat-retirement-1x`.

Stable ID: `gateblind-pulse`.

## Decision

`gateblind-pulse` is approved for a conditional shared-pressure consequence:

> On failure, if Global Escalation is not already one step from collapse, advance Global Escalation by 1.

The authoritative trigger is exact: let `collapseLevel` be the existing mode cap returned by `getEscalationCollapseLevel(sessionMode)`. Request 1 escalation only when the pre-effect `escalationLevel < collapseLevel - 1`; otherwise request 0 and complete the failed Threat with no substitute penalty. Therefore the card can move multiplayer 0–4 to 1–5 and solo 0–6 to 1–7. It cannot move multiplayer 5 to 6 or solo 7 to 8, and cannot itself cause sector collapse.

This is intentionally distinct from `shattered-barricade`, whose unconditional failure gain may reach the cap and end the session. Gateblind is more difficult, appears in three inner-ring graph references rather than one outer-ring reference, and already has scenario-progress upside on success. Its bounded failure raises later difficulty without becoming a frequent direct loss source.

Implementation readiness: **Implemented H7B with the approved narrow typed/source extension**. The existing `ESCALATION_ADVANCED` reducer, mode caps, derived difficulty modifier, public projections, source ledger, reconnect, and session-collapse machinery are reused. The implementation adds only authoritative Gateblind trigger/source validation and sourced zero-request completion at the one-before-collapse boundary; it adds no new shared pending state or scenario-specific branch.

## 1. Current card inspection

| Field | Current authoritative value |
|---|---|
| Stable ID | `gateblind-pulse` |
| Display name | Gateblind Pulse |
| Lane / type | Blue / hazard |
| Region / rarity / tempo | inner / uncommon / stall |
| Test | Signal 10 |
| Severity | 4 authored; H7A retirement severity 3 |
| Success | `advance_scenario`, `gateblindPulsesRead +1`, summary unchanged |
| Failure | `gain_heat 2` |
| Reward / Trophy | no Salvage, Trophy, pile entry, item, or note reward; success owns scenario progress only |
| Graph frequency | three canonical graph references; not an activation probability |
| Persistence | hazard resolution is not persistent; success progress persists in shared scenario progress; the legacy failure creates no active runtime state |

The exact legacy clause is `failEffect: { "type": "gain_heat", "amount": 2 }`. Runtime compatibility contains it as a mechanically inactive legacy Heat effect, so failure currently reports no additional status change. The authored/runtime mismatch is therefore a severe-looking inner Signal test whose failure text encodes obsolete personal Heat but applies no pressure.

The intended identity is shared gate blindness: a failed reading worsens the expedition's public ability to interpret the inner gate. Closest local overlaps are `choir-static-burst`, `cinder-gate-backlash`, and `saint-of-ashes-echo`; the escalation comparison is `shattered-barricade`. The card can recur when drawn again from any of its three graph references, but it does not remain face-up as a persistent escalation object after resolution.

## 2. Authoritative Global Escalation audit

| Concern | Current authority |
|---|---|
| Stored value | `GameState.escalationLevel`, integer at least 0, initialized to 0 in `src/server/sessionState.ts` |
| Mode cap / collapse | `ESCALATION_COLLAPSE_LEVELS` in `src/game/engine/escalation.ts`: multiplayer 6, single-player 8 |
| Difficulty modifier | `getEscalationModifier(level) = floor(max(0, level) / 2)` |
| Gain/loss entrypoint | `GameRoomServer.feedEscalation` in `src/server/roomServer.ts` |
| Authoritative action | `ESCALATION_ADVANCED` in `src/game/engine/actions.ts` |
| Reducer validation | `src/game/engine/reducer.ts`: active session, paired source IDs, source deduplication, bounded new level, actual delta, and derived modifier |
| Collapse action | `SECTOR_COLLAPSED`; ends the session, clears the encounter/effect, sets no winner, and moves to broadcast |
| Card effect schema | existing `advance_escalation` effect in `src/game/schema/card.schema.ts` |
| Public projection | TV and every phone receive `escalationLevel`, mode threshold, derived modifier, scenario collapse track, and public result deltas |
| Reconnect | value, event log, and `resolvedEscalationSourceEventIds` are serialized in the normal session state |
| Reset | new session initializes at 0; there is no per-round reset; round completion normally adds 1 once per round |

`feedEscalation` clamps the requested signed delta to `[0, collapseLevel]`, derives the actual delta, dispatches one `ESCALATION_ADVANCED`, runs eligible character reactions, then checks the resulting current level for collapse. `SECTOR_COLLAPSED` is terminal rather than a pending consequence: it ends the session immediately and does not reset escalation.

Existing gain/loss sources include round pressure, scenario ambient resolutions, selected board/gear effects, stabilization reductions, and character abilities. There is no flat modifier that changes a requested `+1` into `+2`, and `getEscalationModifier` modifies later test/battle difficulty rather than the size of escalation gains. The Cinder Monk's Bone Bell can react to the first positive escalation spike on the active turn by creating its own authoritative `-1` event before the final collapse check. Signal Witch records Choir Lash without changing the track. Grave Engineer's Cold Brace only responds to wound-driven escalation. Other named reductions resolve as their own events rather than modifying Gateblind's requested delta.

Primary coverage is in `src/game/engine/__tests__/threatRevisionsB2bShatteredBarricade.test.ts`, `src/game/engine/__tests__/engine.test.ts`, `src/server/__tests__/phaseThreeScenarioPressure.test.ts`, `src/server/__tests__/scenarioConfrontation.test.ts`, and the socket/API integration suites.

## 3. Exact threshold tables

“Modifier threshold” means a value at which `floor(level / 2)` increases. “Collapse value” means the mode cap that ends the active session when the post-reaction current value reaches it. Reaching the cap is sufficient; crossing it is impossible because the authoritative reducer clamps first.

### Multiplayer

| Current | Difficulty modifier | Existing system meaning | Gateblind request / result |
|---:|---:|---|---|
| 0 | +0 | ordinary | request 1; result 1 |
| 1 | +0 | ordinary | request 1; result 2, crossing modifier threshold to +1 |
| 2 | +1 | modifier threshold value | request 1; result 3 |
| 3 | +1 | ordinary | request 1; result 4, crossing modifier threshold to +2 |
| 4 | +2 | modifier threshold value | request 1; result 5 |
| 5 | +2 | one step from collapse | request 0; remain 5 |
| 6 | +3 | cap and collapse value | no legal active Threat resolution; no Gateblind request or second collapse |

### Single-player

| Current | Difficulty modifier | Existing system meaning | Gateblind request / result |
|---:|---:|---|---|
| 0 | +0 | ordinary | request 1; result 1 |
| 1 | +0 | ordinary | request 1; result 2, crossing modifier threshold to +1 |
| 2 | +1 | modifier threshold value | request 1; result 3 |
| 3 | +1 | ordinary | request 1; result 4, crossing modifier threshold to +2 |
| 4 | +2 | modifier threshold value | request 1; result 5 |
| 5 | +2 | ordinary | request 1; result 6, crossing modifier threshold to +3 |
| 6 | +3 | modifier threshold value | request 1; result 7 |
| 7 | +3 | one step from collapse | request 0; remain 7 |
| 8 | +4 | cap and collapse value | no legal active Threat resolution; no Gateblind request or second collapse |

One Gateblind increase is at most 1, so it can cross at most one modifier threshold. It cannot cross or reach the collapse value. The derived modifier is computed from the bounded result and applies to later authoritative tests and battles; it does not retroactively alter the Gateblind test that caused the gain.

## 4. Replacement option evaluation

| Option | Severity | Benefits | Risks / decision |
|---|---:|---|---|
| A — unconditional Global Escalation +1 | 4 near cap | simplest existing path; strong shared identity | rejected: duplicates Shattered's failure and lets a three-reference routine Threat directly end the session |
| B — conditional Global Escalation +1 | 3 | public, typed, mode-aware, raises later difficulty, cannot itself collapse | **selected** with pre-effect trigger `< collapseLevel - 1` |
| C — next escalation gain +1 / closer threshold | 3–4 | distinct timing | rejected: new shared pending modifier, delayed attribution, and volatile interaction with round/scenario gains |
| D — local anomaly consequence | 2–3 | owner-bounded | rejected: loses shared gate identity and risks duplicating Signal/test modifiers |
| E — player choice | 2–4 | avoidability | rejected: no equally credible, non-free personal alternative and unnecessary private lifecycle |
| F — remove without replacement | 1 | safest implementation | rejected: failure remains effectively empty; success progress does not create failure pressure |
| G — alternative shared pressure | 3–5 | could use scenario pressure | rejected: scenario tracks differ and a second shared-pressure coupling would duplicate or bypass scenario rules |

## 5. Distinctness from `shattered-barricade`

| Dimension | `gateblind-pulse` H7A | `shattered-barricade` current |
|---|---|---|
| Lane / region | Blue / inner | Red / outer |
| Type | hazard | hazard |
| Test | Signal 10 | Forge 7 |
| Frequency | three graph references, uncommon | one graph reference, common |
| Success | shared `gateblindPulsesRead +1` scenario progress | private clear-breach note |
| Failure trigger | final failed Signal test while pre-effect escalation is at least two below collapse | every final failed Forge test |
| Requested gain | conditional 1, otherwise 0 | unconditional 1 |
| Collapse ability | cannot reach collapse | can reach collapse and end the session |
| Persistence | shared escalation only when condition passes | shared escalation on every failure |
| Player choice | none | none |
| Runtime complexity | narrow authoritative trigger/source extension | existing dedicated sourced path |

This is a structural timing/threshold distinction, not renamed duplicate text. Gateblind is a difficulty ratchet with a terminal guard; Shattered is an unconditional breach event capable of collapse.

## 6. Resolution order, cap, collapse, and modifiers

1. Resolve the authoritative Signal test and establish final failure.
2. Read the server-owned pre-effect `escalationLevel` and mode collapse level.
3. If `escalationLevel < collapseLevel - 1`, set requested delta to 1; otherwise set it to 0.
4. No current flat gain modifier changes that request. Apply the existing bounded escalation calculation.
5. Dispatch at most one sourced `ESCALATION_ADVANCED` result with requested/actual/resulting data derived by the server; record the source even when the conditional request is 0.
6. Derive the difficulty modifier from the resulting level.
7. Run existing positive-spike character reactions once. A separately authored reduction may lower the final shared value.
8. Run existing threshold/collapse evaluation once. Gateblind's own bounded request cannot make the current value reach collapse.
9. Project the public result and resulting shared value.
10. Finalize the Threat and its unchanged success/reward lifecycle once.

At multiplayer 5 or solo 7, requested and actual Gateblind delta are 0. There is no overflow and no Wound, Scar, Salvage, movement, or scenario-pressure substitute. At cap, normal legal play has already ended; reconnect must reconstruct that ended session rather than resolve Gateblind. A malformed active-at-cap snapshot must not create a second sourced collapse.

Collapse does not prevent or reset the final value; the existing system normally applies the bounded escalation action first and then ends the session at the retained cap. This H7A rule never invokes that terminal branch. Reward or scenario-progress handling must not race a pending collapse because Gateblind cannot create one; ordinary Threat finalization still occurs once.

## 7. Scenario and mode impact

Global Escalation is universal session state. It is publicly presented beside every active scenario, adds its derived modifier to normal hazard checks, movement checks, battles, and scenario confrontation tests, and supplies the common terminal collapse track. Scenario ambient rules may independently add or reduce escalation. Gateblind does not change scenario preparation, confrontation progress, center access, victory, Loss Pressure, or any scenario-specific pressure track. Its success remains the existing `gateblindPulsesRead +1`; failure affects scenarios only through the existing Global Escalation difficulty projection.

| Table size | Severity | Calibration |
|---|---:|---|
| Solo | 3 | higher cap 8 and two extra safe values offset one operative carrying every encounter; Gateblind can reach 7 but not 8 |
| Two players | 3 | shared difficulty affects both; cap 6, but only levels 0–4 can trigger the card |
| Three players | 3 | more shared exposure and more tests affected, still one table-wide increment per card resolution |
| Four players | 3 | greatest number of downstream rolls affected; no per-player multiplication and no Gateblind collapse |

One consistent rule applies in all modes by deriving the guard from the canonical mode collapse level. Rivalry and ruthless modes do not select a target or redirect the increment.

## 8. Replay, reconnect, and presentation

Use a stable source event derived from the authoritative Gateblind failure resolution. One failure evaluates the conditional once, records one completed source result, and cannot repeat escalation, threshold handling, scenario progress, reward, or finalization through duplicate submission, socket delivery, reducer replay, two phones, stale action, projection, or reconnect. The `resolvedEscalationSourceEventIds` ledger and normal serialized session state survive reconnect.

Phone and TV show the same public outcome. When applied: `Global Escalation +1. Global Escalation is now <value>.` When guarded: `Global Escalation did not advance because it was already one step from collapse.` Existing shared threshold/modifier presentation remains authoritative. Do not expose source IDs, raw trigger expressions, internal modifier calculations, or a duplicate escalation banner.

## 9. Four critique seats

- **New player:** the failure clearly changes shared pressure, while “already one step from collapse” explains why no increase occurs at the visible boundary. The resulting value remains public.
- **Optimizer:** positioning cannot target the shared effect; approaching the boundary can make Gateblind's failure numerically free, but the table is already at maximum nonterminal pressure and gains no reward from failing. Bone Bell may negate the first spike through its existing once-per-round cost/trigger contract.
- **Family/casual:** one conditional check against the visible track resolves immediately. There is no choice, pending token, or nested collapse sequence.
- **Rules lawyer:** trigger uses pre-effect server state; request is exactly 1 or 0; no gain multiplier exists; cap precedes actual delta validation; derived difficulty modifier follows the result; positive-spike reactions retain current timing; Gateblind cannot reach collapse; one source ledger entry survives reconnect.

## 10. Approval block

### `gateblind-pulse`

- Current Heat behavior: failed Signal test authors `gain_heat 2`; compatibility runtime makes it a no-op.
- Original gameplay intent: public gate blindness that worsens shared expedition pressure.
- Selected retirement model: conditional Global Escalation +1 with a one-before-collapse guard.
- Trigger: final authoritative failure and pre-effect `escalationLevel < getEscalationCollapseLevel(sessionMode) - 1`.
- Requested Global Escalation: 1 when triggered; otherwise 0.
- Modifier order: no flat gain modifier; cap/actual result first, difficulty modifier derived from resulting level, then existing positive-spike character reactions.
- Cap behavior: existing cap remains 6 multiplayer / 8 solo; Gateblind stops at 5 / 7.
- Actual-delta behavior: actual +1 when triggered, otherwise 0; any later ability reduction is its own event.
- Threshold handling: may cross one difficulty-modifier threshold; process once through the existing shared lifecycle.
- Collapse handling: Gateblind cannot reach the collapse value and cannot create `SECTOR_COLLAPSED`.
- At-cap behavior: no legal active resolution exists; restore the terminal state and never create a second collapse or substitute penalty.
- Solo behavior: trigger at 0–6, stop at 7, cap 8.
- Multiplayer behavior: trigger at 0–4, stop at 5, cap 6; one shared increment regardless of player count.
- Scenario interaction: existing shared difficulty/collapse projection only; no direct scenario or Loss Pressure mutation.
- Reward/Trophy interaction: success progress unchanged; no Trophy or reward on failure; normal Threat finalization once.
- Duplicate-source protection: one authoritative failure source event recorded even when the guard yields 0.
- Reconnect behavior: shared value and completed source ledger reconstruct; no conditional re-evaluation after completion.
- Phone presentation: public applied/guarded result and resulting shared value; no client-supplied calculation.
- TV presentation: same public result using existing Global Escalation presentation; no duplicate banner.
- Typed runtime support: existing escalation action/reducer/projection plus a narrow Gateblind typed/source validation extension; no shared pending state.
- Final player-facing rule: “On failure, if Global Escalation is not already one step from collapse, advance Global Escalation by 1.”
- Severity: 3.
- Complexity: low player resolution / medium implementation authority.
- Balance risk: medium; three inner references can raise shared difficulty, bounded by no-collapse guard and no per-player multiplication.
- Distinctness from Shattered Barricade: conditional terminal guard, higher difficulty, inner Blue identity, three references, and success-side scenario progress versus Shattered's unconditional collapse-capable outer Red failure.
- Approval status: **APPROVED H7A — IMPLEMENTED H7B**.

## 11. Implementation prerequisites and focused tests

Classification: **Ready with narrow typed extension**.

Prerequisites:

1. Replace only `gateblind-pulse`'s legacy failure with an exact typed conditional escalation effect scoped to this stable ID.
2. Evaluate the pre-effect guard from server-owned mode and escalation state; the client supplies none of the requested/current/cap/result/source fields.
3. Extend the existing sourced escalation authority check so Gateblind accepts only its final failed Signal resolution and exact conditional 1-or-0 result.
4. Record the source as completed when guarded at multiplayer 5 or solo 7 without calling an unsourced zero-delta shortcut.
5. Reuse existing public projection, reconnect serialization, modifier derivation, character reaction, and finalization paths.
6. Add no new shared pending state, collapse rule, scenario branch, gain multiplier, or UI surface.

Focused tests must cover exact content identity and wording; success progress unchanged; multiplayer values 0–6; solo values 0–8; modifier crossings at 1→2, 3→4, and solo 5→6; guarded 5/7 results; no Gateblind collapse; Bone Bell and nonmatching ability interactions; wrong seat/source/result; duplicate/replay/reconnect; public TV/all-phone parity; no source ID leak; one Threat finalization; unchanged Shattered behavior; scenario pressure regression; and byte-pinned `marrow-tax-auditors` / `memory-tax-gate`.

## 12. Remaining blocked cards

- `marrow-tax-auditors`: floor-zero Salvage loss remains mechanically plausible, but four-reference economy starvation/frequency evidence is unresolved.
- `memory-tax-gate`: private player-choice ownership, competitive alternatives, projection, cancellation, reconnect, and reset remain unresolved.

Neither card is redesigned or reclassified in H7A. The +116-card expansion remains unapproved.

## 13. H7A verification

- `npm.cmd run validate:content` passed: 109 Threats and the existing 26 Red / 35 Blue / 48 Yellow distribution.
- `npm.cmd run typecheck` passed.
- Focused Shattered Barricade, escalation threshold, scenario-pressure, and scenario-confrontation tests passed: 4 files, 45 tests.
- `npm.cmd run test:engine` passed.
- `npm.cmd run test:integration` passed: 26 files, 226 tests.
- `npm.cmd run test` passed: 99 files, 1,070 tests. Existing test-fixture fallback-art warnings remained non-failing.
- Diff, scope, Threat-definition, blocked-card, and quarantined-audit checks are recorded at commit time.
