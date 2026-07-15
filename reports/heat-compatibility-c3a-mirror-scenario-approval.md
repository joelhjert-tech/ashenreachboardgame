# Heat Compatibility C3A: Mirror Scenario Approval

Date: 2026-07-15
Checkpoint: `23625ce feat: remove final board heat clauses`
Scope: report-only approval for `scenario_mirror_of_false_heroes`

## Decision

`scenario_mirror_of_false_heroes` is **APPROVED** to remove its conditional `gain_heat 1` confrontation effect without replacement.

The approved implementation changes only the confrontation plan's conditional effect to `null`. It does not add a Wound, Scar, Global Escalation, Mirror Pressure, preparation, confrontation-progress, loss-pressure, or temporary-modifier consequence. The existing confrontation copy, checks, gate, pressure cutoff, backlash note, progress, victory handling, center-tile rule, and scenario art remain unchanged.

This is ready as a content-only change and does not depend on the unfinished general scenario-state foundation. That foundation is still required to reconcile Mirror's broader authored/runtime contradictions, but those contradictions do not justify retaining or replacing an inert legacy Heat effect.

## Exact authored occurrence

| Field | Current evidence |
|---|---|
| Stable ID | `scenario_mirror_of_false_heroes` |
| Display name | The Mirror of False Heroes |
| Source | `src/game/data/scenarios.ts`, `buildConfrontationPlan` |
| Typed effect | `context.mirrorPressure >= 6 ? { type: "gain_heat", amount: 1 } : null` |
| Player-facing wording | No dedicated Heat sentence is present in `confrontationText` or `confrontationSteps`; the typed effect can only enter generic effect/result handling, which strips or no-ops Heat. |
| Trigger | Building the non-Nemesis `Face Yourself` confrontation plan while the plan context's `mirrorPressure` is at least 6. |
| Amount | One Heat for the acting confrontation seat. |
| Timing | Included in the confrontation's combined effect and applied with `SCENARIO_PROGRESS_ADVANCED` after the three checks, before victory finalization. |
| Affected player | The acting seat only. |
| Runtime handling | Authored and parsable, but generic Heat resolution is an exact compatibility no-op and projection stripping prevents a Heat result row. |
| Reachability | Not a reliable active pressure rule. Live confrontation admission first blocks shared Mirror Pressure at 6 in multiplayer and 8 in solo; plan construction separately supplies the acting operative's Scar count as `mirrorPressure`; a linked Nemesis plan supplies no scenario effect. The existing scenario review therefore correctly calls the clause unreachable in ordinary flow, while the mismatched counters make edge-state reachability unsuitable as a design contract. |
| Associated rule | High-pressure `Face Yourself` confrontation only; it is not setup, preparation, a side objective, a center unlock, victory, or the authored loss condition. |
| Authored/runtime mismatch | The sheet describes per-player Reflection and a shared pressure track; runtime stores shared `scenarioProgress.mirrorPressure`, sometimes falls back to Scars, but builds the plan from the acting operative's Scar count. The Heat leaf is inert regardless of which value selected it. |

## Complete scenario map

This map records the current scenario rather than approving repairs outside the Heat leaf.

