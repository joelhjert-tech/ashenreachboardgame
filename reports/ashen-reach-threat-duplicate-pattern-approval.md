# Ashen Reach Threat Duplicate-Pattern Approval

## Decision status and boundary

Phase B1 began as a report-only review of the twelve stable IDs named by Phase A. B2A, B2B, B2C, and the two Family C retirement slices have now implemented all eight approved revisions.

The review found five duplicate families. Four cards remain family baselines and all eight approved revisions are implemented. `glass-chime-swarm` uses typed next-test interference; `spindle-static-squall` uses typed next-normal-movement interference. Neither retains player-facing legacy Heat.

## Canonical twelve-card inventory

All twelve are active canonical Threats. They are immediate hazards, do not persist after resolution, and currently resolve one test followed by one typed effect.

| Stable ID | Display name | Lane / type | Test | Difficulty | Success | Failure | Reward | Persistence / timing | Duplicate family | Closest overlap and reason |
|---|---|---|---|---:|---|---|---|---|---|---|
| `beacon-cable-snare` | Beacon Cable Snare | Blue / hazard | Forge | 6 | route note | 1 Wound | note only | immediate on draw | A | Exact skeleton with `breach-halberd` and `glass-tick-cloud`; retained for the clearest technical-hazard wording |
| `breach-halberd` | Breach Halberd | Red / hazard | Forge | 6 | route note | 1 Wound | note only | immediate on draw | A | Same test, band, note/Wound pair as Family A; its aggressive Red identity is not expressed mechanically |
| `glass-tick-cloud` | Glass Tick Cloud | Yellow / hazard | Forge | 6 | route note | 1 Wound | note only | immediate on draw | A | Same test, band, note/Wound pair as Family A; gear-chewing fiction has no equipment/economy consequence |
| `furnace-ditch-collapse` | Furnace-Ditch Collapse | Red / hazard | Grit | 6 | route note | 1 Wound | note only | immediate on draw | B | Exact skeleton with `mudglass-sinkhole`; retained as the clearest physical-attrition baseline |
| `mudglass-sinkhole` | Mudglass Sinkhole | Red / hazard | Grit | 6 | route note | 1 Wound | note only | immediate on draw | B | Same test and result as Furnace-Ditch; sinking terrain does not currently affect route position |
| `glass-chime-swarm` | Glass-Chime Swarm | Blue / hazard | Signal | 6 | route note | owner’s next eligible non-battle test `-1` | note only | delayed until next eligible check | C | Approved next-test retirement implemented with a typed, reconnect-safe, non-stacking lifecycle |
| `spindle-static-squall` | Spindle Static Squall | Blue / hazard | Signal | 6 | route note | next normal movement roll `-1`, minimum `1` | note only | immediate on draw | C | Approved next-movement retirement implemented |
| `locked-vault` | Locked Vault | Yellow / hazard | Forge | 7 | route note | 1 Wound | note only | immediate encounter | D | Same Forge-7 injury structure as `shattered-barricade`; current failure does not express economic loss |
| `shattered-barricade` | Shattered Barricade | Red / hazard | Forge | 7 | route note | 1 Wound | note only | immediate encounter | D | Same Forge-7 note/Wound structure; stall tempo and breached-route fiction are not expressed |
| `slag-drone` | Slag Drone | Yellow / hazard | Forge | 7 | gain `coffin-rig` | 1 Wound | exact Gear | immediate on draw | D | Shares test/failure but already has a distinct exact-Gear success; retained baseline |
| `shardwind-front` | Shardwind Front | Red / hazard | Grit | 8 | route note | sequence containing 1 Wound | note only | immediate on draw | E | Same functional result as `suture-storm`; retained because severity 3 matches its one-Wound consequence |
| `suture-storm` | Suture Storm | Red / hazard | Grit | 8 | route note | sequence containing 1 Wound | note only | immediate on draw | E | Same test/result as Shardwind despite severity 4 and stronger fiction |

The introduction history supports duplication as accumulated content rather than an intentional subsystem: first appearances span `3b02f11`, `4ae3610`, `1751f75`, and `48f206d`; later normalization touched most cards in `85a7fd7`, while `shardwind-front` and `suture-storm` were last mechanically cleaned in `955e30d`.

## Heat retirement boundary

