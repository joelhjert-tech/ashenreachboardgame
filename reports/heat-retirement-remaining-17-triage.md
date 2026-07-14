# Remaining 17 Heat-linked Threat retirement triage

Status: final triage approved at `d877574`; Groups H1 and H2 are implemented. The three H3 IDs remain approved but unimplemented, and all nine blocked IDs remain blocked.

## Decision summary

The two existing Heat audits and current canonical Threat content reconcile to exactly **17 unique stable IDs**. Eight IDs have complete, bounded retirement rules and are **APPROVED** in three implementation groups. Nine remain **BLOCKED** because a severity, target, ownership, persistence, or reset decision is unresolved.

- Approved: 8
- Blocked: 9
- Approved retirement models: remove without replacement (3), normal Wound pressure (2), floor-zero Salvage pressure (3)
- Player-facing Heat remains obsolete. Every still-active Heat branch below is parsed only for compatibility and resolves as a no-op with a “no additional status change” summary.
- Canonical Threats do not define an activation-number field. Every record therefore reports `N/A`; difficulty and canonical graph frequency are recorded separately and are not relabelled as activation.
- The 17-card population is Red 1 / Blue 7 / Yellow 9. Card totals remain Red 26 / Blue 35 / Yellow 48 / overall 109.

## Canonical inventory

| Stable ID | Display name | Lane / type | Activation | Stat / difficulty | Current success | Current failure | Reward | Exact Heat branch | Runtime state | Source | Closest overlaps |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `ashen-doppelganger` | Ashen Doppelganger | Blue / enemy | N/A | Guile 11 | Defeat | `gain_heat 2` on loss | 3 Trophies | `woundOnLoss` | compatibility-only no-op | `content/cards/threats/ashen-doppelganger.json` | `mirror-lord-envoy`, `glass-mire-stalker`, `mirror-rot-interference` |
| `choir-static-burst` | Choir-Static Burst | Blue / hazard | N/A | Signal 9 | scenario progress `choirStaticContained +1` | 1 preventable Wound | none | retired H2 `failEffect` | implemented normal Wound | `content/cards/threats/choir-static-burst.json` | `gateblind-pulse`, `rift-whispers`, `webglass-echo-trap` |
| `cinder-gate-backlash` | Cinder Gate Backlash | Blue / hazard | N/A | Signal 12 | no additional effect | 2 Wounds | none | retired H1 `successEffect` | implemented removal; failure remains active | `content/cards/threats/cinder-gate-backlash.json` | `gateblind-pulse`, `emberwatch-sparkfall`, `spindle-static-squall` |
| `crown-bell-baron` | Crown-Bell Baron | Yellow / enemy | N/A | Command 7 | Defeat | `gain_heat 2` on loss | route-fee fraud note | `woundOnLoss` | compatibility-only no-op | `content/cards/threats/crown-bell-baron.json` | `pale-toll-enforcer`, `bridge-toll-runt`, `pale-contract-collector` |
| `false-route-procession` | False-Route Procession | Yellow / hazard | N/A | Command 7 | false-road note | `gain_heat 2` | none | `failEffect` | compatibility-only no-op | `content/cards/threats/false-route-procession.json` | `memory-tax-gate`, `route-splice`, `siren-relay-echo` |
| `gateblind-pulse` | Gateblind Pulse | Blue / hazard | N/A | Signal 10 | scenario progress `gateblindPulsesRead +1` | `gain_heat 2` | none | `failEffect` | compatibility-only no-op | `content/cards/threats/gateblind-pulse.json` | `choir-static-burst`, `cinder-gate-backlash`, `saint-of-ashes-echo` |
| `hymn-scarred-zealot` | Hymn-Scarred Zealot | Red / enemy | N/A | Grit 3 | Defeat | `gain_heat 1` on loss | silencing note | `woundOnLoss` | compatibility-only no-op | `content/cards/threats/hymn-scarred-zealot.json` | `lantern-ash-ghoul`, `moth-carrier-husk`, `ash-cinder-runt` |
| `lantern-moth-swarm` | Lantern-Moth Swarm | Blue / hazard | N/A | Signal 5 | no additional effect | 1 preventable Wound | none | retired H2 success and failure | implemented removal plus normal Wound | `content/cards/threats/lantern-moth-swarm.json` | `glass-chime-swarm`, `spindle-static-squall`, `roadside-bone-oracle` |
| `marrow-tax-auditors` | Marrow-Tax Auditors | Yellow / hazard | N/A | Guile 7 | tariff-loophole note | `gain_heat 2` | none | `failEffect` | compatibility-only no-op | `content/cards/threats/marrow-tax-auditors.json` | `locked-vault`, `false-route-procession`, `wireghost-key` |
| `memory-tax-gate` | Memory Tax Gate | Yellow / hazard | N/A | Command 8 | harmless-memory note | `gain_heat 2` | none | `failEffect` | compatibility-only no-op | `content/cards/threats/memory-tax-gate.json` | `false-route-procession`, `route-splice`, `crown-bell-baron` |
| `mirror-rot-interference` | Mirror-Rot Interference | Blue / hazard | N/A | Guile 11 | no additional effect | 1 Wound | none | retired H1 `successEffect` | implemented removal; failure remains active | `content/cards/threats/mirror-rot-interference.json` | `webglass-snarefield`, `bellwire-snare`, `webglass-echo-trap` |
| `pale-contract-collector` | Pale Contract Collector | Yellow / enemy | N/A | Command 8 | Defeat | `gain_heat 2` on loss | 2 Trophies | `woundOnLoss` | compatibility-only no-op | `content/cards/threats/pale-contract-collector.json` | `crown-bell-baron`, `pale-toll-enforcer`, `ash-court-duelist` |
| `relay-husk` | Relay Husk | Yellow / hazard | N/A | Guile 6 | gain Marshal Seal | `gain_heat 1` | none | `failEffect` | compatibility-only no-op | `content/cards/threats/relay-husk.json` | `wireghost-key`, `pale-cartel-shakedown`, `signal-rotted-engineer` |
| `signal-rotted-engineer` | Signal-Rotted Engineer | Yellow / enemy | N/A | Forge 4 | Defeat | `gain_heat 1` on loss | tool-rig note | `woundOnLoss` | compatibility-only no-op; current combat already disables Weapon bonus | `content/cards/threats/signal-rotted-engineer.json` | `rust-mote-drone`, `wire-chewer-pack`, `relay-husk` |
| `siren-relay-echo` | Siren Relay Echo | Yellow / hazard | N/A | Command 6 | `lose_heat 1` | `gain_heat 2` | none | `successEffect`, `failEffect` | two compatibility-only no-ops | `content/cards/threats/siren-relay-echo.json` | `false-route-procession`, `memory-tax-gate`, `relay-husk` |
| `soot-stained-cutpurse` | Soot-Stained Cutpurse | Yellow / enemy | N/A | Guile 3 | Defeat | `gain_heat 1` on loss | market-rumor note | `woundOnLoss` | compatibility-only no-op | `content/cards/threats/soot-stained-cutpurse.json` | `toll-scrip-urchins`, `scrap-toll-gangers`, `bridge-toll-runt` |
| `webglass-snarefield` | Webglass Snarefield | Blue / hazard | N/A | Guile 9 | no additional effect | 1 Wound | none | retired H1 `successEffect` | implemented removal; failure remains active | `content/cards/threats/webglass-snarefield.json` | `mirror-rot-interference`, `bellwire-snare`, `starless-taxation` |