| Scenario surface | Authored contract | Runtime status | C3A boundary |
|---|---|---|---|
| Setup | Each player begins with 0 Reflection. | **Descriptive only.** No authoritative per-player Reflection resource is surfaced. | Unchanged. |
| Global pressure rule | Forbidden power, Artifact charges, selfish rewards, and Scars feed Reflection/Mirror Pressure. | **Partially implemented.** Contract completion and any gained Gear raise shared `mirrorPressure`; Scars are a fallback/proxy rather than one consistent source. | Unchanged. |
| Pressure track | Mirror Pressure 0-8; Blue difficulty at 5+; False Hero at 8. | **Partially implemented / ambiguous.** Shared pressure persists and projects, but the live confrontation cutoff is 6 multiplayer / 8 solo and the authored False Hero-at-8 promise is not the same runtime consequence. | Unchanged. |
| Preparation resources | Mirror Break setup and public pressure control should prepare the finale. | **Missing dedicated foundation.** Mirror has no scenario-specific preparation resource in `scenarioPreparation`. | Unchanged; no replacement is routed into preparation. |
| Side objectives | Contracts, breachborn defeats, and `middle_webglassFracture` advance the scenario objective. | **Implemented but architecturally incorrect.** These triggers advance `mirrorBreaks`; reaching the threshold invokes `SCENARIO_OBJECTIVE_COMPLETED` and can end the scenario outside the center. | Explicitly not endorsed or changed by C3A. |
| Center unlock | Hold an Artifact, complete 2 Contracts, or carry no Scars. | **Implemented.** Server gate validation applies before confrontation. | Unchanged. |
| Center location | Final confrontation occurs at the Cinder Gate. | **Implemented.** `canResolveScenarioConfrontation` requires the canonical scenario confrontation sector. | Unchanged. |
| Confrontation admission | High Mirror Pressure blocks the attempt. | **Implemented with mode scaling.** Cutoff is 6 multiplayer and 8 solo; reaching it ends the attempt without declaring scenario loss. | Unchanged. |
| Confrontation checks | Guile, Signal, and Grit checks; pressure raises difficulty. | **Implemented with mismatch.** The scenario plan uses the acting operative's Scars as its pressure context, while admission uses shared Mirror Pressure when present. | Unchanged. |
| Confrontation backlash | Failed checks raise reflection pressure; linked Nemesis failures cause Wounds. | **Partially implemented.** Non-Nemesis failure adds a note result; linked Nemesis failure uses the normal Wound effect path. | Unchanged. |
| Legacy Heat leaf | Gain 1 Heat at plan pressure 6+. | **Authored but mechanically inert; ordinary-flow reachability is blocked/mismatched.** | Approved for removal without replacement. |
| Confrontation progress | Successful checks add `mirrorBreaks`. | **Implemented.** Runtime victory threshold is 2, despite another authored field saying 4. | Unchanged. |
| Victory | Pass at least 2 of 3 checks at the finale. | **Implemented through `SCENARIO_VICTORY_ACHIEVED`, but side-objective completion can also end the scenario through a separate path.** | Heat removal cannot create progress or victory. |
| Loss | Escalation loss or Reflection collapse defeats the table. | **Partially implemented / mismatched.** Global Escalation collapse exists; Mirror cutoff blocks an attempt rather than recording scenario defeat. | Heat removal cannot create loss. |
| Rewards | Four scenario reward definitions. | **Primarily authored/catalog presentation; no C3A reward change.** | Unchanged. |
| Scenario-specific content | False Hero/Nemesis and reflection hooks. | **Partial.** Linked Nemesis support exists; the sheet's threshold spawn contract is not aligned with runtime. | Unchanged. |

## Architecture isolation

### Preparation

Removal changes no preparation resource, objective, source event, or gate. It neither grants nor removes preparation and cannot convert ordinary play into confrontation progress.

### Confrontation

The existing center-only confrontation request, three checks, failure processing, and `mirrorBreaks` update remain authoritative. The removed effect does not become a new confrontation consequence. Existing problems in pressure-source selection and side-objective progress remain separately blocked scenario-foundation work.

### Victory and loss

The retirement cannot call `SCENARIO_VICTORY_ACHIEVED`, `SCENARIO_OBJECTIVE_COMPLETED`, a defeat action, or any threshold action. It cannot unlock the center, start a confrontation, advance `mirrorBreaks`, end the scenario, or modify Global Escalation. Victory/loss ownership remains exactly as it is before implementation.

### Center tile and art

The canonical finale sector remains `center_cinder_gate`. Scenario selection continues to resolve `/assets/scenarios/mirror-of-false-heroes.png` as the center's image layer. No sector ID, connection, topology rule, entry requirement, relocation, or art mapping changes.

## Original intent

The Heat leaf most plausibly represented **personal mirror corruption at high confrontation pressure**. It was not authored as preparation, shared escalation, or direct injury. Because the current game already expresses this identity through Mirror Pressure, pressure-scaled tests, admission cutoff, failure backlash, Scars, and the linked Nemesis, the Heat leaf is obsolete bookkeeping rather than a missing necessary gate.

## Retirement-option evaluation

