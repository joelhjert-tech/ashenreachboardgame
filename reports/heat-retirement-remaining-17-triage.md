# Remaining 17 Heat-linked Threat retirement triage

Status: Groups H1 through H7B are implemented. H8A approves `marrow-tax-auditors` for a later implementation pass. One ID remains blocked.

## Decision summary

The two existing Heat audits and current canonical Threat content reconcile to exactly **17 unique stable IDs**. Fifteen IDs are **APPROVED AND IMPLEMENTED** across H1 through H7B. H8A makes one further ID **APPROVED, NOT IMPLEMENTED** after resolving its economy-frequency boundary. One remains **BLOCKED** because its private-choice ownership, persistence, and reset contract is unresolved.

- Approved and implemented: 15
- Approved, not implemented: 1
- Blocked: 1
- Approved retirement models: remove without replacement (3), normal Wound pressure (4), floor-zero Salvage pressure (4; three implemented and one approved for H8B), exact-instance Equipment suppression (2), stat-specific temporary modifier (1), owner-choice forced displacement (1), guarded shared escalation (1)
- Player-facing Heat remains obsolete. Every still-active Heat branch below is parsed only for compatibility and resolves as a no-op with a “no additional status change” summary.
- Canonical Threats do not define an activation-number field. Every record therefore reports `N/A`; difficulty and canonical graph frequency are recorded separately and are not relabelled as activation.
- The 17-card population is Red 1 / Blue 7 / Yellow 9. Card totals remain Red 26 / Blue 35 / Yellow 48 / overall 109.

## Canonical inventory