Canonical graph references, used only as a frequency warning, are respectively 3, 4, 3, 1, 5, 3, 1, 2, 4, 3, 2, 2, 1, 2, 3, 2, and 3. These counts are not activation numbers or draw probabilities.

## Retirement model conclusions

| ID | Original intent | Selected model | Runtime readiness | Severity | Status |
|---|---|---|---|---:|---|
| `ashen-doppelganger` | severe lasting mirrored injury | conditional 2-Wound candidate | existing Wound pipeline, but balance unresolved | 4 | BLOCKED |
| `choir-static-burst` | accumulating attrition from violent signal feedback | normal Wound pressure: 1 preventable Wound | implemented H2 | 2 | APPROVED — IMPLEMENTED H2 |
| `cinder-gate-backlash` | obsolete success-side recovery bookkeeping | remove success branch without replacement | implemented H1 | 1 | APPROVED — IMPLEMENTED H1 |
| `crown-bell-baron` | resource pressure through extortion | lose up to 1 Salvage | ready with existing systems | 2 | APPROVED |
| `false-route-procession` | movement misdirection | forced displacement or delayed relocation | requires unresolved destination rule | 2 provisional | BLOCKED |
| `gateblind-pulse` | shared gate/scenario pressure | Global Escalation candidate | existing track, but cap/threshold impact unresolved | 3 provisional | BLOCKED |
| `hymn-scarred-zealot` | delayed or lasting broadcast consequence | conditional Scar candidate | Scar severity and branch timing unresolved | 4 provisional | BLOCKED |
| `lantern-moth-swarm` | risk/reward prevention plus immediate fire injury | remove success branch; failure becomes 1 preventable Wound | implemented H2 | 2 | APPROVED — IMPLEMENTED H2 |
| `marrow-tax-auditors` | repeated resource taxation | lose up to 1 Salvage candidate | mechanically ready; frequency balance unresolved | 2 provisional | BLOCKED |
| `memory-tax-gate` | risk/reward choice paid with private memory | player-choice/private-note lifecycle | requires new lifecycle | 3 provisional | BLOCKED |
| `mirror-rot-interference` | obsolete success-side recovery bookkeeping | remove success branch without replacement | implemented H1 | 1 | APPROVED — IMPLEMENTED H1 |
| `pale-contract-collector` | resource pressure through debt collection | lose up to 1 Salvage | ready with existing systems | 2 | APPROVED |
| `relay-husk` | Equipment pressure from false instructions | choose exact Equipment to disable temporarily | requires target and cleanup lifecycle | 2 provisional | BLOCKED |
| `signal-rotted-engineer` | Equipment interference | exact-instance Weapon pressure | requires duration/target decision | 2 provisional | BLOCKED |
| `siren-relay-echo` | paired temporary Command interference | next-Command-test modifier candidate | requires schema, precedence, and reset decision | 2 provisional | BLOCKED |
| `soot-stained-cutpurse` | minor resource theft | lose up to 1 Salvage | ready with existing systems | 1 | APPROVED |
| `webglass-snarefield` | obsolete success-side recovery bookkeeping | remove success branch without replacement | implemented H1 | 1 | APPROVED — IMPLEMENTED H1 |

No approved card grants a Scar, advances Global Escalation, displaces a player, destroys Equipment, creates a persistent object, or opens a choice prompt. Those outcomes remain behind their explicit design gates rather than being used as automatic Heat substitutes.

### Per-ID model screen