### OTHER 17 IDS BLOCKED — INDIVIDUAL HEAT RETIREMENT DECISIONS REQUIRED

The seventeen additional Phase A IDs are:

`ashen-doppelganger`, `choir-static-burst`, `cinder-gate-backlash`, `crown-bell-baron`, `false-route-procession`, `gateblind-pulse`, `hymn-scarred-zealot`, `lantern-moth-swarm`, `marrow-tax-auditors`, `memory-tax-gate`, `mirror-rot-interference`, `pale-contract-collector`, `relay-husk`, `signal-rotted-engineer`, `siren-relay-echo`, `soot-stained-cutpurse`, `webglass-snarefield`.

They are not reviewed or revised here and remain BLOCKED. The twelve-card set additionally overlaps the Heat boundary at `glass-chime-swarm` and `spindle-static-squall`. That overlap does not increase the Phase A “17 additional IDs” count. The dedicated approval covers only those two Family C designs, and both implementations now retire their own Heat effects.

## Duplicate families and retained baselines

### Family A — Forge 6, note on success, Wound on failure

- Cards: `beacon-cable-snare`, `breach-halberd`, `glass-tick-cloud`.
- Duplication: exact test/result duplication across three lanes; only prose and tags differ.
- Baseline retained: `beacon-cable-snare`. Its grounding/circuit fiction, Forge test, and injury consequence form the clearest self-contained hazard.
- Revisions: make Breach Halberd express Red route aggression and Glass Tick Cloud express Yellow material pressure.

### Family B — Grit 6, note on success, Wound on failure

- Cards: `furnace-ditch-collapse`, `mudglass-sinkhole`.
- Duplication: exact mechanical duplication and near-identical terrain-crossing purpose.
- Baseline retained: `furnace-ditch-collapse`. Hot slag makes Grit plus preventable injury immediately legible.
- Revision: make Mudglass control position rather than repeat injury.

### Family C — Signal 6, note on success, Heat no-op on failure

- Cards: `glass-chime-swarm`, `spindle-static-squall`.
- Duplication: exact test/result duplication and mechanically blank failures.
- Baseline decision: neither blank Heat-no-op failure remains the final baseline. Both stable IDs keep their Hazard/Signal 6 identity but receive distinct delayed interference.
- Revisions: Glass-Chime creates owner-scoped next-test pressure; Spindle creates owner-scoped next-normal-movement pressure.

### Family D — Forge 7, injury on failure

- Cards: `locked-vault`, `shattered-barricade`, `slag-drone`.
- Duplication: near duplication. The same Forge-7/one-Wound failure dominates; Locked Vault and Barricade also share the note reward. Slag Drone’s Gear reward already supplies meaningful asymmetry.
- Baseline retained: `slag-drone`. It has the strongest lore/mechanic connection and the only distinct reward.
- Revisions: Locked Vault should create bounded Yellow resource pressure; Shattered Barricade should create public escalation pressure.

### Family E — Grit 8 storm, note on success, Wound on failure

- Cards: `shardwind-front`, `suture-storm`.
- Duplication: exact functional duplication; the one-element sequences are mechanically identical to one Wound.
- Baseline retained: `shardwind-front`. Severity 3 and direct attrition are proportionate and easy to teach.
- Revision: Suture Storm’s severity 4 should add a route consequence without increasing Wound quantity.

## Three replacement options per revised card

Options are alternatives, not cumulative effects. “Existing schema” means the effect is typed now; a new source can still require narrow validation and focused tests.

### `breach-halberd`

1. **Preferred — sweeping displacement.** Red hazard, Forge 6, immediate failure, no choice. Success keeps the note. Failure opens existing clockwise same-ring forced displacement with a one-Wound fallback if no legal destination exists. No Scar, Salvage, item, or group effect. Contexts: `nonBattleTest`, `threatLane`, forced displacement, source dedupe. Complexity 2/5, risk 2/5, strong Red route pressure, low overlap outside Route Splice.
2. **Weapon sacrifice.** On failure choose one owned normal Weapon to discard or suffer 1 Wound. Exact-instance ownership and reconnect-safe choice required. Complexity 4/5, risk 3/5. Strong armoury identity but blocked by missing encounter equipment-choice lifecycle and worthless-item absorption.
3. **Brace through it.** Change to Grit 6; failure remains 1 Wound, with equipped armour eligible for existing modifiers. Complexity 2/5, risk 2/5. Clear physical identity but merely relocates the common Wound pattern.

