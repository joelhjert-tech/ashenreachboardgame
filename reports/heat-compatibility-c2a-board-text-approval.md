# Heat Compatibility Phase C2A board-text approval

Date: 2026-07-15

Checkpoint: `80d35fe test: enforce heat compatibility boundary`

Scope: report-only approval for the 19 board-text stable IDs manifest-pinned by C1. No authored definition, gameplay, schema, validation, UI, test, or asset changes are part of C2A.

## Decision

The sealed ledger resolves to exactly **19 unique board-text stable IDs containing 32 typed Heat effects**: 24 `gain_heat 1` occurrences and 8 `lose_heat 1` occurrences. Every one is approved for **removal without replacement**.

This is proportionate because the generic Heat resolver is already an inert compatibility no-op. Removing these clauses aligns authored data with the gameplay players already receive. Each location remains complete through an existing heal, note, follower, local-deck draw, test failure, Wound, Scar, or route-clearance gate. C2A does not approve a new Wound, Scar, Salvage, movement, modifier, or escalation consequence.

The board/location prose contains no active capital-`Heat` resource instruction. Phrases such as furnace wind, burning rows, or a signal running hot are ordinary environmental lore and may remain. Five summaries require narrow clarification during implementation: `outer_emberSanctumRest`, `outer_glassmereChorus`, `outer_surgeryTreatment`, `inner_cinderLatticeTrial`, and `inner_gateOfCindersTrial`. Four remove a false status/Scar implication; Glassmere replaces an ambiguous hot-line phrase with “unstable.” No unrelated lore rewrite is approved.

## Canonical 19-ID ledger

All definitions are in `src/game/data/boardTextEffects.ts`. Runtime handling is identical: `resolveSpaceTextIntent()` resolves the authoritative test and local deck, while `gain_heat`/`lose_heat` reach `applyLegacyHeatNoop()` and change no state. A space action advances to broadcast and cannot be submitted twice in the same action window; revisiting a location may make its text available again under ordinary clear-sector rules.

| Stable ID | Display/location name(s) | Ring/region | Current rule and exact Heat clause | Trigger | Runtime status | Identity / closest overlap | C2A decision |
|---|---|---|---|---|---|---|---|
| `outer_emberSanctumRest` | Pilgrim Rest — Pilgrim Lock Gate | outer | Heal 1 Wound, then `lose_heat 1` | successful space-text resolution; no test | heal active; Heat inert | recovery shrine / other healing services | remove Heat; clean Scar-pressure wording |
| `outer_ashwakeClearLane` | Hold the Bridge — Ashwalk Bridge; Scorched Passage — Scorched Road | outer + middle reuse | Guile 6; success route note; failure `gain_heat 1` | failed test | test/note active; Heat inert | traversal hazard / route-note actions | remove Heat; failure withholds note |
| `outer_glassmereChorus` | Signal Chorus — Glass Signal Pier; Cold Dock Signal — Coldwind Wharf; Flooded Lockwork — Flooded Locks | outer | Signal 7; success `lose_heat 1` + relay note; failure `gain_heat 1`; local Anomaly | success/failure | test, note, Anomaly active; Heat inert | anomaly tuning / signal tests | remove both Heat clauses |
| `outer_mirecoilTraffic` | Transit Traffic — Rusted Transit Gate; Gate Dispatch — Transit Gate | outer | Signal 8; success contract-lead note; failure `gain_heat 1`; local Contract | failed test | test, note, Contract active; Heat inert | contract lead / transit route | remove Heat; failure withholds note |
| `outer_waymarketExchange` | Market Exchange — Anchor Market; Foundry Repair — Kettleward Foundry | outer | Guile 6; success `lose_heat 1` + favor note; failure `gain_heat 1`; local Contract | success/failure | test, note, Contract active; Heat inert | bargain/service / contract lead | remove both Heat clauses |
| `outer_relayCrew` | Lantern Watch — Lantern Post 47; Bastion Watch — North Dock Bastion; Sunken Signal — Sunken Pier | outer | Command 6; success follower + route note; failure `gain_heat 1`; local Contract | failed test | test, follower, note, Contract active; Heat inert | support contact / follower recruitment | remove Heat; failure withholds reward |
| `outer_saltCrossing` | Vent Harvest — Mire Vent Colony; Recharge the Votive — Votive Engine Room; Deadwater Reading — Deadwater Marsh | outer | Forge 7; success `lose_heat 1` + void-salt note; failure existing `take_wound 1`; local Anomaly | successful test | note, Wound, Anomaly active; Heat inert | anomaly harvest / hazardous resource recovery | remove Heat only |
| `outer_surgeryTreatment` | Rough Treatment — Old Mercy Bay | outer | Forge 7; success heal 1 Wound + `gain_heat 1` + follower + note; failure existing `take_wound 1`; local Artifact | successful test | heal, follower, note, Wound, Artifact active; Heat inert | risky recovery service | remove Heat; clean “marked” implication |
| `outer_oathpostWrit` | Census Writ — Broken Census Hall | outer | Command 7; success faction-writ note; failure `gain_heat 1`; local Contract | failed test | test, note, Contract active; Heat inert | contract service / faction writ | remove Heat; failure withholds writ |
| `outer_brokenCausewayShortcut` | Wreckage Sweep — Dock Nine Wreckage; Causeway Thread — Shattered Causeway | outer | Grit 8; success shortcut note; failure `gain_heat 1` then existing `take_wound 1`; local Escalation | failed test | test, note, Wound, Escalation active; Heat inert | traversal hazard / dangerous shortcut | remove Heat; retain existing Wound |
| `middle_scarSurgery` | Machine Hymn — Sable Machine Choir | middle | Forge 9; success heal 1 Wound + `gain_heat 1` + note; failure existing direct `gain_scar scar-wound-1`; local Escalation | successful test | heal, note, Scar, Escalation active; Heat inert | severe risk-service / surgery | remove Heat only; existing Scar unchanged |
| `middle_redMarchBargain` | Bastion Bargain — Choir Bastion; Dangerous Ammunition — Weeping Ammunition Shrine; Den Challenge — Reaver’s Den | middle | Command 9; success follower + military-favor note; failure `gain_heat 1`; local Contract | failed test | test, follower, note, Contract active; Heat inert | military bargain / follower recruitment | remove Heat; failure withholds reward |
| `inner_blackstarShortcut` | Dead Star Claim — Dead Star Reliquary | inner | Guile 11; success route note + `gain_heat 1`; failure existing `take_wound 1`; local Artifact | successful test | test, note, Wound, Artifact active; Heat inert | high-risk Artifact route | remove Heat only |
| `middle_shardSprawlBargain` | Yard Bargain — Chain-Maul Yard; Archive Contract — Salt Archive; Blastworks Toll — Blastworks | middle | choose Command 8 stock or Guile 8 gossip; stock success `lose_heat 1`; both failures `gain_heat 1`; success notes | choice success/failure | choice, tests, notes active; Heat inert | risk/reward bargain / fixed two-stat choice | remove all three Heat clauses |
| `middle_guardianSpanThreshold` | Customs Threshold — Customs Gate | middle | choose Command 9 seal or Signal 9 marker; both failures `gain_heat 1`; success grants `guardian-span-clearance` | failed choice test | choice, test, entry-note gate active; Heat inert | inner-route gate / movement requirement | remove both Heat clauses; failed test still withholds clearance |
| `middle_webglassFracture` | Rail Fracture — Grave-Rail Junction | middle | choose Guile 9 lane or Signal 9 splice; lane success `lose_heat 1`; both failures `gain_heat 1`; success notes | choice success/failure | choice, tests, notes active; Heat inert | route mapping / fixed two-stat choice | remove all three Heat clauses |
| `inner_veilRiftEntry` | Three-Ash Entry — Melted Gate | inner | choose Signal 10 anchor or Guile 10 fold; anchor success `lose_heat 1`; both failures `gain_heat 1`; success notes | choice success/failure | choice, tests, notes and prior clearance gate active; Heat inert | inner traversal gate / route mapping | remove all three Heat clauses |
| `inner_cinderLatticeTrial` | Observatory Trial — Crownless Observatory | inner | choose Signal 10 trace or Guile 10 angles; angles success `lose_heat 1`; both failures `gain_heat 1`; success notes | choice success/failure | choice, tests, notes active; Heat inert | final-approach preparation / anomaly test | remove all three Heat clauses; clean false Scar implication |
| `inner_gateOfCindersTrial` | Last Signal — Last Signal Well | inner | choose Grit, Signal, or Guile 12; all failures `gain_heat 1`; success grants `gate-of-cinders-breached` | failed choice test | choice, tests, center-entry note gate active; Heat inert | final route gate / scenario approach | remove all three Heat clauses; failure still blocks core entry |