| Stable ID | Display name | Lane / type | Activation | Stat / difficulty | Current success | Current failure | Reward | Exact Heat branch | Runtime state | Source | Closest overlaps |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `ashen-doppelganger` | Ashen Doppelganger | Blue / enemy | N/A | Guile 11 | Defeat | 2 preventable Wounds on loss | automatic 3 Trophy points and 3-value pile entry, then authored `gain_trophy 3`; 6 points total | retired H5B `woundOnLoss` | implemented atomic normal Wound request | `content/cards/threats/ashen-doppelganger.json` | `mirror-lord-envoy`, `glass-mire-stalker`, `mirror-rot-interference` |
| `choir-static-burst` | Choir-Static Burst | Blue / hazard | N/A | Signal 9 | scenario progress `choirStaticContained +1` | 1 preventable Wound | none | retired H2 `failEffect` | implemented normal Wound | `content/cards/threats/choir-static-burst.json` | `gateblind-pulse`, `rift-whispers`, `webglass-echo-trap` |
| `cinder-gate-backlash` | Cinder Gate Backlash | Blue / hazard | N/A | Signal 12 | no additional effect | 2 Wounds | none | retired H1 `successEffect` | implemented removal; failure remains active | `content/cards/threats/cinder-gate-backlash.json` | `gateblind-pulse`, `emberwatch-sparkfall`, `spindle-static-squall` |
| `crown-bell-baron` | Crown-Bell Baron | Yellow / enemy | N/A | Command 7 | Defeat | lose up to 1 Salvage on loss | route-fee fraud note | `woundOnLoss` | implemented floor-zero automatic loss | `content/cards/threats/crown-bell-baron.json` | `pale-toll-enforcer`, `bridge-toll-runt`, `pale-contract-collector` |
| `false-route-procession` | False-Route Procession | Yellow / hazard | N/A | Command 7 | false-road note | owner-selected distance-1 same-ring forced displacement | none | retired H6B `failEffect` | implemented typed owner choice into normal forced displacement | `content/cards/threats/false-route-procession.json` | `memory-tax-gate`, `route-splice`, `siren-relay-echo` |
| `gateblind-pulse` | Gateblind Pulse | Blue / hazard | N/A | Signal 10 | scenario progress `gateblindPulsesRead +1` | guarded Global Escalation +1 below one-before-collapse | none | retired H7B `failEffect` | implemented typed guarded escalation | `content/cards/threats/gateblind-pulse.json` | `choir-static-burst`, `cinder-gate-backlash`, `saint-of-ashes-echo` |
| `hymn-scarred-zealot` | Hymn-Scarred Zealot | Red / enemy | N/A | Grit 3 | Defeat | 1 preventable Wound on loss | automatic 1 Trophy point and 1-value pile entry; authored silencing note | retired H5B `woundOnLoss` | implemented normal Wound request | `content/cards/threats/hymn-scarred-zealot.json` | `lantern-ash-ghoul`, `moth-carrier-husk`, `ash-cinder-runt` |
| `lantern-moth-swarm` | Lantern-Moth Swarm | Blue / hazard | N/A | Signal 5 | no additional effect | 1 preventable Wound | none | retired H2 success and failure | implemented removal plus normal Wound | `content/cards/threats/lantern-moth-swarm.json` | `glass-chime-swarm`, `spindle-static-squall`, `roadside-bone-oracle` |
| `marrow-tax-auditors` | Marrow-Tax Auditors | Yellow / hazard | N/A | Guile 7 | tariff-loophole note | `gain_heat 2` | none | `failEffect` | compatibility-only no-op | `content/cards/threats/marrow-tax-auditors.json` | `locked-vault`, `false-route-procession`, `wireghost-key` |
| `memory-tax-gate` | Memory Tax Gate | Yellow / hazard | N/A | Command 8 | harmless-memory note | `gain_heat 2` | none | `failEffect` | compatibility-only no-op | `content/cards/threats/memory-tax-gate.json` | `false-route-procession`, `route-splice`, `crown-bell-baron` |
| `mirror-rot-interference` | Mirror-Rot Interference | Blue / hazard | N/A | Guile 11 | no additional effect | 1 Wound | none | retired H1 `successEffect` | implemented removal; failure remains active | `content/cards/threats/mirror-rot-interference.json` | `webglass-snarefield`, `bellwire-snare`, `webglass-echo-trap` |
| `pale-contract-collector` | Pale Contract Collector | Yellow / enemy | N/A | Command 8 | Defeat | lose up to 1 Salvage on loss | 2 Trophies | `woundOnLoss` | implemented floor-zero automatic loss | `content/cards/threats/pale-contract-collector.json` | `crown-bell-baron`, `pale-toll-enforcer`, `ash-court-duelist` |
| `relay-husk` | Relay Husk | Yellow / hazard | N/A | Guile 6 | gain Marshal Seal | suppress exact equipped normal Equipment through next owner Threat | none | `failEffect` | implemented typed H4B suppression | `content/cards/threats/relay-husk.json` | `wireghost-key`, `pale-cartel-shakedown`, `signal-rotted-engineer` |
| `signal-rotted-engineer` | Signal-Rotted Engineer | Yellow / enemy | N/A | Forge 4 | Defeat | suppress exact equipped normal Equipment during next owner battle | tool-rig note | `woundOnLoss` | implemented typed H4B suppression; current combat still disables Weapon bonus | `content/cards/threats/signal-rotted-engineer.json` | `rust-mote-drone`, `wire-chewer-pack`, `relay-husk` |
| `siren-relay-echo` | Siren Relay Echo | Yellow / hazard | N/A | Command 6 | next non-battle Command test `+1` | next non-battle Command test `-1` | none | `successEffect`, `failEffect` | implemented typed H4C replacement modifier | `content/cards/threats/siren-relay-echo.json` | `false-route-procession`, `memory-tax-gate`, `relay-husk` |
| `soot-stained-cutpurse` | Soot-Stained Cutpurse | Yellow / enemy | N/A | Guile 3 | Defeat | lose up to 1 Salvage on loss | market-rumor note | `woundOnLoss` | implemented floor-zero automatic loss | `content/cards/threats/soot-stained-cutpurse.json` | `toll-scrip-urchins`, `scrap-toll-gangers`, `bridge-toll-runt` |
| `webglass-snarefield` | Webglass Snarefield | Blue / hazard | N/A | Guile 9 | no additional effect | 1 Wound | none | retired H1 `successEffect` | implemented removal; failure remains active | `content/cards/threats/webglass-snarefield.json` | `mirror-rot-interference`, `bellwire-snare`, `starless-taxation` |

Canonical graph references, used only as a frequency warning, are respectively 3, 4, 3, 1, 5, 3, 1, 2, 4, 3, 2, 2, 1, 2, 3, 2, and 3. These counts are not activation numbers or draw probabilities.

## Retirement model conclusions

