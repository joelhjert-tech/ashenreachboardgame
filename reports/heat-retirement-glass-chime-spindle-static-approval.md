# Heat Retirement Approval — Glass-Chime Swarm and Spindle Static Squall

Date: 2026-07-14

Status: report-only design approval. No content, schema, runtime, validation, UI, asset, or count change is authorized by this commit.

## Decision summary

Both remaining Family C cards are approved for separate implementation. Their legacy `gain_heat 1` failures are compatibility no-ops today. Neither failure represents bodily injury severe enough for a Wound or permanent Scar, and neither represents shared pressure, material loss, or forced displacement.

| Stable ID | Selected retirement | Runtime readiness | Approval |
|---|---|---|---|
| `glass-chime-swarm` | On failure, subtract 1 from the owner’s next test; battles are excluded | Ready with a narrow typed next-test modifier | APPROVED |
| `spindle-static-squall` | On failure, reduce the owner’s next normal movement roll by 1, minimum 1 | Ready with a narrow typed next-movement modifier | APPROVED |

The two effects are delayed Blue interference, but they consume on different authoritative events and have materially different test matrices. They should be implemented separately.

## Current canonical state

### `glass-chime-swarm`

- Display name: Glass-Chime Swarm
- Lane / type: Blue Hazard
- Activation / severity: 2
- Test: Signal 6
- Region / rarity / graph exposure: outer, common, one canonical graph placement
- Current success: gain the existing note, “You isolated the true tone and mapped the swarm's blind gap.”
- Current failure: `gain_heat 1`
- Reward: the success note only; no trophy or item reward
- Runtime behavior: generic Heat effects are parsed for compatibility but `applyLegacyHeatNoop` performs no mutation. The visible result is “Failure: no additional status change.”
- Duplicate family: Family C, exact Signal 6 note/Heat-no-op duplicate with `spindle-static-squall`
- Intended Blue identity: perception and concentration interference
- Closest overlaps: `spindle-static-squall` is the exact current duplicate; `siren-relay-echo` is separately audited for temporary Command interference; `sanctifier-beads` and `hushed-chapel` are nearby Signal hazards but use disproportionate direct Scar outcomes that must not be copied here

### `spindle-static-squall`

- Display name: Spindle Static Squall
- Lane / type: Blue Hazard
- Activation / severity: 2
- Test: Signal 6
- Region / rarity / graph exposure: outer, common, three canonical graph placements
- Current success: gain the existing note, “You tuned the squall into a stable bearing.”
- Current failure: `gain_heat 1`
- Reward: the success note only; no trophy or item reward
- Runtime behavior: the same compatibility-only no-op and public “no additional status change” result as Glass-Chime
- Duplicate family: Family C
- Intended Blue identity: navigation and instrument interference
- Closest overlaps: `glass-chime-swarm` is the exact current duplicate; `false-route-procession` is separately blocked for a movement redesign; `breach-halberd`, `mudglass-sinkhole`, and `suture-storm` already own immediate forced displacement, so Spindle must not become another displacement card

Both remain Hazards. They are one-test environmental interruptions, not trophy-bearing enemies. They do not have the catalog, persistence, instability, or resolution contract of Anomaly cards, and “mixed encounter” is not a current canonical card type.

## Legacy intent classification

### `glass-chime-swarm`

The original Heat represented minor accumulating mental/signal pressure: cracked tones scramble concentration after a failed Signal test. It was not severe lasting injury, material loss, scenario pressure, or a movement event. The closest current design category is a delayed temporary test penalty.

### `spindle-static-squall`

The original Heat represented minor navigation/signal disruption: compasses and bodily orientation are pulled toward the tower. It was not immediate injury or shared escalation. The closest current design category is a delayed penalty to the next ordinary movement roll.

## Retirement model evaluation