Count proof: 19 unique IDs, 32 Heat occurrences. The removal plan’s 19-ID scope matches canonical imports exactly; there is no scope mismatch.

## Shared retirement invariants

- Selected model: remove the typed Heat leaf only; preserve sequence order of every remaining effect.
- No new consequence, choice, payment, movement, modifier, persistence, or pending state.
- Existing `take_wound`, `gain_scar`, local-deck, note, follower, and gate behavior is unchanged and is not re-approved or redesigned by C2A.
- No Heat amount maps to a Wound or Scar amount.
- Existing board-text authority remains server-side; client input remains limited to an existing server-authored choice ID.
- Existing phase transition, event-log, reconnect reconstruction, and duplicate-intent rejection remain unchanged.
- Revisit frequency remains unchanged. No new farming reward or recurrence mechanism is introduced.
- Inner gate notes remain preparation/legality state only. They do not advance confrontation progress, declare victory, or bypass the center confrontation.

## Approval blocks

### `outer_emberSanctumRest`

- Current authored Heat rule: after healing 1 Wound, `lose_heat 1`.
- Runtime status: heal enforced; Heat inert; repeatable only when the location text is legally resolved again.
- Original gameplay intent: safe-haven recovery and obsolete pressure relief.
- Selected retirement model: remove without replacement; rewrite the summary to remove the unimplemented Scar-pressure implication.
- Location type: recovery shrine. Trigger: clear-space action; no test. Test/stat: none. Difficulty: none.
- Success: heal 1 Wound. Failure: none.
- Wound handling: existing `heal_wound 1`; no new Wound request. Scar interaction: none. Salvage/movement/escalation interaction: none.
- Persistence / reset: none. Multiplayer: affected operative only.
- Source-event protection / reconnect: existing space-text action, phase transition, event log, and state reconstruction; no new consequence to replay.
- Runtime support: ready with existing content schema.
- Consequence boundaries — Wound handling: preserve the surviving authored Wound effect only. Scar interaction: no new Scar or Heat conversion. Salvage interaction: none added. Movement interaction: none added. Escalation interaction: none added.
- Lifecycle boundaries — Persistence: surviving authored state only. Reset/cleanup: unchanged. Multiplayer behavior: existing acting-owner scope. Source-event protection: existing `SPACE_TEXT_RESOLVED` lifecycle. Reconnect behavior: existing state reconstruction; no new pending state.
- Final player-facing rule: `Heal 1 Wound.`
- Lore text retained: Pilgrim Lock Gate lore unchanged.
- Severity: 1. Complexity: 1. Balance risk: low; matches current runtime.
- Approval status: **APPROVED**.

### `outer_ashwakeClearLane`

- Current authored Heat rule: failure `gain_heat 1`.
- Runtime status: Guile test and success note active; Heat inert.
- Original gameplay intent: traversal danger; failure denies route information.
- Selected retirement model: remove without replacement. Location type: traversal hazard.
- Trigger: resolve clear location. Test/stat: Guile. Difficulty: 6.
- Success: record the convoy-lane route note. Failure: no note and no additional consequence.
- Wound/Scar/Salvage/movement/escalation interaction: none; the note does not move the operative.
- Persistence / reset: private note persists normally; no penalty state. Multiplayer: owner only.
- Source-event protection / reconnect: existing authoritative roll and completed space-text event.
- Runtime support: ready with existing content schema.
- Consequence boundaries — Wound handling: none added. Scar interaction: none added. Salvage interaction: none added. Movement interaction: none added. Escalation interaction: none added.
- Lifecycle boundaries — Persistence: success note only. Reset/cleanup: unchanged. Multiplayer behavior: existing acting-owner scope. Source-event protection: existing `SPACE_TEXT_RESOLVED` lifecycle. Reconnect behavior: existing state reconstruction; no new pending state.
- Final player-facing rule: `Test Guile 6. On success, record “Ashwake crossing cleared. The convoy lane is charted.” On failure, no additional effect.`
- Lore text retained: furnace wind and ash-gale descriptions remain environmental lore.
- Severity: 1. Complexity: 1. Balance risk: low.
- Approval status: **APPROVED**.