| ID | Original intent | Selected model | Runtime readiness | Severity | Status |
|---|---|---|---|---:|---|
| `ashen-doppelganger` | severe lasting mirrored injury | 2 preventable Wounds on combat loss | implemented H5B normal Wound pipeline | 4 | APPROVED H5A — IMPLEMENTED H5B |
| `choir-static-burst` | accumulating attrition from violent signal feedback | normal Wound pressure: 1 preventable Wound | implemented H2 | 2 | APPROVED — IMPLEMENTED H2 |
| `cinder-gate-backlash` | obsolete success-side recovery bookkeeping | remove success branch without replacement | implemented H1 | 1 | APPROVED — IMPLEMENTED H1 |
| `crown-bell-baron` | resource pressure through extortion | lose up to 1 Salvage | implemented H3 | 2 | APPROVED — IMPLEMENTED H3 |
| `false-route-procession` | owner-selected bad route | choose one server-generated legal clockwise/counterclockwise adjacent destination on the current ring | implemented H6B narrow persisted choice plus existing displacement reaction/arrival | 2 | APPROVED H6A — IMPLEMENTED H6B |
| `gateblind-pulse` | shared gate/scenario pressure | conditional Global Escalation +1 only while at least two below collapse | implemented H7B narrow typed/source extension | 3 | APPROVED H7A — IMPLEMENTED H7B |
| `hymn-scarred-zealot` | ordinary physical loss; defeat silences the hymn | 1 preventable Wound on combat loss | implemented H5B normal Wound pipeline | 2 | APPROVED H5A — IMPLEMENTED H5B |
| `lantern-moth-swarm` | risk/reward prevention plus immediate fire injury | remove success branch; failure becomes 1 preventable Wound | implemented H2 | 2 | APPROVED — IMPLEMENTED H2 |
| `marrow-tax-auditors` | repeated resource taxation | lose up to 1 Salvage | approved for the existing floor-zero resolver; implementation deferred to H8B | 2 | APPROVED H8A — NOT IMPLEMENTED |
| `memory-tax-gate` | risk/reward choice paid with private memory | player-choice/private-note lifecycle | requires new lifecycle | 3 provisional | BLOCKED |
| `mirror-rot-interference` | obsolete success-side recovery bookkeeping | remove success branch without replacement | implemented H1 | 1 | APPROVED — IMPLEMENTED H1 |
| `pale-contract-collector` | resource pressure through debt collection | lose up to 1 Salvage | implemented H3 | 2 | APPROVED — IMPLEMENTED H3 |
| `relay-husk` | Equipment pressure from false instructions | suppress chosen exact equipped normal Equipment through next owner Threat | implemented typed H4B lifecycle | 2 | APPROVED — IMPLEMENTED H4B |
| `signal-rotted-engineer` | Equipment interference | suppress chosen exact equipped normal Equipment during next owner battle | implemented typed H4B lifecycle | 2 | APPROVED — IMPLEMENTED H4B |
| `siren-relay-echo` | paired temporary Command interference | next non-battle Command test gets `+1` on success or `-1` on failure | implemented typed H4C lifecycle | 2 | APPROVED — IMPLEMENTED H4C |
| `soot-stained-cutpurse` | minor resource theft | lose up to 1 Salvage | implemented H3 | 1 | APPROVED — IMPLEMENTED H3 |
| `webglass-snarefield` | obsolete success-side recovery bookkeeping | remove success branch without replacement | implemented H1 | 1 | APPROVED — IMPLEMENTED H1 |

No approved card grants a direct Scar, destroys Equipment, or creates a sector-persistent object. H7B implements one conditional shared escalation effect that may raise difficulty but cannot itself reach collapse. H6B implements one bounded same-ring forced displacement with an owner-private destination choice; it cannot cross rings or enter center. H4A authorizes two bounded owner-private exact-instance choices; those choices suppress owned state temporarily and never delete or transfer it.

### Per-ID model screen

Codes: A remove; B temporary owner modifier; C normal Wound; D conditional Scar; E Global Escalation; F Salvage/resource; G Equipment; H movement; I persistent sector pressure; J player choice. `SELECT` is the approved model, `CANDIDATE` is the blocked preferred direction, `POSSIBLE` is a secondary direction that still lacks justification, and `NO` is rejected for theme, severity, duplication, or lifecycle fit.

| ID | A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|---|
| `ashen-doppelganger` | NO | NO | SELECT | NO | NO | NO | NO | NO | NO | NO |
| `choir-static-burst` | NO | POSSIBLE | SELECT | NO | NO | NO | NO | NO | NO | NO |
| `cinder-gate-backlash` | SELECT | NO | NO; failure already owns 2 | NO | NO | NO | NO | NO | NO | NO |
| `crown-bell-baron` | NO | NO | NO | NO | NO | SELECT | NO | NO | NO | POSSIBLE but unnecessary |
| `false-route-procession` | NO | NO; duplicates Spindle | NO | NO | NO | NO | NO | SELECT | NO | SELECT for destination |
| `gateblind-pulse` | NO | POSSIBLE | NO | NO | SELECT | NO | NO | NO | NO | NO |
| `hymn-scarred-zealot` | NO | NO | SELECT | NO | NO | NO | NO | NO | NO | NO |
| `lantern-moth-swarm` | SELECT on success | NO | SELECT on failure | NO | NO | NO | NO | NO | NO | NO |
| `marrow-tax-auditors` | NO | NO | NO | NO | NO | SELECT | NO | NO | NO | NO; unnecessary |
| `memory-tax-gate` | NO | NO | NO | NO | NO | NO | NO | POSSIBLE | POSSIBLE | CANDIDATE |
| `mirror-rot-interference` | SELECT on success | NO | existing failure only | NO | NO | NO | NO | NO | NO | NO |
| `pale-contract-collector` | NO | NO | NO | NO | NO | SELECT | NO | NO | NO | POSSIBLE but unnecessary |
| `relay-husk` | NO | NO | NO | NO | NO | NO | SELECT | NO | NO | SELECT for exact target |
| `signal-rotted-engineer` | NO | NO | NO | NO | NO | NO | SELECT | NO | NO | SELECT for exact target |
| `siren-relay-echo` | NO | SELECT | NO | NO | NO | NO | NO | NO | NO | NO |
| `soot-stained-cutpurse` | NO | NO | NO | NO | NO | SELECT | NO | NO | NO | POSSIBLE but unnecessary |
| `webglass-snarefield` | SELECT on success | NO | existing failure only | NO | NO | NO | NO | NO | NO | NO |