| Model | Glass-Chime Swarm | Spindle Static Squall |
|---|---|---|
| A — remove without replacement | Runtime-safe, but leaves an outer severity-2 Threat with a blank failure and no reason to differ from a simple information gate | Safer than inventing harm, but too weak at three graph placements and fails to express corrupted bearing |
| B — normal Wound | Rejected: scrambled concentration is not immediate physical injury; adds another routine Blue Wound | Rejected: static navigation interference is not a bodily hit; generic Wound repeats nearby Blue hazards |
| C — conditional Scar | Rejected: both are common outer Threats with routine failures and no elite gate or meaningful alternative | Rejected for the same severity and frequency reasons, especially at three placements |
| D — Global Escalation | Rejected: both effects are personal/local, and Shattered Barricade already supplies the reviewed shared-escalation failure | Rejected: a common local squall should not advance the whole table’s track |
| E — resource or Equipment pressure | Equipment scaling or timed suppression is plausible for Glass-Chime, but it distorts the authored concentration harm and creates exact-instance choice/disable complexity | Utility suppression is plausible, but an operative with no Utility trivializes the card and a timed exact-instance disable needs a broader item lifecycle |
| F — movement or persistent pressure | Selected as delayed test interference, not movement: one owner-scoped modifier survives until the next eligible test | Selected as delayed movement-roll interference; it changes movement value without displacement, route selection, or a persistent board object |

## Approved lifecycle rules

### Next-test interference (`glass-chime-swarm`)

1. A confirmed failed Signal 6 Threat test creates one owner-scoped typed next-test modifier with value `-1` and the encounter resolution source ID.
2. The modifier is recorded only after the current test has finalized; it cannot alter the roll that created it.
3. It applies to the owner’s next Threat or tile-challenge test. It subtracts 1 from the test total as a temporary modifier source.
4. It does not affect battles, normal movement rolls, shop actions, automatic effects, base stats, or Equipment values.
5. It remains pending across turns and reconnect until consumed. A solo reroll of the affected test reuses that test’s recorded modifier and does not spend the penalty twice.
6. A second unresolved Glass-Chime penalty refreshes/replaces the existing owner penalty; it never stacks above `-1`.
7. Consumption and source completion are atomic with the eligible test action. Duplicate socket delivery or reducer replay cannot reapply it.
8. Recall, replacement, or session end clears it; a replacement operative does not inherit it.

### Next-movement interference (`spindle-static-squall`)

1. A confirmed failed Signal 6 Threat test creates one owner-scoped typed next-movement modifier with value `-1` and the encounter resolution source ID.
2. It applies only to the owner’s next normal movement roll after the current encounter.
3. The server rolls movement, applies Spindle’s `-1` to a minimum movement value of 1, then permits any separately legal post-roll Equipment adjustment. The modifier is shown as its own source and never changes the die face.
4. It does not affect forced displacement, route topology, special movement that does not roll, tile-entry effects, or another player.
5. It remains pending across turns and reconnect until consumed.
6. A second unresolved Spindle penalty refreshes/replaces the existing owner penalty; it never stacks above `-1`.
7. Consumption and source completion are atomic with `MOVEMENT_ROLLED`; replay cannot reduce a later roll again.
8. Recall, replacement, or session end clears it.

These are two narrow discriminated pending states or variants, not a generic status-effect engine. The phone may request the underlying test or movement roll but never supplies modifier amount, ownership, expiry, or source identity.

## Approval blocks

### `glass-chime-swarm`

- Current Heat behavior: `gain_heat 1`; compatibility-only no-op with “no additional status change” runtime summary
- Original gameplay intent: minor accumulating concentration and signal pressure
- Selected retirement model: Option F, delayed next-test interference
- Card type: Hazard
- Lane: Blue
- Test/battle stat: Signal
- Difficulty: 6
- Timing: on confirmed failure; penalty begins only after the failed test completes and consumes on the next eligible test
- Success: preserve the existing blind-gap note
- Failure: subtract 1 from the owner’s next eligible test total; battles excluded
- Reward: existing success note only
- Persistence: owner-scoped across turns/reconnect until consumed; non-stacking replace/refresh; clear on recall/replacement/session end
- Wound handling: none; no Wound prevention window
- Scar interaction: grants no Scar. Existing owned-Scar triggers for the later test still resolve normally and independently
- Salvage interaction: none
- Equipment interaction: none; does not disable or rewrite Equipment bonuses
- Movement interaction: none; movement rolls are not eligible tests
- Multiplayer interaction: acting operative only; public-safe pending/result summary, no private inventory or source IDs
- Typed runtime support: ready with a narrow typed pending next-test modifier and existing authoritative modifier-source/result projection paths
- Duplicate-source protection: encounter resolution ID plus one consumed-modifier source ID; same-card pending effects do not stack
- Final player-facing rule: “The swarm breaks your concentration. On failure, subtract 1 from your next test. This penalty does not affect battles.”
- Implementation complexity: 3/5
- Balance risk: 2/5
- Approval status: APPROVED