### `glass-tick-cloud`

1. **Preferred — material stripping.** Yellow hazard, Forge 6, immediate, no choice. Success keeps the warning note. Failure automatically loses up to 1 Salvage, floor zero. No Wound, Scar, item removal, movement, or group effect. Existing Salvage loss and source dedupe. Complexity 1/5, risk 2/5; strong Yellow material-pressure identity.
2. **Exact-instance suppression.** Failure selects one equipped normal Equipment and disables its bonus until end of turn. No discard. Complexity 4/5, risk 3/5; needs a typed timed-disable lifecycle and projections.
3. **Cut the pack loose.** Before roll, optionally discard one carried normal Equipment for +2 Forge; otherwise normal roll and one-Wound failure. Complexity 4/5, risk 3/5; needs a pre-roll exact-instance cost window and invites low-value dumping.

### `mudglass-sinkhole`

1. **Preferred — route displacement.** Red hazard, Grit 6. Success keeps the note. Failure uses counterclockwise same-ring forced displacement with one-Wound fallback and still counts as failure. No resource/item/group effect. Complexity 2/5, risk 2/5; converts sinking terrain into route pressure.
2. **Delayed collapse.** Persistent sector hazard; failure marks the sector and wounds only if the operative ends the turn there. Complexity 5/5, risk 3/5; blocked by missing persistent-Threat lifecycle.
3. **Abandon supplies.** On failure choose loss of up to 1 Salvage or 1 Wound. Complexity 3/5, risk 3/5; needs a general encounter choice and zero-Salvage option filtering.

### `glass-chime-swarm`

1. **Rejected — scattering route.** Blue hazard, Signal 6. Clockwise same-ring displacement is legible but would become a fourth reviewed forced-movement card and does not match the audit’s concentration intent.
2. **Approved — broken concentration.** Failure subtracts 1 from the owner’s next eligible test; battles are excluded. It persists across reconnect, never stacks above -1, and clears on consumption, recall, replacement, or session end. Complexity 3/5, risk 2/5; needs a narrow typed next-test modifier lifecycle.
3. **False chorus.** Failure publicly reveals the next Blue Threat and returns it to the top. Complexity 4/5, risk 2/5; needs authoritative deck-peek and privacy projection.

### `spindle-static-squall`

1. **Remove without replacement.** Matches current no-op runtime but leaves a common severity-2 Threat mechanically blank at three graph placements. Complexity 1/5, risk 1/5; rejected as too weak and indistinct.
2. **Approved — corrupted bearing.** Failure reduces the owner’s next normal movement roll by 1, minimum 1. It does not affect forced displacement or topology, persists across reconnect, never stacks above -1, and clears on consumption, recall, replacement, or session end. Complexity 3/5, risk 2/5; needs a narrow typed next-movement modifier lifecycle.
3. **Utility suppression.** Temporarily disable an equipped Utility bonus. Complexity 4/5, risk 3/5; rejected because no-Utility operatives trivialize it and exact-instance timed disable is broader than the authored navigation intent.

### `locked-vault`

1. **Preferred — damaged stores.** Yellow hazard, Forge 7. Success keeps the cipher note. Failure automatically loses up to 1 Salvage, floor zero. It is loss, not payment. Complexity 1/5, risk 2/5; strong bounded Yellow pressure.
2. **Pay the old law.** Before the test, optionally pay 1 Salvage for success; decline rolls normally. Complexity 4/5, risk 3/5. Existing payment lifecycle does not own hazard pre-test timing.
3. **Vault alarm.** Failure advances Global Escalation 1. Complexity 1/5, risk 3/5. Typed already, but common outer-region shared pressure is vulnerable to Rivalry weaponization and is a weaker Yellow fit.

### `shattered-barricade`