The screen deliberately rejects automatic Scar, Global Escalation, and generic one-Wound substitutions where card fiction or severity does not support them. It also prevents the approved set from repeating Glass-Chime’s next-test penalty, Spindle’s movement-roll penalty, the two same-ring displacement cards, or Shattered Barricade’s escalation rule.

## Exact approval blocks

### `ashen-doppelganger`

- Current Heat behavior: retired in H5B; former combat loss `gain_heat 2` was a compatibility-only no-op.
- Original gameplay intent: severe lasting injury from a rare inner mirrored enemy.
- Selected retirement model: 2 preventable Wounds, approved in H5A and implemented in H5B.
- Card type: enemy.
- Lane: Blue.
- Test/battle stat: Guile.
- Difficulty: 11; severity 4; inner uncommon; 3 graph references.
- Timing: after authoritative combat loss.
- Success: defeat, automatically gain 3 Trophy points and a 3-value Trophy Pile entry, then resolve the authored `gain_trophy 3` reward.
- Failure: one atomic `take_wound 2` request.
- Reward: 6 Trophy points in current runtime plus a 3-value Trophy Pile entry. The automatic and authored awards are preserved here and flagged for separate balance review.
- Persistence: none beyond normal Wound/recall state.
- Wound handling: one normal prevention/reaction pass, requested/prevented/actual Wound processing, then the normal recall threshold check.
- Scar interaction: only the normal recall/Scar lifecycle; no direct card Scar.
- Salvage interaction: none.
- Equipment interaction: normal prevention only.
- Movement interaction: none.
- Multiplayer interaction: owner-scoped; any recall or all-players-recalled defeat comes only from existing lifecycle rules.
- Typed runtime support: existing Wound pipeline.
- Duplicate-source protection: existing encounter source/result guard required.
- Reconnect behavior: pending prevention and committed Wounds must persist exactly once.
- Cleanup/reset: normal resolution close; Wounds persist normally.
- Final player-facing rule: “If you lose this battle, suffer 2 Wounds.”
- Severity: 4, potentially recall-causing.
- Implementation complexity: low code / high balance.
- Balance risk: high; H5A explicitly accepts the jump from a no-op and three graph references amplify it.
- Approval status: APPROVED H5A — IMPLEMENTED H5B.

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
- Approval status: APPROVED — IMPLEMENTED H3.

### `false-route-procession`

- Current Heat behavior: failed Command test `gain_heat 2`, compatibility-only no-op.
- Original gameplay intent: navigation control loss through a tempting false route.
- Selected retirement model: owner chooses one server-generated legal clockwise/counterclockwise adjacent destination on the operative's current ring.
- Card type: hazard.
- Lane: Yellow.
- Test/battle stat: Command.
- Difficulty: 7; severity 2; outer common; 5 graph references.
- Timing: after the final authoritative failed hazard result; candidates persist for owner choice, then the selected destination locks before the existing forced-displacement reaction opens.
- Success: false-road note, unchanged.
- Failure: forced displacement exactly 1 sector to one chosen legal same-ring neighbor.
- Reward: none.
- Persistence: one owner-private pending candidate record until selection, then one existing pending displacement/reaction record until prevented or resolved; public-safe waits at both stages.
- Wound handling: none; zero candidates means remain in place without a replacement penalty.
- Scar interaction: none.
- Salvage interaction: none.
- Equipment interaction: Rift Anchor Spike may prevent the whole forced displacement after the owner selects and locks a candidate; no other untyped item window.
- Movement interaction: canonical same-ring `+1/-1` neighbors only; movement-step legality omits blocked candidates without skipping; no allowance, roll, reroll, cross-ring edge, center entry, or voluntary movement progress.
- Multiplayer interaction: the acting operative's owner chooses in every mode; no rival or timeout fallback.
- Typed runtime support: implemented narrow persisted destination-choice extension; existing ring helper, legality predicate, reaction, arrival, and resolved-source systems are reused.
- Duplicate-source protection: one source event creates one candidate set, choice, displacement, arrival, and completion; stale/duplicate/wrong-seat submissions reject.
- Reconnect behavior: source and ordered candidates persist before selection; chosen destination/reaction, arrival, and completion state persist afterward without replay.
- Cleanup/reset: selection locks one destination and opens reaction; prevention closes the whole consequence; acceptance moves once and schedules one arrival; zero candidates closes in place.
- Final player-facing rule: “If you lose, move 1 sector clockwise or counterclockwise on your current ring. Choose from the legal destinations. If only one is legal, move there. If neither is legal, remain in place.”
- Severity: 2.
- Implementation complexity: medium-high code / low player resolution.
- Balance risk: medium; five references and occasionally beneficial redirection are bounded by one same-ring edge, owner choice, Rift Anchor, and no movement-linked Contract credit.
- Approval status: APPROVED H6A — IMPLEMENTED H6B.