| Option | Severity | Runtime readiness | Decision |
|---|---:|---|---|
| A. Remove without replacement | 0 additional; scenario remains approximately 3 because existing pressure and finale checks remain | Ready with existing content schema | **Selected.** Removes an inert, counter-mismatched leaf without changing current gameplay. |
| B. One preventable Wound | 2-3 personal, potentially 4 near recall | Ready with Wound pipeline | Rejected. It would turn a no-op into new harm and overlap existing Nemesis/failure Wound pressure. |
| C. Conditional Wound | 2-4 depending on trigger | Ready only after selecting a trustworthy pressure source | Rejected. Shared pressure versus Scar-context mismatch makes the trigger unresolved; no prior approval exists. |
| D. Global Escalation +1 | 2-4 shared, mode/threshold dependent | Existing lifecycle available | Rejected. It duplicates shared pressure, can approach collapse, and changes every player's game. |
| E. Preparation loss | Unknown | Requires a Mirror preparation resource/foundation | Blocked as an alternative. No authoritative Mirror preparation resource exists. |
| F. Scenario loss pressure | 3-5 | Requires scenario-foundation alignment | Blocked as an alternative. The current cutoff is not a typed loss outcome and a new counter is out of scope. |
| G. Temporary mirror modifier | 2-3 | Would require an exact scenario modifier contract | Rejected. The three checks already scale with pressure; another modifier duplicates that pressure. |
| H. Persistent scenario effect | 3-5, table-wide | Requires persistence/removal/projection design | Rejected. Disproportionate and unresolved. |
| I. Lore-only rewrite | 0 | Content-only | Unnecessary. No dedicated player-facing Heat sentence needs conversion; existing mirror-corruption lore is already resource-neutral. |

## Mode and severity assessment

| Context | Effect of selected retirement |
|---|---|
| Solo | Removes an inert leaf that could be selected by an acting operative with 6+ Scars while shared pressure remains below the solo cutoff of 8. No new harm or relief from an active mechanic occurs. |
| Two to four players | Removes an inert leaf. The shared cutoff of 6 normally blocks confrontation before a shared-pressure-triggered high-pressure attempt; counter mismatch remains separately documented. |
| Early game | No effect; the clause is high-pressure confrontation-only. |
| Final approach | Gate, pressure cutoff, and center access stay exact. |
| Confrontation | Checks, difficulty, backlash, progress, and victory stay exact. |

Selected-retirement severity is **1 (clarity-only)**. The scenario itself remains **severity 3** because existing shared pressure, gate requirements, pressure-scaled checks, confrontation denial, Nemesis Wounds, and global escalation loss remain. Complexity decreases by one inert conditional leaf. Balance risk is **low** for the retirement and remains **high** for the broader unresolved scenario contract.

## Four critique seats

### New player

Removing the hidden Heat leaf leaves one fewer unexplained legacy consequence. Mirror Pressure and Scars remain distinct visible concepts, and the center-tile objective does not change.

### Optimizer

There is no new benefit to farm: the removed effect already changed no state. Pressure farming, objective bypass, and gate behavior remain exactly as before and remain separate scenario-design risks.

### Family/casual player

Resolution becomes conceptually shorter without adding tracking. No additional Wound, modifier, or group-pressure bookkeeping appears.

### Rules lawyer

The exact removal is unconditional `effect: null` in the Mirror scenario plan. It changes no trigger, owner, counter, gate, progress, result, reset, or reconnect state. Existing counter mismatches and non-center objective completion are expressly not approved by this pass.

## Approval block

### `scenario_mirror_of_false_heroes`

- Current authored Heat rule: In `buildConfrontationPlan`, when the supplied `mirrorPressure` is 6 or more, include `{ type: "gain_heat", amount: 1 }`.
- Runtime status: Authored and parsable; mechanically inert through the compatibility no-op and stripped from client projection. Ordinary shared-pressure flow blocks multiplayer confrontation at 6, while plan construction uses acting-seat Scars, so the condition is also counter-mismatched.
- Original gameplay intent: Personal mirror-corruption pressure during a high-pressure final confrontation.
- Selected retirement model: Remove without replacement.
- Trigger: No replacement trigger. Existing confrontation admission and resolution triggers remain unchanged.
- Affected players: None from the retired clause; the acting seat remains owner of the existing confrontation action.
- Preparation interaction: None.
- Confrontation interaction: Removes only the inert effect leaf; checks, backlash, progress, and finalization are unchanged.
- Victory interaction: None; cannot advance progress or declare victory.
- Loss interaction: None; cannot cause scenario defeat or Global Escalation collapse.
- Wound handling: No Wound is requested. Existing Nemesis and other scenario Wounds remain unchanged.
- Scar interaction: No Scar is granted and no Heat value maps to a Scar. Existing Wound-to-recall-to-Scar behavior remains unchanged.
- Global Escalation interaction: None.
- Temporary modifier interaction: None.
- Persistence: None introduced.
- Reset/cleanup: No new state; current scenario/session reset behavior remains unchanged.
- Source-event protection: No new consequence or source event. Existing confrontation intent/phase/progress handling remains authoritative.
- Reconnect behavior: Reprojects the existing scenario state; no removed Heat consequence can be reconstructed.
- Center-tile behavior: `center_cinder_gate` remains the required confrontation sector; gate and topology are unchanged.
- Scenario-art behavior: Existing Mirror sheet-art mapping remains presentation-only and unchanged.
- Phone presentation: Existing Mirror Pressure, gate, checks, and public-safe results only; no Heat row.
- TV presentation: Existing center marker, Mirror aura/pressure, art, and public results only; no Heat row.
- Typed runtime support: Ready with existing content schema; set the confrontation plan effect to `null`. No runtime extension and no scenario foundation prerequisite.
- Final player-facing rule: `At the breach mirror, resolve guile, signal, and grit checks in order. Each win records one mirror break. At two mirror breaks, you win.`
- Solo severity: 1 for the retirement; no active delta.
- Multiplayer severity: 1 for the retirement; no active delta.
- Complexity: Low.
- Balance risk: Low for this removal; broader Mirror alignment risk remains high and out of scope.
- Approval status: **APPROVED**.