1. **Preferred — breach alarm.** Red hazard, Forge 7. Success keeps the note. Failure advances Global Escalation exactly 1, once. No personal mutation. Complexity 1/5, risk 3/5. It creates shared hostile-world pressure; Rivalry weaponization requires focused testing.
2. **Blown off route.** Failure applies counterclockwise displacement with one-Wound fallback. Complexity 2/5, risk 2/5; ready but overlaps preferred Mudglass route control.
3. **Clear it together.** A co-located operative may assist Forge; without assistance or on failure, suffer 1 Wound. Complexity 4/5, risk 2/5; blocked by missing general assistance lifecycle and Rivalry timing design.

### `suture-storm`

1. **Preferred — stitched off course.** Red hazard, Grit 8. Failure resolves 1 Wound through the normal pipeline, then counterclockwise same-ring displacement. Illegal displacement uses the existing one-Wound fallback, but recall must stop later encounter work. Complexity 3/5, risk 3/5; supports severity 4 with two different pressures.
2. **Permanent stitch.** Failure gains one named existing Scar. Complexity 2/5, risk 5/5; too persistent for a repeatable hazard without explicit Scar approval.
3. **Storm front persists.** Failure leaves a one-round sector hazard imposing -1 movement through it. Complexity 5/5, risk 3/5; blocked by missing persistent Threat lifecycle/reset ownership.

## Preferred approval blocks

### `breach-halberd`

- Current disposition: Revise
- Duplicate family: A — Forge 6 note/Wound hazard
- Baseline card retained: `beacon-cable-snare`
- Selected option: Sweeping displacement
- Card type: Hazard
- Lane: Red
- Test/battle stat: Forge
- Difficulty: 6
- Timing: Failure after authoritative hazard test
- Persistence: Existing pending displacement only
- Success: Preserve current note
- Failure: Forced clockwise same-ring movement 1; illegal destination falls back to 1 Wound; failure still counts
- Reward: Existing note only
- Wound handling: Fallback through normal pipeline
- Scar interaction: Existing Wound-triggered lifecycle only
- Salvage interaction: None
- Equipment interaction: Existing Rift Anchor Spike reaction only
- Movement interaction: Existing forced displacement
- Multiplayer interaction: Acting operative; public-safe waiting/result
- Requires typed extension: No union extension; exact source approval only
- Duplicate source protection: Existing source event and resolution IDs
- Final player-facing rule: “The halberd sweeps you off the breach. Move 1 sector clockwise on this ring. If no legal sector is available, suffer 1 Wound.”
- Implementation complexity: 2/5
- Balance risk: 2/5
- Approval status: APPROVED

### `glass-tick-cloud`

- Current disposition: Revise
- Duplicate family: A
- Baseline card retained: `beacon-cable-snare`
- Selected option: Material stripping
- Card type: Hazard
- Lane: Yellow
- Test/battle stat: Forge
- Difficulty: 6
- Timing: Immediate failure
- Persistence: None
- Success: Preserve current note
- Failure: Lose up to 1 Salvage, floor zero
- Reward: Existing note only
- Wound handling: None
- Scar interaction: None
- Salvage interaction: Automatic loss, not payment
- Equipment interaction: None; fiction means expendable material, not item mutation
- Movement interaction: None
- Multiplayer interaction: Acting operative only
- Requires typed extension: No
- Duplicate source protection: Existing resolution source ID
- Final player-facing rule: “The glass ticks strip useful material from your pack. Lose up to 1 Salvage.”
- Implementation complexity: 1/5
- Balance risk: 2/5
- Approval status: APPROVED

### `mudglass-sinkhole`

- Current disposition: Revise
- Duplicate family: B — Grit 6 terrain injury
- Baseline card retained: `furnace-ditch-collapse`
- Selected option: Route displacement
- Card type: Hazard
- Lane: Red
- Test/battle stat: Grit
- Difficulty: 6
- Timing: Failure after test
- Persistence: Existing pending displacement only
- Success: Preserve current note
- Failure: Forced counterclockwise same-ring movement 1; illegal destination falls back to 1 Wound
- Reward: Existing note only
- Wound handling: Existing fallback pipeline
- Scar interaction: Existing Wound-triggered lifecycle only
- Salvage interaction: None
- Equipment interaction: Existing Rift Anchor Spike reaction only
- Movement interaction: Authoritative destination legality
- Multiplayer interaction: Acting operative only
- Requires typed extension: No union extension; exact source approval
- Duplicate source protection: Existing source event/resolution IDs
- Final player-facing rule: “The mudglass carries you off route. Move 1 sector counterclockwise on this ring. If no legal sector is available, suffer 1 Wound.”
- Implementation complexity: 2/5
- Balance risk: 2/5
- Approval status: APPROVED