### `outer_glassmereChorus`

- Current authored Heat rule: success `lose_heat 1`; failure `gain_heat 1`.
- Runtime status: Signal test, local Anomaly resolution, and success note active; Heat inert.
- Original gameplay intent: anomaly interference and signal tuning.
- Selected retirement model: remove both Heat effects without replacement. Location type: anomaly/crossroads.
- Trigger: resolve clear location. Test/stat: Signal. Difficulty: 7.
- Success: retain stable-relay note. Failure: no additional personal consequence; local Anomaly resolution remains.
- Wound/Scar/Salvage/movement/escalation interaction: none added. Persistence: note only. Reset: none.
- Multiplayer: acting operative resolves the test; public local deck behavior unchanged.
- Source-event protection / reconnect: existing space-text/local-deck event and phase completion.
- Runtime support: ready with existing content schema.
- Consequence boundaries — Wound handling: none added. Scar interaction: none added. Salvage interaction: none added. Movement interaction: none added. Escalation interaction: none beyond surviving local-deck behavior.
- Lifecycle boundaries — Persistence: success note/local deck only. Reset/cleanup: unchanged. Multiplayer behavior: existing acting-owner scope. Source-event protection: existing `SPACE_TEXT_RESOLVED` lifecycle. Reconnect behavior: existing state reconstruction; no new pending state.
- Final player-facing rule: `Resolve the local Anomaly and test Signal 7. On success, record the stable-relay note. On failure, no additional effect.`
- Lore text retained: cold signal and humming-line imagery; failure summary should say the relay line is unstable rather than imply a status cost.
- Severity: 2. Complexity: 1. Balance risk: low.
- Approval status: **APPROVED**.

### `outer_mirecoilTraffic`

- Current authored Heat rule: failure `gain_heat 1`.
- Runtime status: Signal test, local Contract discovery, and success note active; Heat inert.
- Original gameplay intent: contract-lead acquisition under signal interference.
- Selected retirement model: remove without replacement. Location type: contract/transit service.
- Trigger: resolve clear location. Test/stat: Signal. Difficulty: 8.
- Success: contract-lead note. Failure: no note; no additional consequence. Local Contract resolution unchanged.
- Wound/Scar/Salvage/movement/escalation interaction: none added. Persistence: note/Contract only.
- Multiplayer: acting operative; discovered Contracts follow current shared catalog rules.
- Source-event protection / reconnect: existing roll, consumed local-deck card, event log, and broadcast phase.
- Runtime support: ready with existing content schema.
- Consequence boundaries — Wound handling: none added. Scar interaction: none added. Salvage interaction: none added. Movement interaction: none added. Escalation interaction: none added.
- Lifecycle boundaries — Persistence: note/Contract only. Reset/cleanup: unchanged. Multiplayer behavior: existing acting-owner scope. Source-event protection: existing `SPACE_TEXT_RESOLVED` lifecycle. Reconnect behavior: existing state reconstruction; no new pending state.
- Final player-facing rule: `Resolve the local Contract lead and test Signal 8. On success, record the Mirecoil contract-lead note. On failure, no additional effect.`
- Lore text retained: static/noise wording unchanged.
- Severity: 1. Complexity: 1. Balance risk: low.
- Approval status: **APPROVED**.

### `outer_waymarketExchange`

- Current authored Heat rule: success `lose_heat 1`; failure `gain_heat 1`.
- Runtime status: Guile test, local Contract, and success favor note active; Heat inert.
- Original gameplay intent: bargain/service reward.
- Selected retirement model: remove both effects without replacement. Location type: bargain/service.
- Trigger: resolve clear location. Test/stat: Guile. Difficulty: 6.
- Success: retain favor note. Failure: no favor and no additional consequence. Local Contract unchanged.
- Wound/Scar/Salvage/movement/escalation interaction: none added; this is not a payment or shop transaction.
- Persistence: note/Contract only. Reset: none. Multiplayer: acting operative.
- Source-event protection / reconnect: existing roll/deck/event path.
- Runtime support: ready with existing content schema.
- Consequence boundaries — Wound handling: none added. Scar interaction: none added. Salvage interaction: none added; this is not a payment or shop transaction. Movement interaction: none added. Escalation interaction: none added.
- Lifecycle boundaries — Persistence: note/Contract only. Reset/cleanup: unchanged. Multiplayer behavior: existing acting-owner scope. Source-event protection: existing `SPACE_TEXT_RESOLVED` lifecycle. Reconnect behavior: existing state reconstruction; no new pending state.
- Final player-facing rule: `Resolve the local Contract lead and test Guile 6. On success, record the Waymarket favor. On failure, no additional effect.`
- Lore text retained: market lore and existing Scar reference remain descriptive, not a Scar grant.
- Severity: 1. Complexity: 1. Balance risk: low; existing cross-location presentation mismatch is outside C2A.
- Approval status: **APPROVED**.

### `outer_relayCrew`