Codes: A remove; B temporary owner modifier; C normal Wound; D conditional Scar; E Global Escalation; F Salvage/resource; G Equipment; H movement; I persistent sector pressure; J player choice. `SELECT` is the approved model, `CANDIDATE` is the blocked preferred direction, `POSSIBLE` is a secondary direction that still lacks justification, and `NO` is rejected for theme, severity, duplication, or lifecycle fit.

| ID | A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|---|
| `ashen-doppelganger` | NO | NO | CANDIDATE | NO | NO | NO | NO | NO | NO | NO |
| `choir-static-burst` | NO | POSSIBLE | SELECT | NO | NO | NO | NO | NO | NO | NO |
| `cinder-gate-backlash` | SELECT | NO | NO; failure already owns 2 | NO | NO | NO | NO | NO | NO | NO |
| `crown-bell-baron` | NO | NO | NO | NO | NO | SELECT | NO | NO | NO | POSSIBLE but unnecessary |
| `false-route-procession` | NO | NO; duplicates Spindle | NO | NO | NO | NO | NO | CANDIDATE | POSSIBLE | POSSIBLE |
| `gateblind-pulse` | NO | POSSIBLE | NO | NO | CANDIDATE | NO | NO | POSSIBLE | POSSIBLE | NO |
| `hymn-scarred-zealot` | POSSIBLE | NO | POSSIBLE | CANDIDATE | POSSIBLE | NO | NO | NO | POSSIBLE | NO |
| `lantern-moth-swarm` | SELECT on success | NO | SELECT on failure | NO | NO | NO | NO | NO | NO | NO |
| `marrow-tax-auditors` | NO | NO | NO | NO | NO | CANDIDATE | NO | NO | NO | POSSIBLE but unnecessary |
| `memory-tax-gate` | NO | NO | NO | NO | NO | NO | NO | POSSIBLE | POSSIBLE | CANDIDATE |
| `mirror-rot-interference` | SELECT on success | NO | existing failure only | NO | NO | NO | NO | NO | NO | NO |
| `pale-contract-collector` | NO | NO | NO | NO | NO | SELECT | NO | NO | NO | POSSIBLE but unnecessary |
| `relay-husk` | NO | NO | NO | NO | NO | NO | CANDIDATE | NO | NO | POSSIBLE |
| `signal-rotted-engineer` | NO | NO | NO | NO | NO | NO | CANDIDATE | NO | NO | NO |
| `siren-relay-echo` | POSSIBLE | CANDIDATE | NO | NO | NO | NO | NO | NO | NO | NO |
| `soot-stained-cutpurse` | NO | NO | NO | NO | NO | SELECT | NO | NO | NO | POSSIBLE but unnecessary |
| `webglass-snarefield` | SELECT on success | NO | existing failure only | NO | NO | NO | NO | NO | NO | NO |

The screen deliberately rejects automatic Scar, Global Escalation, and generic one-Wound substitutions where card fiction or severity does not support them. It also prevents the approved set from repeating Glass-Chime’s next-test penalty, Spindle’s movement-roll penalty, the two same-ring displacement cards, or Shattered Barricade’s escalation rule.

## Exact approval blocks

### `ashen-doppelganger`

- Current Heat behavior: combat loss `gain_heat 2`, compatibility-only no-op.
- Original gameplay intent: severe lasting injury from a rare inner mirrored enemy.
- Selected retirement model: candidate 2 preventable Wounds; not approved until recall-rate impact is accepted.
- Card type: enemy.
- Lane: Blue.
- Test/battle stat: Guile.
- Difficulty: 11; severity 4; inner uncommon; 3 graph references.
- Timing: after authoritative combat loss.
- Success: defeat and gain 3 Trophies.
- Failure: unresolved candidate 2 Wounds.
- Reward: 3 Trophies.
- Persistence: none beyond normal Wound/recall state.
- Wound handling: must use requested/prevented/actual Wound processing and normal recall threshold.
- Scar interaction: only the normal recall/Scar lifecycle; no direct card Scar.
- Salvage interaction: none.
- Equipment interaction: normal prevention only.
- Movement interaction: none.
- Multiplayer interaction: owner-scoped, but 2 Wounds can recall from 1 Wound at the multiplayer threshold.
- Typed runtime support: existing Wound pipeline.
- Duplicate-source protection: existing encounter source/result guard required.
- Reconnect behavior: pending prevention and committed Wounds must persist exactly once.
- Cleanup/reset: normal resolution close; Wounds persist normally.
- Final player-facing rule: unresolved; candidate “If you lose, suffer 2 Wounds.”
- Severity: 4, potentially recall-causing.
- Implementation complexity: low code / high balance.
- Balance risk: high; the current branch is a no-op and three graph references amplify the jump.
- Approval status: BLOCKED.

### `choir-static-burst`