### `glass-chime-swarm`

- Current disposition: Heat retirement implemented
- Duplicate family: C — Signal 6 note/Heat-no-op
- Baseline card retained: None; both Family C cards receive distinct interference
- Selected option: Broken concentration
- Card type: Hazard
- Lane: Blue
- Test/battle stat: Signal
- Difficulty: 6
- Timing: Confirmed failure creates a modifier after the current test; consume on the next eligible test
- Persistence: Owner-scoped across turns/reconnect; non-stacking replace/refresh; clear on consumption, recall, replacement, or session end
- Success: Preserve current note
- Failure: Subtract 1 from the owner’s next eligible test total; battles excluded
- Reward: Existing note only
- Wound handling: None
- Scar interaction: Grants no Scar; existing owned-Scar triggers on the later test remain independent
- Salvage interaction: None
- Equipment interaction: None; Equipment values are not rewritten
- Movement interaction: None; movement rolls are not eligible tests
- Multiplayer interaction: Acting operative only; public-safe pending/result summary
- Requires typed extension: Narrow typed pending next-test modifier and authoritative consumption ledger
- Duplicate source protection: Encounter resolution ID plus consumed-modifier source ID; same-card pending effects do not stack
- Final player-facing rule: “The swarm breaks your concentration. On failure, subtract 1 from your next test. This penalty does not affect battles.”
- Implementation complexity: 3/5
- Balance risk: 2/5
- Approval status: APPROVED

### `spindle-static-squall`

- Current disposition: Heat retirement implemented
- Duplicate family: C — Signal 6 note/Heat-no-op
- Baseline card retained: None; both Family C cards receive distinct interference
- Selected option: Corrupted bearing
- Card type: Hazard
- Lane: Blue
- Test/battle stat: Signal
- Difficulty: 6
- Timing: Confirmed failure creates a modifier after encounter resolution; consume on the next normal movement roll
- Persistence: Owner-scoped across turns/reconnect; non-stacking replace/refresh; clear on consumption, recall, replacement, or session end
- Success: Preserve current note
- Failure: Reduce the owner’s next normal movement roll by 1, minimum 1
- Reward: Existing note only
- Wound handling: None
- Scar interaction: Grants no Scar and opens no pending Scar state
- Salvage interaction: None
- Equipment interaction: Existing legal post-roll movement adjustments remain available; no Equipment is disabled or discarded
- Movement interaction: Normal movement-roll value only; no forced displacement, topology change, or extra tile entry
- Multiplayer interaction: Acting operative only; cannot target another seat
- Requires typed extension: Narrow typed pending next-movement modifier integrated with authoritative movement rolls
- Duplicate source protection: Encounter resolution ID plus consumed-modifier source ID; same-card pending effects do not stack
- Final player-facing rule: “The squall corrupts your bearing. On failure, reduce your next movement roll by 1, to a minimum of 1.”
- Implementation complexity: 3/5
- Balance risk: 2/5
- Approval status: APPROVED

### `locked-vault`

- Current disposition: Revise
- Duplicate family: D — Forge 7 injury hazard
- Baseline card retained: `slag-drone`
- Selected option: Damaged stores
- Card type: Hazard
- Lane: Yellow
- Test/battle stat: Forge
- Difficulty: 7
- Timing: Immediate failure
- Persistence: None
- Success: Preserve current note
- Failure: Lose up to 1 Salvage, floor zero
- Reward: Existing note only
- Wound handling: None
- Scar interaction: None
- Salvage interaction: Automatic loss, not payment
- Equipment interaction: None
- Movement interaction: None
- Multiplayer interaction: Acting operative only
- Requires typed extension: No
- Duplicate source protection: Existing resolution source ID
- Final player-facing rule: “The vault ruins part of your stores before sealing. Lose up to 1 Salvage.”
- Implementation complexity: 1/5
- Balance risk: 2/5
- Approval status: APPROVED

### `shattered-barricade`