- Current authored Heat rule: failure `gain_heat 1`.
- Runtime status: Command test, follower, note, and local Contract active; Heat inert.
- Original gameplay intent: recruit support after stabilizing a route.
- Selected retirement model: remove without replacement. Location type: support-contact action.
- Trigger: resolve clear location. Test/stat: Command. Difficulty: 6.
- Success: gain `grave-scribe` and route-crew note. Failure: no follower/note and no additional consequence.
- Wound/Scar/Salvage/movement/escalation interaction: none added. Persistence: existing follower and note.
- Multiplayer: acting operative owns private rewards.
- Source-event protection / reconnect: existing roll, acquisition, local-deck, and event-log handling.
- Runtime support: ready with existing content schema.
- Consequence boundaries — Wound handling: none added. Scar interaction: none added. Salvage interaction: none added. Movement interaction: none added. Escalation interaction: none added.
- Lifecycle boundaries — Persistence: follower/note/Contract only. Reset/cleanup: unchanged. Multiplayer behavior: existing acting-owner scope. Source-event protection: existing `SPACE_TEXT_RESOLVED` lifecycle. Reconnect behavior: existing state reconstruction; no new pending state.
- Final player-facing rule: `Resolve the local Contract lead and test Command 6. On success, gain Grave Scribe and record the route-crew note. On failure, no additional effect.`
- Lore text retained: relay instability is descriptive.
- Severity: 1. Complexity: 1. Balance risk: low.
- Approval status: **APPROVED**.

### `outer_saltCrossing`

- Current authored Heat rule: success `lose_heat 1`.
- Runtime status: Forge test, note, local Anomaly, and existing failure Wound active; Heat inert.
- Original gameplay intent: hazardous anomaly harvest.
- Selected retirement model: remove Heat without replacement. Location type: anomaly/hazard/salvage.
- Trigger: resolve clear location. Test/stat: Forge. Difficulty: 7.
- Success: retain void-salt note. Failure: existing `take_wound 1` only.
- Wound handling: pre-existing effect unchanged; C2A adds no Wound and does not alter its prevention semantics. Scar interaction: only whatever existing Wound rules already provide; no direct Scar.
- Salvage/movement/escalation interaction: none added; the note is not a transaction.
- Persistence: note only. Reset: none. Multiplayer: acting operative.
- Source-event protection / reconnect: existing space-text Wound/event path.
- Runtime support: ready with existing content schema.
- Consequence boundaries — Wound handling: preserve the existing failure Wound only. Scar interaction: no direct Scar or Heat conversion. Salvage interaction: none added. Movement interaction: none added. Escalation interaction: none beyond surviving local-deck behavior.
- Lifecycle boundaries — Persistence: note/local deck and existing Wound state only. Reset/cleanup: unchanged. Multiplayer behavior: existing acting-owner scope. Source-event protection: existing `SPACE_TEXT_RESOLVED` lifecycle. Reconnect behavior: existing state reconstruction; no new pending state.
- Final player-facing rule: `Resolve the local Anomaly and test Forge 7. On success, record the void-salt note. On failure, suffer 1 Wound.`
- Lore text retained: toxic vent and salt-bloom language unchanged.
- Severity: 2. Complexity: 1. Balance risk: low for Heat removal; existing Wound pipeline is not redesigned.
- Approval status: **APPROVED**.

### `outer_surgeryTreatment`

- Current authored Heat rule: success `gain_heat 1` between healing and follower acquisition.
- Runtime status: Forge test, heal, follower, note, local Artifact, and failure Wound active; Heat inert.
- Original gameplay intent: risky medical recovery.
- Selected retirement model: remove Heat without replacement; narrow summary cleanup.
- Location type: recovery/risk service. Trigger: clear location. Test/stat: Forge. Difficulty: 7.
- Success: heal 1 Wound, gain `cinder-surgeon`, record receipt note. Failure: existing `take_wound 1`.
- Wound handling: existing heal/failure effects unchanged; no new Wound. Scar interaction: no success Scar or direct replacement Scar.
- Salvage interaction: none in the typed effect; C2A does not invent the payment implied elsewhere. Movement/escalation: none.
- Persistence: follower/note. Reset: none. Multiplayer: owner only.
- Source-event protection / reconnect: existing roll, acquisition, deck consumption, event log.
- Runtime support: ready with existing content schema.
- Consequence boundaries — Wound handling: preserve existing heal/failure Wound effects. Scar interaction: no success Scar or Heat conversion. Salvage interaction: none added; no payment is invented. Movement interaction: none added. Escalation interaction: none added.
- Lifecycle boundaries — Persistence: follower/note/Artifact and existing Wound state only. Reset/cleanup: unchanged. Multiplayer behavior: existing acting-owner scope. Source-event protection: existing `SPACE_TEXT_RESOLVED` lifecycle. Reconnect behavior: existing state reconstruction; no new pending state.
- Final player-facing rule: `Resolve the local Artifact and test Forge 7. On success, heal 1 Wound, gain Cinder Surgeon, and record the surgery note. On failure, suffer 1 Wound.`
- Lore text retained: Old Mercy Bay lore; change “patched but marked” to “patched” so no unimplemented Scar is implied.
- Severity: 2. Complexity: 1. Balance risk: moderate reward density is pre-existing and outside C2A.
- Approval status: **APPROVED**.

### `outer_oathpostWrit`

- Current authored Heat rule: failure `gain_heat 1`.
- Runtime status: Command test, faction-writ note, and local Contract active; Heat inert.
- Original gameplay intent: contract/faction credential check.
- Selected retirement model: remove without replacement. Location type: contract service.
- Trigger: resolve clear location. Test/stat: Command. Difficulty: 7.
- Success: retain faction-writ note. Failure: no writ and no additional consequence.
- Wound/Scar/Salvage/movement/escalation interaction: none added. Persistence: note/Contract.
- Multiplayer: acting operative. Source-event protection / reconnect: existing roll/deck/event path.
- Runtime support: ready with existing content schema.
- Consequence boundaries — Wound handling: none added. Scar interaction: none added. Salvage interaction: none added. Movement interaction: none added. Escalation interaction: none added.
- Lifecycle boundaries — Persistence: note/Contract only. Reset/cleanup: unchanged. Multiplayer behavior: existing acting-owner scope. Source-event protection: existing `SPACE_TEXT_RESOLVED` lifecycle. Reconnect behavior: existing state reconstruction; no new pending state.
- Final player-facing rule: `Resolve the local Contract lead and test Command 7. On success, record the faction writ. On failure, no additional effect.`
- Lore text retained: census and debt imagery; “unpaid scar debt” remains descriptive of the active Scar fiction, not a Scar effect.
- Severity: 1. Complexity: 1. Balance risk: low.
- Approval status: **APPROVED**.

### `outer_brokenCausewayShortcut`