### `gateblind-pulse`

- Current Heat behavior: failed Signal test `gain_heat 2`, compatibility-only no-op.
- Original gameplay intent: shared scenario/gate pressure.
- Selected retirement model: conditional Global Escalation +1 while the pre-effect value is at least two below the mode collapse level.
- Card type: hazard.
- Lane: Blue.
- Test/battle stat: Signal.
- Difficulty: 10; severity 4; inner uncommon; 3 graph references.
- Timing: after failed hazard result.
- Success: advance `gateblindPulsesRead` by 1, unchanged.
- Failure: request Global Escalation +1 at multiplayer 0–4 or solo 0–6; at multiplayer 5 or solo 7, request 0 and apply no substitute penalty.
- Reward: success-side scenario leverage.
- Persistence: shared escalation track when the condition passes.
- Wound handling: none proposed.
- Scar interaction: none proposed.
- Salvage interaction: none.
- Equipment interaction: none.
- Movement interaction: fiction implies navigation, but no map legality changes are proposed.
- Multiplayer interaction: one public shared increment regardless of player count; cannot move 5 to the multiplayer collapse value 6.
- Typed runtime support: existing escalation action/reducer/projection plus narrow Gateblind conditional/source authority; no shared pending state.
- Duplicate-source protection: record one authoritative failure source even when the guard yields 0.
- Reconnect behavior: committed value and completed source persist; the condition is not re-evaluated.
- Cleanup/reset: normal escalation lifecycle; Gateblind cannot create collapse.
- Final player-facing rule: “On failure, if Global Escalation is not already one step from collapse, advance Global Escalation by 1.”
- Severity: 3.
- Implementation complexity: low code / medium systems.
- Balance risk: medium; three references raise shared difficulty, bounded by a one-before-collapse guard and no per-player multiplication.
- Approval status: APPROVED H7A — IMPLEMENTED H7B. Exact implementation, cap, threshold, source, ability, and reconnect evidence is in `reports/heat-retirement-h7b-gateblind-pulse-implementation.md`.

### `hymn-scarred-zealot`

- Current Heat behavior: retired in H5B; former combat loss `gain_heat 1` was a compatibility-only no-op.
- Original gameplay intent: ordinary physical combat pressure; defeating the Zealot silences the hymn.
- Selected retirement model: 1 preventable Wound on combat loss, approved in H5A and implemented in H5B.
- Card type: enemy.
- Lane: Red.
- Test/battle stat: Grit.
- Difficulty: 3; severity 1; outer common; 1 graph reference.
- Timing: after authoritative combat loss; success retains the silencing note.
- Success: defeat and silencing note.
- Failure: `take_wound 1`.
- Reward: automatic 1 Trophy point plus a 1-value Trophy Pile entry; authored reward remains the silencing note.
- Persistence: none beyond normal Wound/recall state.
- Wound handling: normal prevention/reaction, requested/prevented/actual delta, and threshold processing.
- Scar interaction: only the normal recall/Scar lifecycle; direct, conditional, exceptional, or named card Scars are rejected.
- Salvage interaction: none.
- Equipment interaction: normal prevention only.
- Movement interaction: none.
- Multiplayer interaction: owner-scoped; no shared hymn state or Global Escalation.
- Typed runtime support: existing Wound pipeline.
- Duplicate-source protection: existing encounter source/result guard required.
- Reconnect behavior: pending prevention and committed Wounds must persist exactly once.
- Cleanup/reset: normal resolution close; Wounds persist normally.
- Final player-facing rule: “If you lose this battle, suffer 1 Wound.”
- Severity: 2 for the retirement rule; base card remains severity 1.
- Implementation complexity: low.
- Balance risk: moderate; a no-op becomes attrition, but the card has one graph reference and matches common peers.
- Approval status: APPROVED H5A — IMPLEMENTED H5B.

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
- Selected retirement model: automatic floor-zero loss of up to 1 Salvage, approved in H8A.
- Card type: hazard.
- Lane: Yellow.
- Test/battle stat: Guile.
- Difficulty: 7; severity 2; outer common; 4 graph references.
- Timing: after failed hazard result.
- Success: tariff-loophole note.
- Failure: lose up to 1 Salvage.
- Reward: none.
- Persistence: none.
- Wound handling: none.
- Scar interaction: none.
- Salvage interaction: one automatic loss request; actual loss is `min(current Salvage, 1)`. This is not a payment, purchase, sale, or voluntary spend.
- Equipment interaction: none.
- Movement interaction: none.
- Multiplayer interaction: owner-only. The finite local decks contain at most four copies table-wide and do not reshuffle; likely realized table loss remains 0–1 in solo through three-player play and 0–2 at four players, with higher totals unusual.
- Typed runtime support: existing `lose_salvage 1`.
- Duplicate-source protection: existing source guard.
- Reconnect behavior: actual delta cannot replay.
- Cleanup/reset: normal hazard close.
- Final player-facing rule: “On failure, lose up to 1 Salvage.”
- Severity: 2.
- Implementation complexity: low.
- Balance risk: medium. One loss delays a modal 3-Salvage Equipment purchase but cannot create debt or a fallback; finite non-reshuffling local decks bound repeat attrition.
- Approval status: APPROVED H8A — NOT IMPLEMENTED. Exact economy, frequency, isolation, and test evidence is in `reports/heat-retirement-h8a-marrow-tax-approval.md`.

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
- Approval status: APPROVED — IMPLEMENTED H3.