## Implementation readiness

Classification: **Ready with existing content schema**.

Exact implementation prerequisite:

1. In `src/game/data/scenarios.ts`, change only `scenario_mirror_of_false_heroes.buildConfrontationPlan(...).effect` from the conditional `gain_heat 1` expression to `null`.
2. Update the exact authored-Heat manifest/approval guard so the scenario is no longer an active exception.
3. Add focused tests proving the plan effect is `null` below and above 6, all three checks and their ordering remain exact, the gate and mode cutoffs remain exact, progress/victory/loss are unchanged, no Heat result projects, and the remaining six authored IDs are hash-pinned.
4. Recount authored Heat from 7 to 6 occurrences across 6 IDs.

The broader Mirror preparation/confrontation foundation must **not** land in the same implementation. Recommended commit subject: `feat: retire mirror scenario heat effect`.

## Remaining authored Heat IDs

| Stable ID | Existing unresolved category |
|---|---|
| `escalation-blackstar-hunger` | Escalation effect reconciliation; avoid duplicating its authored `escalationDelta`. |
| `escalation-choir-feedback` | Escalation effect reconciliation; avoid duplicating its authored `escalationDelta`. |
| `escalation-marrow-surgery-debt` | Personal-versus-shared escalation ownership and existing delta reconciliation. |
| `escalation-saltwind-lockdown` | Escalation effect reconciliation; avoid duplicating its authored `escalationDelta`. |
| `crownless-advocate` | Follower benefit/loss-trigger redesign with owner privacy and exact departure lifecycle. |
| `saltflat-bone-reader` | Follower benefit/loss-trigger redesign with owner privacy and exact departure lifecycle. |

No rule for these six IDs is approved here.

## Verification plan for implementation

- Content: exact stable ID, confrontation copy/checks/gate/rewards/art unchanged; effect is always `null`.
- Scenario architecture: preparation cannot become confrontation progress; center-only confrontation and canonical victory remain unchanged.
- Pressure: multiplayer cutoff 6 and solo cutoff 8 unchanged; no Global Escalation replacement.
- Injury: no Wound or Scar replacement; normal current lifecycles unchanged.
- Projection: phone and TV remain Heat-free.
- Replay/reconnect: no effect leaf returns from restored current state; legacy compatibility metadata stays inert.
- Regression: six out-of-scope authored IDs unchanged; board-authored Heat remains zero; all 17 retired Threats and Threat totals remain unchanged.

## C3A report-only verification

Passed on 2026-07-15:

- `npm.cmd run validate:content` — 17 characters, 71 gear, 109 Threats, 36 Contracts, 20 anomalies, 30 Artifacts, 24 followers, 15 Scars, 16 escalations, and 30 afflictions validated.
- `npm.cmd run typecheck`.
- Scenario-focused Vitest run — 43 tests across `scenarioConfrontation`, `scenarioAmbient`, and `scenarioSheetArt` passed.
- Heat-containment/projection Vitest run — 11 tests across the C1 containment and server projection guards passed.
- `npm.cmd run test:engine`.
- `npm.cmd run test:integration` — 27 files / 233 tests passed, including `reconnectFlapping.integration.test.tsx` without a retry.
- `npm.cmd run test:client` — 26 files / 258 tests passed. Existing missing-art fallback diagnostics appeared on stderr; the suite passed and C3A changed no assets.
- `git diff --check`.

The diff contains only this report and the three required planning-report updates. `src/game/data/scenarios.ts`, the six out-of-scope authored Heat IDs, compatibility code, tests, projections, UI, schemas, validation, assets, and all gameplay files remain unchanged. The two quarantined audit reports remain untracked and hash-unchanged.

No gameplay, content definition, schema, validation, UI, asset, test, or projection changes were made in C3A.