- Current authored Heat rule: failure sequence begins with `gain_heat 1`, then `take_wound 1`.
- Runtime status: Grit test, success note, failure Wound, and local Escalation active; Heat inert.
- Original gameplay intent: traversal danger and physical collapse.
- Selected retirement model: remove only the Heat leaf. Location type: route hazard.
- Trigger: failed clear-location test. Test/stat: Grit. Difficulty: 8.
- Success: shortcut note. Failure: existing 1 Wound. Local Escalation resolution unchanged.
- Wound handling: pre-existing `take_wound 1`; no second Wound or direct recall/Scar. Scar interaction: no new effect.
- Salvage/movement interaction: no transaction or displacement; route note does not move the operative. Escalation: only existing local deck behavior.
- Persistence: note/local deck only. Reset: none. Multiplayer: acting operative.
- Source-event protection / reconnect: existing authoritative test and event path.
- Runtime support: ready with existing content schema.
- Consequence boundaries — Wound handling: preserve the existing failure Wound only. Scar interaction: no direct Scar or Heat conversion. Salvage interaction: none added. Movement interaction: no displacement or allowance change. Escalation interaction: surviving local-deck behavior only.
- Lifecycle boundaries — Persistence: note/local deck and existing Wound state only. Reset/cleanup: unchanged. Multiplayer behavior: existing acting-owner scope. Source-event protection: existing `SPACE_TEXT_RESOLVED` lifecycle. Reconnect behavior: existing state reconstruction; no new pending state.
- Final player-facing rule: `Resolve the local Escalation and test Grit 8. On success, record the dangerous-shortcut note. On failure, suffer 1 Wound.`
- Lore text retained: cracked causeway and cinder-pressure language.
- Severity: 3. Complexity: 1. Balance risk: medium from existing Wound plus local Escalation, not from retirement.
- Approval status: **APPROVED**.

### `middle_scarSurgery`

- Current authored Heat rule: success sequence includes `gain_heat 1` after healing.
- Runtime status: Forge test, heal, note, local Escalation, and failure `gain_scar scar-wound-1` active; Heat inert.
- Original gameplay intent: severe field-surgery risk.
- Selected retirement model: remove Heat without replacement. Location type: risk service/anomaly.
- Trigger: successful test. Test/stat: Forge. Difficulty: 9.
- Success: heal 1 Wound and retain field-surgery note. Failure: existing direct Ash-Lanced Scar.
- Wound handling: existing heal only. Scar interaction: the pre-existing direct Scar remains exactly unchanged; C2A does not infer, duplicate, or approve an additional Scar.
- Salvage/movement interaction: none. Escalation: existing local deck only.
- Persistence: existing Scar/note. Reset/cleanup: current Scar lifecycle only. Multiplayer: acting operative.
- Source-event protection / reconnect: existing space-text, Scar, deck, and event reconstruction.
- Runtime support: Heat removal ready with existing content schema; direct-Scar balance is a separate existing-rule concern.
- Consequence boundaries — Wound handling: preserve the existing heal only. Scar interaction: preserve the existing direct Ash-Lanced failure Scar; add no Scar and perform no Heat conversion. Salvage interaction: none added. Movement interaction: none added. Escalation interaction: surviving local-deck behavior only.
- Lifecycle boundaries — Persistence: existing Scar/note/local deck only. Reset/cleanup: current Scar lifecycle unchanged. Multiplayer behavior: existing acting-owner scope. Source-event protection: existing `SPACE_TEXT_RESOLVED` lifecycle. Reconnect behavior: existing state reconstruction; no new pending state.
- Final player-facing rule: `Resolve the local Escalation and test Forge 9. On success, heal 1 Wound and record the field-surgery note. On failure, gain the Ash-Lanced Scar.`
- Lore text retained: machine surgery and Scar wording accurately describes the surviving rule.
- Severity: 4 because the existing failure directly grants a lasting Scar. Complexity: 2. Balance risk: high but pre-existing; no extra severity added.
- Approval status: **APPROVED** for Heat retirement only.

### `middle_redMarchBargain`

- Current authored Heat rule: failure `gain_heat 1`.
- Runtime status: Command test, follower, note, and local Contract active; Heat inert.
- Original gameplay intent: military bargain and support recruitment.
- Selected retirement model: remove without replacement. Location type: enemy/contract bargain.
- Trigger: failed test. Test/stat: Command. Difficulty: 9.
- Success: gain `votive-gunner` and military-favor note. Failure: no reward and no additional consequence.
- Wound/Scar/Salvage/movement/escalation interaction: none added. Persistence: follower/note.
- Multiplayer: acting operative. Source-event protection / reconnect: existing acquisition/deck/event handling.
- Runtime support: ready with existing content schema.
- Consequence boundaries — Wound handling: none added. Scar interaction: none added. Salvage interaction: none added. Movement interaction: none added. Escalation interaction: none added.
- Lifecycle boundaries — Persistence: follower/note/Contract only. Reset/cleanup: unchanged. Multiplayer behavior: existing acting-owner scope. Source-event protection: existing `SPACE_TEXT_RESOLVED` lifecycle. Reconnect behavior: existing state reconstruction; no new pending state.
- Final player-facing rule: `Resolve the local Contract lead and test Command 9. On success, gain Votive Gunner and record the military favor. On failure, no additional effect.`
- Lore text retained: military and ammunition imagery.
- Severity: 1. Complexity: 1. Balance risk: low.
- Approval status: **APPROVED**.

### `inner_blackstarShortcut`