- Current Heat behavior: former failed Signal test `gain_heat 2`, replaced in H2.
- Original gameplay intent: accumulating attrition from violent signal feedback.
- Selected retirement model: normal Wound pressure, implemented H2.
- Card type: hazard.
- Lane: Blue.
- Test/battle stat: Signal.
- Difficulty: 9; severity 3; middle uncommon; 4 graph references.
- Timing: immediately after final failed hazard result, before resolution closes.
- Success: advance `choirStaticContained` scenario progress by 1, unchanged.
- Failure: suffer 1 preventable Wound.
- Reward: none beyond the success-side scenario leverage.
- Persistence: only any normal Wound/recall result.
- Wound handling: standard requested/prevented/actual pipeline; no direct mutation.
- Scar interaction: only normal recall threshold handling.
- Salvage interaction: none.
- Equipment interaction: ordinary eligible Wound prevention only.
- Movement interaction: none.
- Multiplayer interaction: owner-scoped; no group Wound.
- Typed runtime support: ready with existing `take_wound 1`.
- Duplicate-source protection: authoritative threat resolution/source event; committed result cannot replay.
- Reconnect behavior: pending prevention persists; completed Wound does not replay.
- Cleanup/reset: normal hazard close after consequence.
- Final player-facing rule: “If you fail, suffer 1 Wound.”
- Severity: 2, moderate turn pressure; graph frequency requires focused regression.
- Implementation complexity: low.
- Balance risk: medium because it adds real attrition to a four-reference card.
- Approval status: APPROVED — IMPLEMENTED H2.

### `cinder-gate-backlash`

- Current Heat behavior: former successful Signal test `lose_heat 2`, removed in H1.
- Original gameplay intent: obsolete bookkeeping that once rewarded surviving an extreme gate pulse.
- Selected retirement model: remove without replacement, implemented H1.
- Card type: hazard.
- Lane: Blue.
- Test/battle stat: Signal.
- Difficulty: 12; severity 5; inner rare; 3 graph references.
- Timing: success branch is removed; no post-success effect.
- Success: pass and avoid the 2-Wound failure.
- Failure: existing 2 preventable Wounds, unchanged.
- Reward: none.
- Persistence: none.
- Wound handling: existing failure pipeline unchanged.
- Scar interaction: normal recall threshold only.
- Salvage interaction: none.
- Equipment interaction: normal Wound prevention on failure only.
- Movement interaction: none.
- Multiplayer interaction: owner-scoped.
- Typed runtime support: content-only deletion; no extension.
- Duplicate-source protection: no new source; existing failure guard unchanged.
- Reconnect behavior: no success-side state to reconstruct.
- Cleanup/reset: normal hazard close.
- Final player-facing rule: success has no additional effect; failure remains “Suffer 2 Wounds.”
- Severity: 1 for the retirement rule; base card remains severity 5.
- Implementation complexity: very low.
- Balance risk: low because the removed branch already has no runtime effect.
- Approval status: APPROVED — IMPLEMENTED H1.

### `crown-bell-baron`

- Current Heat behavior: combat loss `gain_heat 2`, compatibility-only no-op.
- Original gameplay intent: resource pressure through fraudulent route fees and extortion.
- Selected retirement model: floor-zero Salvage loss.
- Card type: enemy.
- Lane: Yellow.
- Test/battle stat: Command.
- Difficulty: 7; severity 3; middle uncommon; 1 graph reference.
- Timing: immediately after authoritative combat loss.
- Success: defeat.
- Failure: lose up to 1 Salvage; continue at zero.
- Reward: stamped-writ route note, unchanged.
- Persistence: none.
- Wound handling: none.
- Scar interaction: none.
- Salvage interaction: automatic loss, not spend or payment; actual delta floors at zero.
- Equipment interaction: none.
- Movement interaction: none.
- Multiplayer interaction: owner-only; no targeting or transfer.
- Typed runtime support: ready with existing `lose_salvage 1`.
- Duplicate-source protection: existing authoritative encounter source prevents replay.
- Reconnect behavior: committed actual delta is not applied twice.
- Cleanup/reset: normal enemy-loss resolution.
- Final player-facing rule: “If you lose, lose up to 1 Salvage.”
- Severity: 2.
- Implementation complexity: low.
- Balance risk: low-medium; one graph reference and floor zero bound the impact.
- Approval status: APPROVED.

### `false-route-procession`

- Current Heat behavior: failed Command test `gain_heat 2`, compatibility-only no-op.
- Original gameplay intent: movement misdirection and delayed relocation.
- Selected retirement model: forced displacement or return toward the prior route, unresolved.
- Card type: hazard.
- Lane: Yellow.
- Test/battle stat: Command.
- Difficulty: 7; severity 2; outer common; 5 graph references.
- Timing: after failed hazard result.
- Success: false-road note, unchanged.
- Failure: no approved endpoint, direction, or fallback.
- Reward: none.
- Persistence: candidate is immediate, but not settled.
- Wound handling: only a topology fallback if explicitly approved; amount unresolved.
- Scar interaction: none proposed.
- Salvage interaction: none.
- Equipment interaction: possible normal displacement suppression only if the final effect is eligible.
- Movement interaction: must use authoritative topology; may not duplicate same-ring clockwise/counterclockwise cards without distinct routing.
- Multiplayer interaction: owner-scoped.
- Typed runtime support: forced displacement exists, but “false shortcut” lacks a canonical direction/target rule.
- Duplicate-source protection: existing displacement source IDs could apply after design approval.
- Reconnect behavior: a pending destination/reaction must persist.
- Cleanup/reset: close after exactly one displacement or fallback.
- Final player-facing rule: unresolved.
- Severity: 2 provisional.
- Implementation complexity: medium.
- Balance risk: medium-high because five graph references magnify route disruption.
- Approval status: BLOCKED.

### `gateblind-pulse`