### `spindle-static-squall`

- Current Heat behavior: `gain_heat 1`; compatibility-only no-op with “no additional status change” runtime summary
- Original gameplay intent: minor accumulating navigation and signal pressure
- Selected retirement model: Option F, delayed next-normal-movement interference
- Card type: Hazard
- Lane: Blue
- Test/battle stat: Signal
- Difficulty: 6
- Timing: on confirmed failure; modifier begins after encounter completion and consumes on the next normal movement roll
- Success: preserve the existing stable-bearing note
- Failure: reduce the owner’s next normal movement roll by 1, minimum 1
- Reward: existing success note only
- Persistence: owner-scoped across turns/reconnect until consumed; non-stacking replace/refresh; clear on recall/replacement/session end
- Wound handling: none; no Wound prevention window
- Scar interaction: grants no Scar and does not invoke pending Scar state
- Salvage interaction: none
- Equipment interaction: existing legal post-roll movement adjustments remain available after the penalty; no Equipment is disabled or discarded
- Movement interaction: normal movement roll value only; no forced displacement, topology change, route-selection bypass, or extra tile entry
- Multiplayer interaction: acting operative only; cannot target another seat
- Typed runtime support: ready with a narrow typed pending next-movement modifier integrated with the existing authoritative movement-roll path
- Duplicate-source protection: encounter resolution ID plus one consumed-modifier source ID; same-card pending effects do not stack
- Final player-facing rule: “The squall corrupts your bearing. On failure, reduce your next movement roll by 1, to a minimum of 1.”
- Implementation complexity: 3/5
- Balance risk: 2/5
- Approval status: APPROVED

## Scar severity gate

Neither card may directly grant a Scar. Both are common outer severity-2 Hazards with routine Signal 6 failures and no elite rarity, severe alternative cost, or unusually avoidable trigger. A permanent Scar would be disproportionate and would bypass the intended recall-driven Scar cadence. Neither selected rule inflicts a Wound, so Wound prevention is irrelevant and no content-specific pending-Scar choice is opened. Existing Scars owned by the operative continue to use their normal trigger/reconnect lifecycle when a later test or movement event occurs.

## Four-seat critique

| Card / seat | Assessment |
|---|---|
| Glass-Chime — new player | “Next test, not battle” is short and the `-1` is visible. The pending reminder must name the affected operative |
| Glass-Chime — optimizer | It cannot be farmed for benefit. Battle-focused routes can postpone it, but recall clears it and it never stacks |
| Glass-Chime — family/casual | One delayed token and one later subtraction; no inventory choice or arithmetic beyond `-1` |
| Glass-Chime — rules lawyer | Exact eligible test contexts, non-stacking replacement, reroll ownership, recall clearing, source consumption, and reconnect are specified |
| Spindle — new player | “Next movement roll, minimum 1” directly matches corrupted bearing |
| Spindle — optimizer | A later legal `+1` Equipment adjustment may offset it, but doing so spends that item’s normal opportunity; floor 1 prevents a skipped turn |
| Spindle — family/casual | The effect resolves at the next familiar movement roll and creates no route-choice detour |
| Spindle — rules lawyer | Die face, modifier order, minimum, forced-movement exclusion, non-stacking, recall clearing, and replay ownership are explicit |