- Current authored Heat rule: success sequence ends with `gain_heat 1`.
- Runtime status: Guile test, route note, local Artifact, and failure Wound active; Heat inert.
- Original gameplay intent: high-risk Artifact route.
- Selected retirement model: remove Heat without replacement. Location type: inner Artifact hazard.
- Trigger: successful test. Test/stat: Guile. Difficulty: 11.
- Success: retain shortcut note and local Artifact resolution. Failure: existing 1 Wound.
- Wound handling: pre-existing only; no direct recall/Scar replacement. Scar interaction: no Heat mapping; the separate board-presentation Scar mismatch is not redesigned here.
- Salvage/movement/escalation interaction: none added. The note does not bypass topology or the `gate-of-cinders-breached` center requirement.
- Persistence: note/Artifact. Reset: none. Multiplayer: acting operative.
- Source-event protection / reconnect: existing roll/deck/event path.
- Runtime support: ready with existing content schema.
- Consequence boundaries — Wound handling: preserve the existing failure Wound only. Scar interaction: no direct Scar replacement or Heat conversion. Salvage interaction: none added. Movement interaction: no displacement or topology bypass. Escalation interaction: none added.
- Lifecycle boundaries — Persistence: note/Artifact and existing Wound state only. Reset/cleanup: unchanged. Multiplayer behavior: existing acting-owner scope. Source-event protection: existing `SPACE_TEXT_RESOLVED` lifecycle. Reconnect behavior: existing state reconstruction; no new pending state.
- Final player-facing rule: `Resolve the local Artifact and test Guile 11. On success, record the Blackstar shortcut note. On failure, suffer 1 Wound.`
- Lore text retained: dead-star hazard language.
- Severity: 3. Complexity: 1. Balance risk: medium; existing presentation/runtime mismatch remains separately reviewable.
- Approval status: **APPROVED**.

### `middle_shardSprawlBargain`

- Current authored Heat rule: stock success `lose_heat 1`; stock and gossip failures each `gain_heat 1`.
- Runtime status: mandatory owner choice, Command/Guile tests, and distinct success notes active; Heat inert.
- Original gameplay intent: choose the type of bargain and route information.
- Selected retirement model: remove all three Heat leaves without replacement. Location type: salvage bargain.
- Trigger: owner selects a server-authored option. Test/stat: Command 8 (`stock`) or Guile 8 (`gossip`).
- Success: retain the selected note. Failure: no note and no additional consequence.
- Wound/Scar/Salvage interaction: none; stock is descriptive and not a payment/transaction. Movement/escalation: notes do not move or escalate.
- Persistence: selected note. Reset: none. Multiplayer: affected owner chooses; no new private state.
- Source-event protection / reconnect: existing choice-ID revalidation, roll, event log, and phase transition.
- Runtime support: ready with existing content schema.
- Difficulty: 8 for either choice.
- Consequence boundaries — Wound handling: none added. Scar interaction: none added. Salvage interaction: none; stock is not a payment. Movement interaction: no displacement or allowance change. Escalation interaction: none added.
- Lifecycle boundaries — Persistence: selected note only. Reset/cleanup: unchanged. Multiplayer behavior: existing acting-owner choice. Source-event protection: existing `SPACE_TEXT_RESOLVED` lifecycle. Reconnect behavior: existing state reconstruction; no new pending state.
- Final player-facing rule: `Choose passage stock (Command 8) or field gossip (Guile 8). On success, record the selected route note. On failure, no additional effect.`
- Lore text retained: bargain/stock/gossip wording.
- Severity: 1. Complexity: 2. Balance risk: low; choices remain differentiated by stat and note identity.
- Approval status: **APPROVED**.

### `middle_guardianSpanThreshold`

- Current authored Heat rule: both choice failures `gain_heat 1`.
- Runtime status: mandatory owner choice, tests, clearance notes, and movement requirement active; Heat inert.
- Original gameplay intent: side-objective gate into the inner ring.
- Selected retirement model: remove both failure Heat leaves. Location type: traversal gate.
- Trigger: owner selects seal alignment or ghost marker. Test/stat: Command 9 or Signal 9.
- Success: grant `guardian-span-clearance` and descriptive note. Failure: withhold clearance; no extra consequence.
- Wound/Scar/Salvage interaction: none added; displayed payment route remains outside this typed action. Movement: no displacement or allowance change; only canonical note-gated legality. Escalation: none.
- Persistence: clearance note. Reset: none. Multiplayer: owner choice and owner clearance.
- Source-event protection / reconnect: existing choice, test, note, and event reconstruction.
- Runtime support: ready with existing content schema.
- Difficulty: 9 for either choice.
- Consequence boundaries — Wound handling: none added. Scar interaction: none added. Salvage interaction: none; no payment is invented. Movement interaction: existing note-gated legality only. Escalation interaction: none added.
- Lifecycle boundaries — Persistence: clearance note only. Reset/cleanup: unchanged. Multiplayer behavior: existing acting-owner choice. Source-event protection: existing `SPACE_TEXT_RESOLVED` lifecycle. Reconnect behavior: existing state reconstruction; no new pending state.
- Final player-facing rule: `Choose seal alignment (Command 9) or ghost marker (Signal 9). On success, gain Guardian Span clearance. On failure, gain no clearance and suffer no additional effect.`
- Lore text retained: Customs Gate tax imagery is descriptive.
- Severity: 2 because failure delays inner access. Complexity: 2. Balance risk: low.
- Approval status: **APPROVED**.

### `middle_webglassFracture`

- Current authored Heat rule: hidden-lane success `lose_heat 1`; both choice failures `gain_heat 1`.
- Runtime status: mandatory owner choice, Guile/Signal tests, and distinct route notes active; Heat inert.
- Original gameplay intent: route-choice restriction and anomaly interference without actual movement.
- Selected retirement model: remove all three Heat leaves. Location type: movement/anomaly route mapping.
- Trigger: choose hidden lane or relay splice. Test/stat: Guile 9 or Signal 9.
- Success: selected route note. Failure: no note and no additional consequence.
- Wound/Scar/Salvage/movement/escalation interaction: none added; no displacement or Contract progress.
- Persistence: note. Reset: none. Multiplayer: owner choice.
- Source-event protection / reconnect: existing choice/roll/event lifecycle.
- Runtime support: ready with existing content schema.
- Difficulty: 9 for either choice.
- Consequence boundaries — Wound handling: none added. Scar interaction: none added. Salvage interaction: none added. Movement interaction: no displacement or allowance change. Escalation interaction: none added.
- Lifecycle boundaries — Persistence: selected note only. Reset/cleanup: unchanged. Multiplayer behavior: existing acting-owner choice. Source-event protection: existing `SPACE_TEXT_RESOLVED` lifecycle. Reconnect behavior: existing state reconstruction; no new pending state.
- Final player-facing rule: `Choose hidden lane (Guile 9) or relay splice (Signal 9). On success, record the selected Webglass route note. On failure, no additional effect.`
- Lore text retained: “flared too hot” is ordinary relay-failure description, not a resource.
- Severity: 1. Complexity: 2. Balance risk: low.
- Approval status: **APPROVED**.