- Current Heat behavior: failed Signal test `gain_heat 2`, compatibility-only no-op.
- Original gameplay intent: shared scenario/gate pressure.
- Selected retirement model: Global Escalation candidate.
- Card type: hazard.
- Lane: Blue.
- Test/battle stat: Signal.
- Difficulty: 10; severity 4; inner uncommon; 3 graph references.
- Timing: after failed hazard result.
- Success: advance `gateblindPulsesRead` by 1, unchanged.
- Failure: candidate `Global Escalation +1`, not approved.
- Reward: success-side scenario leverage.
- Persistence: shared escalation track if approved.
- Wound handling: none proposed.
- Scar interaction: none proposed.
- Salvage interaction: none.
- Equipment interaction: none.
- Movement interaction: fiction implies navigation, but no map legality changes are proposed.
- Multiplayer interaction: shared effect would scale differently from the old owner no-op.
- Typed runtime support: `advance_escalation` exists.
- Duplicate-source protection: source-event guard exists for approved authored escalation effects.
- Reconnect behavior: committed escalation persists; no replay.
- Cleanup/reset: normal escalation lifecycle.
- Final player-facing rule: unresolved pending cap and threshold analysis.
- Severity: 3 provisional.
- Implementation complexity: low code / medium systems.
- Balance risk: high until solo/multiplayer cap and threshold interaction are measured; also risks repeating Shattered Barricade’s pattern.
- Approval status: BLOCKED.

### `hymn-scarred-zealot`

- Current Heat behavior: combat loss `gain_heat 1`, compatibility-only no-op.
- Original gameplay intent: a delayed or lasting broadcast consequence.
- Selected retirement model: conditional Scar candidate, but current branch and severity do not justify it.
- Card type: enemy.
- Lane: Red.
- Test/battle stat: Grit.
- Difficulty: 3; severity 1; outer common; 1 graph reference.
- Timing: current Heat is on loss, while the text says defeating it broadcasts the hymn; branch ownership conflicts.
- Success: defeat and silencing note.
- Failure: unresolved.
- Reward: silencing note.
- Persistence: would require pending Scar state if approved.
- Wound handling: a routine Wound is possible but would be another generic Red combat loss.
- Scar interaction: direct routine Scar is disproportionate; exact trigger and authored Scar are unresolved.
- Salvage interaction: none.
- Equipment interaction: possible prevention only if converted to Wound.
- Movement interaction: none.
- Multiplayer interaction: owner-scoped unless the broadcast is deliberately shared.
- Typed runtime support: pending Scar exists, but this card’s trigger is not designed.
- Duplicate-source protection: would require exact source-event protection.
- Reconnect behavior: pending choice/consequence must persist.
- Cleanup/reset: unresolved.
- Final player-facing rule: unresolved.
- Severity: 4 provisional for a Scar, disproportionate to the base card.
- Implementation complexity: medium.
- Balance risk: high due to text/branch mismatch and routine direct-Scar risk.
- Approval status: BLOCKED.

### `lantern-moth-swarm`

- Current Heat behavior: former success `lose_heat 1` and failure `gain_heat 1`, retired in H2.
- Original gameplay intent: success prevents harm; failure is immediate fire exposure.
- Selected retirement model: remove success without replacement; failure becomes normal Wound pressure, implemented H2.
- Card type: hazard.
- Lane: Blue.
- Test/battle stat: Signal.
- Difficulty: 5; severity 1; outer common; 2 graph references.
- Timing: after final hazard result.
- Success: pass with no additional reward.
- Failure: suffer 1 preventable Wound.
- Reward: none.
- Persistence: only normal Wound/recall state.
- Wound handling: standard requested/prevented/actual pipeline.
- Scar interaction: only normal recall threshold.
- Salvage interaction: none.
- Equipment interaction: normal eligible Wound prevention.
- Movement interaction: none.
- Multiplayer interaction: owner-scoped.
- Typed runtime support: ready with existing `take_wound 1`; success branch deletion is content-only.
- Duplicate-source protection: existing threat resolution guard.
- Reconnect behavior: pending prevention persists; committed result cannot replay.
- Cleanup/reset: normal hazard close.
- Final player-facing rule: “If you fail, suffer 1 Wound.” Success has no additional effect.
- Severity: 2.
- Implementation complexity: low.
- Balance risk: low-medium; physical fiction is explicit and graph frequency is two.
- Approval status: APPROVED — IMPLEMENTED H2.

### `marrow-tax-auditors`

- Current Heat behavior: failed Guile test `gain_heat 2`, compatibility-only no-op.
- Original gameplay intent: repeated resource taxation.
- Selected retirement model: candidate floor-zero loss of 1 Salvage.
- Card type: hazard.
- Lane: Yellow.
- Test/battle stat: Guile.
- Difficulty: 7; severity 2; outer common; 4 graph references.
- Timing: after failed hazard result.
- Success: tariff-loophole note.
- Failure: candidate lose up to 1 Salvage.
- Reward: none.
- Persistence: none.
- Wound handling: none.
- Scar interaction: none.
- Salvage interaction: automatic floor-zero loss, not payment, if approved.
- Equipment interaction: none.
- Movement interaction: none.
- Multiplayer interaction: owner-only, but each seat can encounter the high-frequency card.
- Typed runtime support: existing `lose_salvage 1`.
- Duplicate-source protection: existing source guard.
- Reconnect behavior: actual delta cannot replay.
- Cleanup/reset: normal hazard close.
- Final player-facing rule: candidate “If you fail, lose up to 1 Salvage.”
- Severity: 2 provisional.
- Implementation complexity: low.
- Balance risk: medium-high because four graph references could compound shop starvation in an already tight economy.
- Approval status: BLOCKED.

### `memory-tax-gate`