## Runtime prerequisites and implementation grouping

Recommended implementation order:

1. `glass-chime-swarm` alone — add the narrow next-test modifier lifecycle, result source, reconnect projection, expiry, non-stacking rule, and focused tests. Commit: `feat: retire glass chime swarm heat`.
2. `spindle-static-squall` alone — add the narrow next-movement modifier lifecycle to normal movement rolls, modifier ordering, reconnect projection, expiry, and focused tests. Commit: `feat: retire spindle static squall heat`.

They may share naming conventions and source-ledger helpers, but should not share a single implementation commit. Glass-Chime consumes on test resolution and must cover rerolls/Scar test triggers; Spindle consumes on movement roll and must cover movement adjustments/topology exclusions.

## Remaining 17 Heat-linked Threats

The following categories are audit-supported routing only. They are not replacement approvals and all 17 remain BLOCKED.

| Stable ID | Likely retirement category |
|---|---|
| `ashen-doppelganger` | isolated high-risk Wound balance decision |
| `choir-static-burst` | Wound or bespoke signal-hazard decision |
| `cinder-gate-backlash` | individual success/reward redesign |
| `crown-bell-baron` | bounded Salvage-loss decision |
| `false-route-procession` | movement redesign |
| `gateblind-pulse` | gate/shared-escalation decision |
| `hymn-scarred-zealot` | explicit Scar-severity and lifecycle decision |
| `lantern-moth-swarm` | paired Wound-failure and success-outcome decision |
| `marrow-tax-auditors` | bounded Salvage-loss decision |
| `memory-tax-gate` | private memory/note choice lifecycle |
| `mirror-rot-interference` | bounded Wound-healing success decision |
| `pale-contract-collector` | bounded Salvage-loss decision |
| `relay-husk` | exact-instance Equipment-choice decision |
| `signal-rotted-engineer` | exact-instance Equipment-choice decision |
| `siren-relay-echo` | paired temporary Command-modifier decision |
| `soot-stained-cutpurse` | bounded Salvage-loss decision |
| `webglass-snarefield` | individual success-outcome redesign; existing failure handled separately |

## Distribution impact

No card is added, removed, retyped, or moved between lanes.

| Measure | Current | After both approved implementations | Change |
|---|---:|---:|---:|
| Red / Blue / Yellow | 26 / 35 / 48 | 26 / 35 / 48 | 0 |
| Overall Threats | 109 | 109 | 0 |
| Enemies / Hazards | 67 / 42 | 67 / 42 | 0 |
| Direct Wound failures | unchanged | unchanged | 0 |
| Direct Scar failures | unchanged | unchanged | 0 |
| Salvage pressure | unchanged | unchanged | 0 |
| Equipment interaction | unchanged | unchanged | 0 |
| Persistent owner interference | compatibility no-ops | +2 distinct delayed effects | +2 |
| Choice effects | unchanged | unchanged | 0 |
| Forced movement | unchanged | unchanged | 0 |
| Normal movement-roll pressure | 0 from these cards | +1 card | +1 |
| Global Escalation pressure | unchanged | unchanged | 0 |

This does not claim Relic-frequency parity and does not authorize the +116-card expansion.

## Implementation verification requirements

Each later implementation must prove stable identity, exact wording, no Heat, source ownership, non-stacking, reconnect reconstruction, stale/duplicate rejection, consumption exactly once, recall/replacement clearing, owner/public projection safety, unchanged success note, graph/catalog/art membership, 26/35/48 lane totals, 109 overall cards, and regression of B2A/B2B/B2C. Spindle additionally requires movement-value/gear-adjustment ordering and forced-displacement exclusion; Glass-Chime additionally requires eligible-test boundaries, solo reroll behavior, and existing Scar-trigger ordering.

## Scope confirmation

This approval changes reports only. The two existing untracked Heat-audit reports remain unmodified research. No Threat definition, legacy compatibility field, Scar rule, schema, validator, reducer, server path, UI, asset, card count, other Heat-linked decision, or expansion status changes in this pass.