### `inner_veilRiftEntry`

- Current authored Heat rule: anchor success `lose_heat 1`; both choice failures `gain_heat 1`.
- Runtime status: Guardian Span entry requirement, mandatory owner choice, Signal/Guile tests, and route notes active; Heat inert.
- Original gameplay intent: inner traversal danger and route selection.
- Selected retirement model: remove all three Heat leaves. Location type: inner movement gate.
- Trigger: legally enter and resolve Melted Gate; choose anchor or fold. Test/stat: Signal 10 or Guile 10.
- Success: selected route note. Failure: no note and no additional consequence.
- Wound/Scar/Salvage interaction: none. Movement: does not spend allowance or relocate; existing entry gate remains. Escalation: none.
- Persistence: route note. Reset: none. Multiplayer: owner choice.
- Source-event protection / reconnect: existing movement legality, choice, roll, and event state.
- Runtime support: ready with existing content schema.
- Difficulty: 10 for either choice.
- Consequence boundaries — Wound handling: none added. Scar interaction: none added. Salvage interaction: none added. Movement interaction: existing entry requirement only; no displacement. Escalation interaction: none added.
- Lifecycle boundaries — Persistence: selected note only. Reset/cleanup: unchanged. Multiplayer behavior: existing acting-owner choice. Source-event protection: existing `SPACE_TEXT_RESOLVED` lifecycle. Reconnect behavior: existing state reconstruction; no new pending state.
- Final player-facing rule: `Choose anchor surge (Signal 10) or slip-fold (Guile 10). On success, record the selected Veil Rift route note. On failure, no additional effect.`
- Lore text retained: “running dangerously hot” is environmental/anomaly language, not a resource rule.
- Severity: 2. Complexity: 2. Balance risk: low.
- Approval status: **APPROVED**.

### `inner_cinderLatticeTrial`

- Current authored Heat rule: ghost-angles success `lose_heat 1`; both failures `gain_heat 1`.
- Runtime status: mandatory owner choice, Signal/Guile tests, and final-approach notes active; Heat inert.
- Original gameplay intent: scenario preparation fiction and anomaly route reading.
- Selected retirement model: remove all three Heat leaves; rewrite false Scar-pressure wording.
- Location type: inner anomaly/scenario-approach. Trigger: choose trace or angles. Test/stat: Signal 10 or Guile 10.
- Success: selected final-approach note. Failure: no note and no additional consequence.
- Wound/Scar/Salvage/movement/escalation interaction: none; no Scar, confrontation progress, movement, or escalation.
- Persistence: note only. Reset: none. Multiplayer: owner choice.
- Source-event protection / reconnect: existing choice/roll/note event.
- Runtime support: ready with existing content schema.
- Difficulty: 10 for either choice.
- Consequence boundaries — Wound handling: none added. Scar interaction: none added; false Scar-pressure wording is removed. Salvage interaction: none added. Movement interaction: no displacement or route bypass. Escalation interaction: none added.
- Lifecycle boundaries — Persistence: selected note only. Reset/cleanup: unchanged. Multiplayer behavior: existing acting-owner choice. Source-event protection: existing `SPACE_TEXT_RESOLVED` lifecycle. Reconnect behavior: existing state reconstruction; no new pending state.
- Final player-facing rule: `Choose trace embers (Signal 10) or ghost angles (Guile 10). On success, record the selected Cinder Lattice approach note. On failure, no additional effect.`
- Lore text retained: observatory lore; change “rising scar pressure” to “rising interference.”
- Severity: 2. Complexity: 2. Balance risk: low; notes do not advance scenario state.
- Approval status: **APPROVED**.

### `inner_gateOfCindersTrial`

- Current authored Heat rule: each of three failures `gain_heat 1`.
- Runtime status: mandatory owner choice, difficulty-12 tests, breach notes, and center movement requirements active; Heat inert.
- Original gameplay intent: final side-objective gate before the center confrontation.
- Selected retirement model: remove all three failure Heat leaves. Location type: inner scenario/movement gate.
- Trigger: choose brace locks, time relays, or ghost path. Test/stat: Grit, Signal, or Guile. Difficulty: 12.
- Success: grant `gate-of-cinders-breached` and descriptive note. Failure: withhold breach note; no additional consequence.
- Wound/Scar/Salvage interaction: none. Movement: no relocation; center entry still requires allowed origin and breach note. Escalation: none.
- Persistence: breach note. Reset: none. Multiplayer: owner choice and owner legality.
- Source-event protection / reconnect: existing choice, roll, note, event, and canonical movement validation.
- Runtime support: ready with existing content schema.
- Consequence boundaries — Wound handling: none added. Scar interaction: none added; false Scar-pressure wording is removed. Salvage interaction: none added. Movement interaction: existing center-entry requirements only; no relocation. Escalation interaction: none added.
- Lifecycle boundaries — Persistence: breach-clearance note only. Reset/cleanup: unchanged. Multiplayer behavior: existing acting-owner choice. Source-event protection: existing `SPACE_TEXT_RESOLVED` lifecycle. Reconnect behavior: existing state reconstruction; no new pending state.
- Final player-facing rule: `Choose brace locks (Grit 12), time relays (Signal 12), or ghost path (Guile 12). On success, gain Gate of Cinders breach clearance. On failure, gain no clearance and suffer no additional effect.`
- Lore text retained: burning/static/hot gate language is descriptive; “static scar pressure” should become “static backlash.”
- Severity: 2 because failure delays the center confrontation. Complexity: 2. Balance risk: low; no victory/progress bypass.
- Approval status: **APPROVED**.

## Four critique seats

### New player

Every approved rule now has a visible finite outcome. A failed route or bargain test either withholds its note/clearance or resolves an already-authored Wound/Scar; no hidden resource changes. Environmental “hot,” “burn,” and furnace language remains lore, while false Scar implications are cleaned where no Scar exists.

### Optimizer