- Current Heat behavior: failed Command test `gain_heat 2`, compatibility-only no-op.
- Original gameplay intent: a risk/reward choice paid with private memory or identity.
- Selected retirement model: player choice, unresolved.
- Card type: hazard.
- Lane: Yellow.
- Test/battle stat: Command.
- Difficulty: 8; severity 3; middle uncommon; 3 graph references.
- Timing: after failure, before the gate consequence closes.
- Success: harmless-memory note, unchanged.
- Failure: choice and alternatives are not approved.
- Reward: none.
- Persistence: any private note or delayed consequence would need owner persistence.
- Wound handling: possible choice arm only if proportional and preventability is explicit.
- Scar interaction: direct routine Scar is not recommended.
- Salvage interaction: a payment arm risks making one option always superior and misstates memory as money.
- Equipment interaction: none currently.
- Movement interaction: a gate refusal/retreat arm would need topology authority.
- Multiplayer interaction: private choice/details must not leak to TV or other seats.
- Typed runtime support: generic encounter payment exists, but private memory selection does not.
- Duplicate-source protection: a stable pending choice/source would be required.
- Reconnect behavior: prompt and private selection must reconstruct exactly.
- Cleanup/reset: unresolved.
- Final player-facing rule: unresolved.
- Severity: 3 provisional.
- Implementation complexity: high.
- Balance risk: high until two genuinely competitive choices and privacy rules exist.
- Approval status: BLOCKED.

### `mirror-rot-interference`

- Current Heat behavior: former successful Guile test `lose_heat 1`, removed in H1.
- Original gameplay intent: obsolete success-side recovery bookkeeping.
- Selected retirement model: remove without replacement, implemented H1.
- Card type: hazard.
- Lane: Blue.
- Test/battle stat: Guile.
- Difficulty: 11; severity 4; middle uncommon; 2 graph references.
- Timing: success branch is removed.
- Success: pass and avoid the existing Wound.
- Failure: existing 1 preventable Wound, unchanged.
- Reward: none.
- Persistence: none beyond existing Wound state.
- Wound handling: failure pipeline unchanged; success does not heal unrelated Wounds.
- Scar interaction: normal recall threshold only.
- Salvage interaction: none.
- Equipment interaction: normal Wound prevention on failure.
- Movement interaction: none.
- Multiplayer interaction: owner-scoped.
- Typed runtime support: content-only deletion.
- Duplicate-source protection: no new source.
- Reconnect behavior: no success-side state to reconstruct.
- Cleanup/reset: normal hazard close.
- Final player-facing rule: success has no additional effect; failure remains “Suffer 1 Wound.”
- Severity: 1 for the retirement rule; base card remains severity 4.
- Implementation complexity: very low.
- Balance risk: low; avoids adding a farmable heal.
- Approval status: APPROVED — IMPLEMENTED H1.

### `pale-contract-collector`

- Current Heat behavior: combat loss `gain_heat 2`, compatibility-only no-op.
- Original gameplay intent: resource pressure through debt collection.
- Selected retirement model: floor-zero Salvage loss.
- Card type: enemy.
- Lane: Yellow.
- Test/battle stat: Command.
- Difficulty: 8; severity 2; outer common; 2 graph references.
- Timing: immediately after authoritative combat loss.
- Success: defeat.
- Failure: lose up to 1 Salvage; continue at zero.
- Reward: 2 Trophies.
- Persistence: none.
- Wound handling: none.
- Scar interaction: none.
- Salvage interaction: automatic loss, not spend/payment; actual delta floors at zero.
- Equipment interaction: none.
- Movement interaction: none.
- Multiplayer interaction: owner-only; no transfer or target selection.
- Typed runtime support: ready with existing `lose_salvage 1`.
- Duplicate-source protection: authoritative encounter source prevents replay.
- Reconnect behavior: committed actual delta does not replay.
- Cleanup/reset: normal enemy-loss resolution.
- Final player-facing rule: “If you lose, lose up to 1 Salvage.”
- Severity: 2.
- Implementation complexity: low.
- Balance risk: medium; two graph references, bounded amount, meaningful trophy reward.
- Approval status: APPROVED.

### `relay-husk`

- Current Heat behavior: failed Guile test `gain_heat 1`, compatibility-only no-op.
- Original gameplay intent: Equipment pressure from false instructions.
- Selected retirement model: choose one eligible exact Equipment instance to disable temporarily, unresolved.
- Card type: hazard.
- Lane: Yellow.
- Test/battle stat: Guile.
- Difficulty: 6; severity 2; outer common; 1 graph reference.
- Timing: after failed hazard result.
- Success: gain Marshal Seal, unchanged.
- Failure: target eligibility, no-item fallback, and duration unresolved.
- Reward: success-side Equipment.
- Persistence: exact-instance disabled state if approved.
- Wound handling: none proposed.
- Scar interaction: none.
- Salvage interaction: none.
- Equipment interaction: must distinguish equipped/held, slot, Artifact/normal gear, duplicate instances, and owner choice.
- Movement interaction: none.
- Multiplayer interaction: owner chooses only their own eligible item; private inventory details stay private.
- Typed runtime support: exact-instance ownership exists, but generic timed disable does not.
- Duplicate-source protection: source event plus instance ID required.
- Reconnect behavior: disabled instance and remaining duration must persist.
- Cleanup/reset: exact owner-turn or resolution count not selected.
- Final player-facing rule: unresolved.
- Severity: 2 provisional.
- Implementation complexity: high.
- Balance risk: medium-high; no-item players could trivialize it and a broad disable could hit Artifacts disproportionately.
- Approval status: BLOCKED.