### `relay-husk`

- Current Heat behavior: failed Guile test `gain_heat 1`, compatibility-only no-op.
- Original gameplay intent: Equipment pressure from false instructions.
- Selected retirement model: choose one eligible exact Equipment instance and suppress it through the owner's next Threat resolution.
- Card type: hazard.
- Lane: Yellow.
- Test/battle stat: Guile.
- Difficulty: 6; severity 2; outer common; 1 graph reference.
- Timing: after failed hazard result.
- Success: gain Marshal Seal, unchanged.
- Failure: server opens a mandatory private exact-instance choice after the final failed result; no eligible target means no additional effect.
- Reward: success-side Equipment.
- Persistence: exact-instance owner state with typed `nextOwnerThreatResolved` expiry; Relay Husk itself does not count.
- Wound handling: none proposed.
- Scar interaction: none.
- Salvage interaction: none.
- Equipment interaction: currently equipped, non-QA, meaningful-effect `starter`/`standard`/`advanced` Equipment only; Artifacts, carried items, consumables, depleted charged items, and inert items are excluded. Suppression blocks every contribution but preserves owned state.
- Movement interaction: none.
- Multiplayer interaction: owner chooses only their own eligible item; private inventory details stay private.
- Typed runtime support: later implementation must add exact equipped-instance identity, pending private choice, generic suppression state/gates, and typed expiry; current catalog-ID equipped state is insufficient for duplicate copies.
- Duplicate-source protection: unique server source event plus exact instance ID; same source/item refreshes one record, and one instance is only Boolean-disabled.
- Reconnect behavior: pending choice and active suppression serialize unchanged; reconnect cannot clear or duplicate either.
- Cleanup/reset: consume after the owner's next Threat finalizes; also clear when the item leaves inventory, or on recall, operative replacement, session end, or room reset. Turn/round boundaries and unequip/re-equip do not clear it.
- Final player-facing rule: “If you fail, choose one equipped normal Equipment. It provides no effects through your next Threat.”
- Severity: 2.
- Implementation complexity: medium-high.
- Balance risk: medium; bounded owner choice and Artifact exclusion prevent routine permanent or disproportionate loss.
- Approval status: APPROVED — IMPLEMENTED H4B.

### `signal-rotted-engineer`

- Current Heat behavior: combat loss `gain_heat 1`, compatibility-only no-op.
- Original gameplay intent: Equipment interference; the battle already suppresses Weapon bonus and the auxiliary failure key only records exposed gear.
- Selected retirement model: after a loss, choose one eligible exact equipped normal Equipment instance; it provides no effects during the owner's next battle.
- Card type: enemy.
- Lane: Yellow.
- Test/battle stat: Forge.
- Difficulty: 4; severity 2; outer common; 2 graph references.
- Timing: current combat suppression is immediate; the Heat branch is on loss.
- Success: defeat.
- Failure: after final combat loss, open the same private exact-instance choice as Relay Husk; no eligible target means no additional effect.
- Reward: tool-rig note.
- Persistence: exact-instance owner state with typed `nextOwnerBattleResolved` expiry; the Engineer battle does not count.
- Wound handling: none proposed.
- Scar interaction: none.
- Salvage interaction: none.
- Equipment interaction: same eligibility as Relay Husk. Suppression preserves the instance, charges, exhaustion, and uses while blocking all contributions; permanent discard is rejected.
- Movement interaction: none.
- Multiplayer interaction: owner-only inventory.
- Typed runtime support: shares Relay's later exact-instance choice/suppression infrastructure with a different typed expiry; existing battle-scoped slot suppression is not reused as persistence.
- Duplicate-source protection: source event plus exact instance ID; no queued identical next-battle penalties.
- Reconnect behavior: pending choice and active suppression serialize unchanged.
- Cleanup/reset: consume after the owner's next battle finalizes whether or not the instance remains equipped; also clear on item leaving inventory, recall, operative replacement, session end, or room reset. Turns, rounds, unrelated Threats, and unequip/re-equip do not clear it.
- Final player-facing rule: “If you lose, choose one equipped normal Equipment. It provides no effects during your next battle.”
- Severity: 2.
- Implementation complexity: medium-high.
- Balance risk: medium; owner can choose the least useful eligible item, but the effect is bounded and never destroys it.
- Approval status: APPROVED — IMPLEMENTED H4B.