Removal does not create a new farm: the Heat leaves already did nothing. Repeat visits, local-deck depletion, follower acquisition, notes, and route gates remain governed by current rules. Zero Salvage does not create a free branch because C2A approves no payment. Gate failures still withhold the notes required for inward progress.

### Family/casual player

Resolution becomes shorter by removing “no additional status change” rows. No pending state, nested choice, or multi-round bookkeeping is added. Existing two/three-option location choices remain single-step selections followed by one test.

### Rules lawyer

The acting owner resolves the current server-authored location choice. The server rolls the named stat against the authored difficulty, resolves the surviving local-deck/effect sequence, records one `SPACE_TEXT_RESOLVED` action, and advances to broadcast. No Heat action is created. Reconnect reconstructs the completed state; a stale same-turn submission is not legal after the phase change. Notes gate routes but do not move the operative, advance confrontation progress, or declare victory.

## Implementation groups

### Group 1 — simple failure-only removals

- IDs: `outer_ashwakeClearLane`, `outer_mirecoilTraffic`, `outer_relayCrew`, `outer_oathpostWrit`, `middle_redMarchBargain`.
- Implementation status: **IMPLEMENTED in C2B1**. Five failure `gain_heat 1` clauses were removed without replacement; all approved success, local-deck, summary, and identity fields were preserved.
- Shared resolver: existing board-text test and null-failure path.
- Content: delete one `gain_heat 1` failure effect per ID; preserve summaries, difficulties, rewards, local decks, and notes.
- Validation: remove these five signatures from the C1 blocked manifest; no schema change.
- UI: none; existing result shows failure with no additional effect.
- Focused tests: exact IDs/effect absence, success rewards, failure no state delta, deck consumption, reconnect, repeat submission rejection.
- Risk: low. Recommended commit: `feat: retire simple board heat failures`.

### Group 2 — success-sequence cleanup

- IDs: `outer_emberSanctumRest`, `outer_glassmereChorus`, `outer_waymarketExchange`, `outer_saltCrossing`, `outer_surgeryTreatment`.
- Shared resolver: existing sequence pruning while preserving order.
- Content: remove `lose_heat`/`gain_heat` leaves; narrow three ambiguous summaries where applicable.
- Validation/UI: manifest update only; no UI work.
- Focused tests: exact surviving sequence order, heal/follower/note/deck results, failure Wound regression, no empty result row.
- Risk: low to moderate due reward-dense surgery definitions. Commit: `feat: retire board recovery heat effects`.

### Group 3 — existing severe consequence cleanup

- IDs: `outer_brokenCausewayShortcut`, `middle_scarSurgery`, `inner_blackstarShortcut`.
- Shared resolver: sequence pruning plus existing Wound/Scar/local-deck behavior.
- Content: remove only Heat leaves.
- Validation/UI: manifest update only; no UI work.
- Focused tests: surviving Wound/Scar exactly once, no Heat-to-Scar mapping, local Escalation/Artifact unchanged, center route still gated.
- Risk: medium/high because of pre-existing direct Scar and authored/runtime presentation mismatches. Commit: `feat: retire severe board heat effects`.

### Group 4 — two-choice route-note cleanup

- IDs: `middle_shardSprawlBargain`, `middle_webglassFracture`, `inner_veilRiftEntry`.
- Shared resolver: existing server-authored board choice and test lifecycle.
- Content: remove success relief and both failure Heat leaves per ID.
- Validation/UI: manifest update only; existing choices remain.
- Focused tests: both option IDs, stat/difficulty preservation, note differentiation, owner authority, reconnect, no movement side effect.
- Risk: low. Commit: `feat: retire route choice heat effects`.

### Group 5 — clearance/final-approach cleanup

- IDs: `middle_guardianSpanThreshold`, `inner_cinderLatticeTrial`, `inner_gateOfCindersTrial`.
- Shared resolver: existing board choice, note grant, movement requirement, and scenario-boundary validation.
- Content: remove failure/relief Heat leaves and clean false Scar wording.
- Validation/UI: manifest update only; no scenario or movement changes.
- Focused tests: all choice paths, failed test withholds clearance, center/inner legality unchanged, no confrontation progress/victory, reconnect.
- Risk: medium because route legality is progression-critical. Commit: `feat: retire gate approach heat effects`.

## Distribution and remaining population

Preferred dispositions across 19 IDs:

| Model | IDs |
|---|---:|
| Remove without replacement | 19 |
| Lore-only rewrite as primary disposition | 0 |
| Wound replacement | 0 |
| Salvage loss/payment | 0 |
| Movement | 0 |
| Temporary modifier | 0 |
| Persistent challenge | 0 |
| Global Escalation | 0 |
| Player choice added | 0 |
| Blocked | 0 |

Severity distribution: severity 1 = 9 IDs; severity 2 = 7; severity 3 = 2; severity 4 = 1; severity 5 = 0. The severity 3–4 ratings come from surviving pre-existing Wound/Scar/local-deck consequences, not from replacement mechanics.

After all five approved implementation groups land, authored typed Heat falls from **39 to 7 occurrences across 7 out-of-scope IDs**:

- scenario: `scenario_mirror_of_false_heroes` — confrontation consequence requires separate scenario approval;
- escalations: `escalation-blackstar-hunger`, `escalation-choir-feedback`, `escalation-marrow-surgery-debt`, `escalation-saltwind-lockdown` — shared/cap pressure requires separate escalation approval;
- named followers: `crownless-advocate`, `saltflat-bone-reader` — active ability/loss-condition identity requires separate named-content approvals.

The audit verdict remains **FAIL** until approved content changes are implemented and the remaining seven effects are retired. No gameplay changed in C2A.

## Phase C2B1 implementation update

Group 1 is implemented. The five simple failure-only `gain_heat 1` clauses are absent, and focused content, resolution, projection, replay, and manifest guards preserve the approved null-failure behavior. Groups 2–5 remain unimplemented and unchanged.

Current authored typed Heat population: **34 occurrences across 21 IDs**. This comprises 27 occurrences across the 14 remaining C2A board IDs plus seven separately blocked scenario, escalation, and follower occurrences. The audit verdict remains **FAIL**.