### `signal-rotted-engineer`

- Current Heat behavior: combat loss `gain_heat 1`, compatibility-only no-op.
- Original gameplay intent: Equipment interference; the battle already suppresses Weapon bonus and the auxiliary failure key only records exposed gear.
- Selected retirement model: exact-instance Weapon pressure, unresolved.
- Card type: enemy.
- Lane: Yellow.
- Test/battle stat: Forge.
- Difficulty: 4; severity 2; outer common; 2 graph references.
- Timing: current combat suppression is immediate; the Heat branch is on loss.
- Success: defeat.
- Failure: duration and whether the weapon is disabled, discarded, or merely remains suppressed are unresolved.
- Reward: tool-rig note.
- Persistence: possible exact-instance disable.
- Wound handling: none proposed.
- Scar interaction: none.
- Salvage interaction: none.
- Equipment interaction: permanent discard is excessive; repeating current battle suppression adds no consequence after the loss.
- Movement interaction: none.
- Multiplayer interaction: owner-only inventory.
- Typed runtime support: battle-scoped slot suppression exists; post-battle exact-instance suppression does not.
- Duplicate-source protection: source event plus instance ID required for persistence.
- Reconnect behavior: any disable must serialize and project.
- Cleanup/reset: unresolved.
- Final player-facing rule: unresolved.
- Severity: 2 provisional.
- Implementation complexity: medium-high.
- Balance risk: medium; targetless players and duplicate Equipment need explicit behavior.
- Approval status: BLOCKED.

### `siren-relay-echo`

- Current Heat behavior: success `lose_heat 1`; failure `gain_heat 2`; both compatibility-only no-ops.
- Original gameplay intent: paired temporary Command reinforcement/interference.
- Selected retirement model: owner’s next eligible non-battle Command test gets `+1` on success or `-1` on failure, candidate only.
- Card type: hazard.
- Lane: Yellow.
- Test/battle stat: Command.
- Difficulty: 6; severity 2; outer common; 3 graph references.
- Timing: create after final result; consume after the next eligible Command test and its reroll window.
- Success: candidate `+1` next Command test.
- Failure: candidate `-1` next Command test.
- Reward: none.
- Persistence: one owner-scoped pending modifier.
- Wound handling: none.
- Scar interaction: Scar-triggered tests need an explicit inclusion/exclusion decision.
- Salvage interaction: none.
- Equipment interaction: modifier ordering with Equipment and temporary boosts is unresolved.
- Movement interaction: exclude movement tests unless explicitly typed as eligible.
- Multiplayer interaction: owner-only; public result may show source without private alternatives.
- Typed runtime support: Glass-Chime proves a negative generic next-test lifecycle, but current schema is source-locked and has no positive/stat-specific variant.
- Duplicate-source protection: source resolution ID required; refresh/replace/queue precedence unresolved.
- Reconnect behavior: modifier must persist and consume once.
- Cleanup/reset: recall/replacement clearing and same-source overwrite rule unresolved.
- Final player-facing rule: candidate wording above, not approved.
- Severity: 2 provisional.
- Implementation complexity: medium.
- Balance risk: medium; a success bonus may be farmed and modifier precedence is unsettled.
- Approval status: BLOCKED.

### `soot-stained-cutpurse`

- Current Heat behavior: combat loss `gain_heat 1`, compatibility-only no-op.
- Original gameplay intent: minor resource theft.
- Selected retirement model: floor-zero Salvage loss.
- Card type: enemy.
- Lane: Yellow.
- Test/battle stat: Guile.
- Difficulty: 3; severity 1; outer common; 2 graph references.
- Timing: immediately after authoritative combat loss.
- Success: defeat.
- Failure: lose up to 1 Salvage; continue at zero.
- Reward: market-rumor note.
- Persistence: none.
- Wound handling: none.
- Scar interaction: none.
- Salvage interaction: automatic loss, not spend/payment; actual delta floors at zero.
- Equipment interaction: none.
- Movement interaction: none.
- Multiplayer interaction: owner-only; no transfer or target selection.
- Typed runtime support: ready with existing `lose_salvage 1`.
- Duplicate-source protection: authoritative encounter source prevents replay.
- Reconnect behavior: committed actual delta does not replay.
- Cleanup/reset: normal enemy-loss resolution.
- Final player-facing rule: “If you lose, lose up to 1 Salvage.”
- Severity: 1.
- Implementation complexity: low.
- Balance risk: low-medium; amount is bounded and the fiction is direct theft.
- Approval status: APPROVED.

### `webglass-snarefield`

- Current Heat behavior: former successful Guile test `lose_heat 1`, removed in H1.
- Original gameplay intent: obsolete success-side recovery bookkeeping.
- Selected retirement model: remove without replacement, implemented H1.
- Card type: hazard.
- Lane: Blue.
- Test/battle stat: Guile.
- Difficulty: 9; severity 3; middle uncommon; 3 graph references.
- Timing: success branch is removed.
- Success: pass and avoid the existing Wound.
- Failure: existing 1 preventable Wound, unchanged.
- Reward: none.
- Persistence: none beyond existing Wound state.
- Wound handling: failure pipeline unchanged; success does not heal unrelated Wounds.
- Scar interaction: normal recall threshold only.
- Salvage interaction: none.
- Equipment interaction: normal Wound prevention on failure.
- Movement interaction: none; no prose route restriction.
- Multiplayer interaction: owner-scoped.
- Typed runtime support: content-only deletion.
- Duplicate-source protection: no new source.
- Reconnect behavior: no success-side state to reconstruct.
- Cleanup/reset: normal hazard close.
- Final player-facing rule: success has no additional effect; failure remains “Suffer 1 Wound.”
- Severity: 1 for the retirement rule; base card remains severity 3.
- Implementation complexity: very low.
- Balance risk: low; avoids adding a farmable heal.
- Approval status: APPROVED — IMPLEMENTED H1.