### `siren-relay-echo`

- Current Heat behavior: success `lose_heat 1`; failure `gain_heat 2`; both compatibility-only no-ops.
- Original gameplay intent: paired temporary Command reinforcement/interference.
- Selected retirement model: owner's next eligible non-battle Command test gets `+1` on success or `-1` on failure.
- Card type: hazard.
- Lane: Yellow.
- Test/battle stat: Command.
- Difficulty: 6; severity 2; outer common; 3 graph references.
- Timing: create after final result; reserve for the next eligible Command test and consume after that resolution's reroll/reaction window.
- Success: `+1` on the next eligible non-battle Command test.
- Failure: `-1` on the next eligible non-battle Command test.
- Reward: none.
- Persistence: one owner-scoped pending modifier.
- Wound handling: none.
- Scar interaction: a Scar event is excluded unless it explicitly initiates an authoritative rolled non-battle Command test.
- Salvage interaction: none.
- Equipment interaction: applies once in the normal source arithmetic after permanent/conditional sources and before the existing final minimum/clamp; does not mutate any stored stat.
- Movement interaction: movement rolls are excluded.
- Multiplayer interaction: owner-only; public result may show source without private alternatives.
- Typed runtime support: later implementation generalizes Glass-Chime's source-locked schema with typed source, amount, stat/context eligibility, and test-resolution reservation.
- Duplicate-source protection: one pending Siren modifier per owner; a later Siren result replaces amount/source and never queues `+2/-2`. Differently named eligible modifiers stack normally.
- Reconnect behavior: pending/reserved state persists and completes once for the same resolution ID.
- Cleanup/reset: eligible-test consumption, recall, operative replacement, session end, or room reset. Turns, rounds, battles, movement, and ineligible tests retain it.
- Final player-facing rule: “If you succeed, gain +1 on your next non-battle Command test. If you fail, suffer -1 on your next non-battle Command test.”
- Severity: 2.
- Implementation complexity: medium.
- Balance risk: medium-low; one pending paired modifier cannot queue, and the stat/context is narrow.
- Approval status: APPROVED — IMPLEMENTED H4C.

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
- Approval status: APPROVED — IMPLEMENTED H3.

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
| `ashen-doppelganger` | Two Wounds is clear but intentionally severe | Prevention remains valuable; one atomic request prevents split-stage exploits | Fast resolution even when it recalls | One prevention pass, actual delta, one threshold check; no direct Scar |
| `choir-static-burst` | One Wound is immediate | No benefit loop; prevention remains valuable | One familiar consequence | Owner, final failure, actual delta, and recall are defined |
| `cinder-gate-backlash` | Passing simply avoids harm | No farmable success reward | Fastest resolution | No success state, reset, or replay question |
| `crown-bell-baron` | “Lose up to 1” is legible | Zero Salvage nullifies loss but grants nothing | Quick and thematic | Loss is not payment; floors at zero; owner only |
| `false-route-procession` | Two named same-ring destinations make the forced choice clear | Position can improve the options, but no stay/cross-ring/progress exploit exists | At most two buttons; one and zero candidates are fast | Owner, candidates, legality, center, reaction, entry, stale choice, dedup, and reconnect are defined |
| `gateblind-pulse` | Shared escalation and the visible one-before-collapse guard are understandable | Failure becomes free at the guard, but the table is already at maximum nonterminal pressure | One public conditional increment; no nested collapse | Pre-effect trigger, requested/actual delta, modifier thresholds, ability timing, dedup, and reconnect are defined in H7A |
| `hymn-scarred-zealot` | One Wound matches ordinary combat | No success-side consequence or persistent hymn state to exploit | Fast physical consequence for a common enemy | Loss owns the Wound; defeat owns silencing; threshold recall is the only Scar route |
| `lantern-moth-swarm` | Pass safe / fail 1 Wound | Cannot farm a heal | One clear physical consequence | Standard prevention, recall, and dedup rules apply |
| `marrow-tax-auditors` | “Lose up to 1 Salvage” clearly names an automatic loss | Zero balance nullifies the delta but yields no transaction or reward exploit | One subtraction is fast; finite decks bound repeat punishment | Trigger, floor zero, economy isolation, source deduplication, and reconnect behavior are approved in H8A |
| `memory-tax-gate` | No approved choice to explain | One arm may dominate | Private-memory bookkeeping risks drag | Ownership, privacy, resolution, and reset are unresolved |
| `mirror-rot-interference` | Passing avoids the Wound | No repeatable healing loop | Fast | Existing failure lifecycle is unchanged |
| `pale-contract-collector` | Debt means Salvage loss | Trophy reward still requires victory | Quick and thematic | Automatic loss, not payment; owner only |
| `relay-husk` | Owner phone names the item and “through next Threat” expiry | A low-value item can absorb it, but must be equipped; reconnect/unequip cannot clear it | One picker and one visible event boundary | Exact instance, no-target fallback, next-Threat consumption, and cleanup are defined |
| `signal-rotted-engineer` | Post-loss choice is visibly separate from current battle Weapon suppression | Owner may choose the least useful item; the next battle consumes the effect regardless of equip state | One picker and one battle boundary | Loss-only trigger, post-finalization creation, exact target, reward isolation, and cleanup are defined |
| `siren-relay-echo` | Paired `+1/-1` and Command-only scope are learnable | Identical Siren effects replace rather than queue | One projected modifier token | Eligible contexts, arithmetic, rerolls, Glass-Chime stacking, reconnect, and cleanup are defined |
| `soot-stained-cutpurse` | Theft maps directly to 1 Salvage | Zero balance is safe, not profitable | Fast and familiar | Owner-only floor-zero actual delta is defined |
| `webglass-snarefield` | Passing avoids the Wound | No repeatable healing loop | Fast | Existing failure lifecycle is unchanged |