- Current disposition: Revise
- Duplicate family: D
- Baseline card retained: `slag-drone`
- Selected option: Breach alarm
- Card type: Hazard
- Lane: Red
- Test/battle stat: Forge
- Difficulty: 7
- Timing: Immediate failure
- Persistence: Session track movement only
- Success: Preserve current note
- Failure: Advance Global Escalation exactly 1
- Reward: Existing note only
- Wound handling: None
- Scar interaction: None
- Salvage interaction: None
- Equipment interaction: None
- Movement interaction: None directly
- Multiplayer interaction: Shared world pressure; no private data
- Requires typed extension: No; focused source and Rivalry tests
- Duplicate source protection: Existing resolution source ID
- Final player-facing rule: “The breach broadcasts your position. Advance Global Escalation by 1.”
- Implementation complexity: 1/5
- Balance risk: 3/5
- Approval status: APPROVED

### `suture-storm`

- Current disposition: Revise
- Duplicate family: E — Grit 8 storm injury
- Baseline card retained: `shardwind-front`
- Selected option: Stitched off course
- Card type: Hazard
- Lane: Red
- Test/battle stat: Grit
- Difficulty: 8
- Timing: Ordered failure sequence: Wound, then displacement if encounter remains active
- Persistence: Existing pending displacement only
- Success: Preserve current note
- Failure: Suffer 1 Wound, then force counterclockwise same-ring movement; illegal displacement uses the typed one-Wound fallback
- Reward: Existing note only
- Wound handling: Normal prevention, delta, recall, Scar and defeat pipeline; recall stops later encounter work
- Scar interaction: Existing Wound-triggered lifecycle only
- Salvage interaction: None
- Equipment interaction: Existing prevention and Rift Anchor Spike only
- Movement interaction: Existing forced displacement
- Multiplayer interaction: Acting operative; public-safe waiting/result
- Requires typed extension: No union extension; ordered-continuation proof and source approval
- Duplicate source protection: Encounter resolution ID plus displacement source event ID
- Final player-facing rule: “The storm stitches flesh to road. Suffer 1 Wound, then move 1 sector counterclockwise on this ring. If no legal sector is available, suffer 1 Wound instead of moving.”
- Implementation complexity: 3/5
- Balance risk: 3/5
- Approval status: APPROVED

## Retained baselines

`beacon-cable-snare`, `furnace-ditch-collapse`, `slag-drone`, and `shardwind-front` retain current mechanics. Family C no longer has a provisional blank-failure baseline: both stable IDs have approved, distinct delayed-interference revisions.

## Four-seat critique

| ID | New player | Optimizer | Family/casual | Rules lawyer |
|---|---|---|---|---|
| `breach-halberd` | Direction, fallback, and Red aggression are visible | No reward loop; Anchor changes only movement | One familiar reaction pause | Owner, ring, legality, fallback, source ID explicit |
| `glass-tick-cloud` | “Up to 1” clearly floors at zero | Zero Salvage avoids loss but grants nothing | Immediate, no bookkeeping | Automatic loss is not spend/pay |
| `mudglass-sinkhole` | Sinking visibly changes position | Illegal destination cannot be selected | Existing reaction is the only pause | Fallback and reconnect ownership explicit |
| `glass-chime-swarm` | “Next test, not battle” is explicit | Cannot stack or create benefit; battle routes may postpone it | One delayed -1 reminder | Eligible tests, reroll reuse, recall clearing, reconnect, and source consumption explicit |
| `spindle-static-squall` | “Next movement roll, minimum 1” matches bearing loss | Legal gear adjustment can offset it at normal opportunity cost | Resolves on the next familiar movement roll | Die face, modifier order, forced-movement exclusion, clearing, reconnect, and dedupe explicit |
| `locked-vault` | Failure describes economic damage | Floor-zero creates no debt or loop | Immediate | Loss differs from payment |
| `shattered-barricade` | Shared consequence is clear | Rivalry griefing is the watch item | Public track handles memory | Exact +1, cap behavior, dedupe need tests |
| `suture-storm` | Two consequences justify severity | Prevention and Anchor have separate windows | Slightly longer but familiar | Recall must terminate continuation; no duplicate fallback |

No preferred rule creates a buy/sell loop, repeatable Salvage reward, universal income, direct Wound mutation, client-authored value, or prose-parsed mechanic.

## Distribution impact

No approved revision changes lane, type, stat, difficulty, severity, availability, or card count.