## Four-seat critique

| ID | New player | Optimizer | Family/casual | Rules lawyer |
|---|---|---|---|---|
| `ashen-doppelganger` | Two Wounds is clear but abrupt | Can jump directly to recall | Fast but punishing | Prevention and threshold work; amount still unapproved |
| `choir-static-burst` | One Wound is immediate | No benefit loop; prevention remains valuable | One familiar consequence | Owner, final failure, actual delta, and recall are defined |
| `cinder-gate-backlash` | Passing simply avoids harm | No farmable success reward | Fastest resolution | No success state, reset, or replay question |
| `crown-bell-baron` | “Lose up to 1” is legible | Zero Salvage nullifies loss but grants nothing | Quick and thematic | Loss is not payment; floors at zero; owner only |
| `false-route-procession` | Direction is currently unknowable | Route value depends on endpoint | Could be fun once destination is clear | Topology, fallback, and reconnect target are unresolved |
| `gateblind-pulse` | Shared escalation is understandable | Threshold timing may be manipulated | Fast but table-wide | Cap and source threshold ordering remain unresolved |
| `hymn-scarred-zealot` | Scar would feel disproportionate | Branch mismatch can be exploited | Lasting state is too heavy for this small enemy | Loss versus defeat trigger is contradictory |
| `lantern-moth-swarm` | Pass safe / fail 1 Wound | Cannot farm a heal | One clear physical consequence | Standard prevention, recall, and dedup rules apply |
| `marrow-tax-auditors` | Salvage tax is clear | Zero balance nullifies it | Repeated losses may feel mean | Semantics are defined; frequency balance is not |
| `memory-tax-gate` | No approved choice to explain | One arm may dominate | Private-memory bookkeeping risks drag | Ownership, privacy, resolution, and reset are unresolved |
| `mirror-rot-interference` | Passing avoids the Wound | No repeatable healing loop | Fast | Existing failure lifecycle is unchanged |
| `pale-contract-collector` | Debt means Salvage loss | Trophy reward still requires victory | Quick and thematic | Automatic loss, not payment; owner only |
| `relay-husk` | “Which item and for how long?” is unanswered | No-item loadouts could trivialize it | Inventory choice may slow play | Exact instance, fallback, projection, and reset missing |
| `signal-rotted-engineer` | Weapon suppression already reads clearly | Post-loss penalty could double-dip | Extra item state risks bookkeeping | Immediate versus persistent suppression unresolved |
| `siren-relay-echo` | Paired `+1/-1` is learnable | Success could be farmed or overwritten | One token is manageable | Eligibility, precedence, stacking, recall clear are unresolved |
| `soot-stained-cutpurse` | Theft maps directly to 1 Salvage | Zero balance is safe, not profitable | Fast and familiar | Owner-only floor-zero actual delta is defined |
| `webglass-snarefield` | Passing avoids the Wound | No repeatable healing loop | Fast | Existing failure lifecycle is unchanged |

## Distribution impact

Counts below are unique cards, not individual branches. “Approved proposal” includes unchanged active effects on the same 17 cards and excludes blocked candidates.

| Effect family | Current 17 | Approved proposal | Notes |
|---|---:|---:|---|
| Wound effects | 5 | 5 | Cinder/Mirror/Webglass plus implemented Choir/Lantern |
| Scar effects | 0 | 0 | Zealot and Doppelganger direct-Scar routes remain blocked |
| Salvage pressure | 0 | 3 | Baron, Collector, Cutpurse; all floor-zero owner losses |
| Equipment effects | 1 | 1 | Engineer’s existing battle Weapon suppression only; no new persistent disable |
| Movement effects | 0 | 0 | False-Route remains blocked |
| Temporary modifiers | 0 | 0 | Siren remains blocked |
| Persistent effects | 0 | 0 | none approved |
| Player-choice cards | 0 | 0 | Memory Tax remains blocked |
| Multiplayer effects | 0 | 0 | no approved group-wide effect |
| Global Escalation | 0 | 0 | Gateblind remains blocked |
| Removal without replacement | 3 | 3 | Cinder, Mirror-Rot, Webglass success branches implemented in H1 |

Approved severity distribution is severity 1: four cards (`cinder-gate-backlash`, `mirror-rot-interference`, `soot-stained-cutpurse`, `webglass-snarefield`); severity 2: four cards (`choir-static-burst`, `crown-bell-baron`, `lantern-moth-swarm`, `pale-contract-collector`); severity 3–5: none. Blocked provisional candidates span severity 2 (five), 3 (two), and 4 (two).

Lane impact is deliberately conservative: Blue approves five of seven cards and blocks two; Yellow approves three of nine and blocks six; Red’s only card remains blocked. No stable ID, lane, role, difficulty, graph placement, art reference, or card total changes in this report.

## Approval boundary

This report authorizes only the three groups in `reports/heat-retirement-implementation-plan.md`. Approval does not itself change gameplay. Blocked cards must receive a later exact rule approval; they may not be folded into a convenient implementation batch. The +116-card expansion remains unapproved, and no exact Relic-frequency parity is claimed.