## Distribution impact

Counts below are unique cards, not individual branches. “Approved proposal” includes unchanged active effects plus all H1–H8A approvals on the same 17 cards; it excludes the one blocked candidate.

| Effect family | Current 17 | Approved proposal | Notes |
|---|---:|---:|---|
| Wound effects | 5 | 7 | Cinder/Mirror/Webglass, implemented Choir/Lantern, plus H5A Doppelganger/Zealot |
| Scar effects | 0 | 0 | H5A expressly rejects direct card Scars; normal threshold Scars remain lifecycle outcomes |
| Salvage pressure | 0 | 4 | Baron, Collector, and Cutpurse are implemented; Marrow Tax is H8A-approved but not implemented. All are floor-zero owner losses |
| Equipment effects | 3 | 3 | Existing Engineer battle Weapon suppression plus two implemented bounded exact-instance suppressions |
| Movement effects | 0 | 1 | False-Route owner-choice forced displacement implemented H6B |
| Temporary modifiers | 0 | 1 | Siren paired next non-battle Command modifier implemented in H4C |
| Persistent effects | 0 | 3 | two event-bounded suppressions and one until-consumed modifier; all owner-scoped with explicit cleanup |
| Player-choice cards | 0 | 3 | Relay and Engineer exact-instance Equipment choices are implemented; False-Route destination choice is approved; Memory Tax remains blocked |
| Multiplayer effects | 0 | 1 | Gateblind conditional shared escalation is implemented H7B |
| Global Escalation | 0 | 1 | Gateblind may advance 1 but cannot itself reach collapse |
| Removal without replacement | 3 | 3 | Cinder, Mirror-Rot, Webglass success branches implemented in H1 |

Approved severity distribution is severity 1: four cards (`cinder-gate-backlash`, `mirror-rot-interference`, `soot-stained-cutpurse`, `webglass-snarefield`); severity 2: ten cards (`choir-static-burst`, `crown-bell-baron`, `false-route-procession`, `hymn-scarred-zealot`, `lantern-moth-swarm`, `marrow-tax-auditors`, `pale-contract-collector`, `relay-husk`, `signal-rotted-engineer`, `siren-relay-echo`); severity 3: one card (`gateblind-pulse`); severity 4: one card (`ashen-doppelganger`); severity 5: none. The one blocked provisional candidate is severity 3.

Lane impact remains conservative: Blue approves all seven cards; Yellow approves eight of nine and blocks one; Red's only card is approved. Fifteen approvals are implemented; the Yellow H8A approval is not. No stable ID, lane, role, difficulty, graph placement, art reference, or card total changes in this report.

## Approval boundary

This report records the completed H1–H7B groups and the report-only H8A approval of `marrow-tax-auditors`. That card remains unchanged until H8B implementation. `memory-tax-gate` remains blocked for its separate private-choice lifecycle approval. The +116-card expansion remains unapproved, and no exact Relic-frequency parity is claimed.