| Measure | Current | After eight APPROVED revisions | Change |
|---|---:|---:|---:|
| Red / Blue / Yellow | 26 / 35 / 48 | 26 / 35 / 48 | 0 |
| Overall Threats | 109 | 109 | 0 |
| Enemies / hazards | 67 / 42 | 67 / 42 | 0 |
| Low / standard / high / elite | 16 / 55 / 24 / 14 | unchanged | 0 |
| Grit / Forge / Guile / Signal / Command | 22 / 23 / 22 / 25 / 17 | unchanged | 0 |
| Reviewed cards with direct Wound failure | 10 | 5 | -5 |
| Reviewed cards with forced movement | 0 | 3 | +3 |
| Reviewed cards with automatic Salvage pressure | 0 | 2 | +2 |
| Reviewed cards with Global Escalation pressure | 0 | 1 | +1 |
| Reviewed cards with explicit choice | 0 | 0 | 0 |
| Reviewed cards with persistent effect beyond pending resolution | 0 | 2 | +2 |
| Reviewed cards with next-test pressure | 0 | 1 | +1 |
| Reviewed cards with next-normal-movement pressure | 0 | 1 | +1 |
| Reviewed cards with equipment interaction | 0 | 3 via existing Rift Anchor reaction | +3 contextual |
| Reviewed cards with shared consequence | 0 | 1 | +1 |

The approved Family C rules add no Wounds, Scars, Salvage changes, forced displacement, or Global Escalation. Suture Storm retains one direct Wound; Breach Halberd and Mudglass replace direct Wounds with movement whose illegal-route fallback can still Wound. This improves diversity without claiming the +116 gap is closed.

## Future implementation groups

### B1.1 — automatic resource effects (2)

- IDs: `glass-tick-cloud`, `locked-vault`.
- Work: existing `lose_salvage 1`, floor zero, no payment semantics.
- Tests: identity, zero/positive Salvage, once-only resolution, reconnect, presentation.
- Risk: low-medium.
- Commit: `feat: diversify yellow threat resource pressure`.

### B1.2 — forced displacement (2)

- IDs: `breach-halberd`, `mudglass-sinkhole`.
- Work: exact source approvals using existing lifecycle.
- Tests: direction, topology, fallback, stale/duplicate reaction, recall, privacy.
- Risk: medium.
- Commit: `feat: diversify threat route displacement`.

### B1.3 — shared and ordered pressure (2)

- IDs: `shattered-barricade`, `suture-storm`.
- Work: existing escalation plus ordered Wound/displacement.
- Tests: escalation cap/Rivalry, prevention, recall stopping continuation, fallback, dedupe.
- Risk: medium-high.
- Commit: `feat: diversify high-pressure route hazards`.

### Family C.1 — next-test interference (1)

- ID: `glass-chime-swarm`.
- Status: IMPLEMENTED in the isolated Glass-Chime Heat-retirement slice.
- Work: narrow owner-scoped next-test -1 modifier, non-stacking, reconnect-safe, consumed once.
- Tests: eligible contexts, battle exclusion, reroll reuse, Scar-trigger ordering, recall/replacement clearing, privacy, dedupe.
- Risk: medium.
- Commit: `feat: retire glass chime swarm heat`.

### Family C.2 — next-movement interference (1)

- ID: `spindle-static-squall`.
- Status: IMPLEMENTED in the isolated Spindle Heat-retirement slice.
- Work: narrow owner-scoped next-normal-movement -1 modifier with minimum 1 and authoritative ordering.
- Tests: normal roll, floor, post-roll gear adjustment, forced-displacement exclusion, recall/replacement clearing, reconnect, dedupe.
- Risk: medium.
- Commit: `feat: retire spindle static squall heat`.

### Heat-blocked — no implementation

- IDs: the seventeen additional Heat-linked Threats listed above.
- Entry: individual or small-group Heat-retirement decisions approved first.

## Evidence gates and next step

Exact Relic reward, failure, choice, persistence, and multiplayer frequencies remain image-only evidence gates. They are not claimed here and must not become validation quotas. No +116-card expansion is authorized.

The duplicate-pattern revision track is complete. The seventeen additional Heat-linked Threats remain BLOCKED and require separate retirement triage; the +116-card expansion remains unapproved.
