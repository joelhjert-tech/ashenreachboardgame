# Residual Heat Mechanics Design Resolution

Date: 2026-07-12
Status: recommendations pending approval; no mechanics changed

## Executive decisions

| Path | Current authoritative behavior | Preferred future design |
|---|---|---|
| Black Route Fuse | Standard, common, 3-Salvage Gear. Before a matching Grit battle roll it is discarded, adds +3 Grit, and advances escalation by 1. `heatCost: 1` is displayed as Risk but is neither validated nor deducted. | Delete `heatCost`. Keep discard, +3 Grit, matching-stat timing, and +1 escalation unchanged. Discard plus escalation is the complete cost. |
| `risk-action` shop service | Relic-dealer stock reveal of four options. `cost.heat: 1` is displayed but neither affordability nor payment reads Heat. | Replace with an authoritative **1 Salvage** reveal fee, paid before stock is revealed. Keep the service ID and four-card reveal. Purchases retain their normal Salvage prices. |
| `buy-boon` | Costs 2 Salvage, emits `heatDelta: -1`, adds a note, but shop resolution preserves Heat. The displayed Risk reduction therefore claims a mutation that does not occur. | Remove `heatDelta`. Retire the service from normal availability until a separately approved typed boon benefit exists; do not sell a note-only service. Preserve the ID as a compatibility alias. |
| Cross-seat nemesis defeat | Defeating another seat's bound nemesis grants 2 trophies and directly reduces the attacker's stored Heat by 1. This is the only confirmed direct Heat mutation. | Remove only the Heat reduction after Heat consumers are gone. Keep the 2-trophy reward and all nemesis outcomes. |
| Risk label | Temporary alias for legacy metadata/deltas; no visible meter or ordinary acquisition path. | Remove completely as each source migrates. Do not create a Risk resource or umbrella term. |
| `character.heat` | Required persisted number; generic effects are no-ops; old/QA state can be nonzero. | After all readers/writers disappear, preserve old values but ignore them. Make the field optional with default `0` at a versioned compatibility boundary, then stop writing it in new saves. Never convert it. |
| Mirror `heatThreshold` | Serialized session key used as Mirror reflection-pressure threshold. | Introduce `reflectionPressureThreshold`; new key wins, old key is fallback. Dual-read during compatibility; do not dual-write indefinitely. |

## A. Black Route Fuse

- **Access:** common standard Gear, available through Forge Armoury and Market stock; cost 3 Salvage; starting eligible.
- **Timing:** before the battle roll, only when the encounter uses the item's Grit stat.
- **Effect/lifecycle:** +3 Grit is attached to the pending roll; the item is discarded; escalation advances by 1.
- **Legacy cost:** `heatCost: 1`. The phone displays `Risk cost: 1`, but `assertGearUseAllowed`, `createGearUseAction`, and the reducer never check or subtract Heat. Tests seed Heat manually rather than prove an ordinary acquisition path.
- **New-session function:** fully usable at Heat 0. The displayed cost is misleading, not a functioning balance gate.

### Replacement comparison

| Model | Finding |
|---|---|
| Remove Heat cost, preserve discard | Preferred. Matches current enforced behavior and leaves two real costs: losing a 3-Salvage item and +1 escalation. |
| One Wound | Rejected. Adds recall pressure to an already destructive one-use effect. |
| Salvage | Rejected. A use-time currency payment is redundant after purchase and awkward in battle. |
| Charge | Rejected. Converts a common supply into persistent exact-instance Artifact infrastructure. |
| Frequency limit | Rejected. Discard already imposes the strictest limit. |
| Loss Pressure | Rejected. Turns a personal combat tool into shared defeat pressure. |
| Weaken/retire/redesign | Defer. No evidence that current +3/discard/escalation behavior is unbalanced. |

**Future rule:** “Before your Grit battle roll, break Black Route Fuse to gain +3 Grit for that roll. Advance escalation by 1, then discard this item.”

Implementation would remove `heatCost`, Risk copy, and compatibility expectations for this ID. Save compatibility needs no item-instance migration because the stable ID and discard behavior remain.

## B. Heat-cost shop services

Exactly one service uses `cost.heat`.

| Service | Shop | Benefit | Current cost behavior | Preferred replacement |
|---|---|---|---|---|
| `risk-action` / Risk Action | `risk-shop`, relic-dealer category | Reveal four risk-mode Gear/Artifact options | `{heat: 1}` is projected but ignored by both affordability functions and both shop cost reducers | Rename display to **Deep Relic Search**; preserve ID; charge **1 Salvage** before revealing stock; reject at 0 Salvage |

The recommended 1-Salvage fee differentiates the four-card relic search from the free three-card standard reveal without introducing injury or shared pressure. It is a proposed balance value. It applies in solo, co-op, and rivalry identically; the revealed stock stays public according to current shop projection.

`buy-boon` is not a Heat-cost service but is part of retirement because it emits `heatDelta: -1`. Its current 2-Salvage purchase produces no typed gameplay benefit. Preferred outcome: temporarily remove it from normal service projection, preserve `buy-boon` as a compatibility ID, and require a separate boon design before reactivation.

## C. Direct Heat mutation and deltas

### HM-001 — Cross-seat nemesis reward

- Trigger: attacker defeats a nemesis bound to another seat.
- Mutation: attacker gains 2 trophies and `heat = max(0, heat - 1)`.
- Reachability: ordinary nemesis play can reach it; the reduction matters only to legacy nonzero states.
- At zero: clamps to zero; no negative value.
- Projection: no dedicated `heatDelta` is emitted from this mutation.

Recommendation: retain until Fuse/service metadata and `heatDelta` consumers migrate, then remove the Heat assignment. Do not replace it; the trophy reward remains meaningful.

### HM-002 — `buy-boon` result delta

- Trigger: authoritative shop service resolution.
- Result: emits `heatDelta: -1` and a note.
- Mutation: none; `applyShopServiceToPlayer` explicitly preserves Heat.
- Presentation: Phase 1A can render “Risk reduced by 1,” making this a false result.

Recommendation: remove the delta in the same batch that removes `buy-boon` from normal availability. Deprecate `heatDelta` after payload consumers and legacy fixtures are versioned.

Dependency order: migrate Fuse -> migrate `risk-action` -> withdraw `buy-boon`/stop delta -> remove nemesis reduction -> stop all Heat reads/writes -> version persistence/projections.

## D. Risk terminology

Decision: **Risk disappears completely.** It is not a meter, is not normally gained, and currently labels unenforced or non-mutating values. Permanent Risk would add character-sheet and rulebook burden without a distinct gameplay role. Each migrated surface must display its actual cost (`Discard`, `Advance escalation by 1`, or `1 Salvage`) or no cost.

## E. `character.heat` retirement milestones

1. Stop new gameplay writes after the nemesis reward migration.
2. Remove active metadata readers after Fuse and shop migration.
3. Remove Risk/Heat projection and result-delta rendering.
4. Continue deserializing legacy values.
5. Ignore legacy values; no conversion or compensation.
6. Introduce a schema version and optional legacy field defaulting to zero.
7. Stop emitting the field in new serialized sessions.
8. Remove the canonical schema key only after supported old saves have migrated or expired.
9. Remove adapters and legacy fixtures last.

Old nonzero values should be **preserved but ignored** during the compatibility window. Moving them to an extension object adds migration work without gameplay value; converting them changes balance.

## F. Mirror threshold semantics

- Owner: session schema/state, currently required as `heatThreshold`.
- Consumer: Mirror of False Heroes compares `scenarioProgress.mirrorPressure` with `getMirrorReflectionPressureThreshold(state)`.
- Writes: initialized for every session; no generic Heat effect changes it.
- Other scenarios: no other authoritative threshold consumer found.

Future key: `reflectionPressureThreshold`. Migration contract:

1. Schema accepts both keys for one compatibility window.
2. Runtime reads `reflectionPressureThreshold ?? heatThreshold`.
3. New sessions and new saves write only the new key after the version boundary.
4. If both exist, the new key wins and disagreement is logged/tested.
5. Remove the old fallback only after legacy-save and reconnect fixtures pass through the formal migrator.

## G. Stable identifiers

Twenty-four exact identifiers or serialized constructs require an explicit disposition.

**Preserve permanently or as stable aliases (5):** `black-route-fuse`, `heat-sink-prayer`, `artifact-heat-sink-prayer`, `risk-action`, `buy-boon`.

**Deprecate after versioned migration (9):** `character.heat`, `heatThreshold`, `heatCost`, `cost.heat`, `heatDelta`, `HEAT_THRESHOLD_REACHED`, `gain_heat`, `gain_heat_all`, `lose_heat`.

**Preserve as read aliases until authored content migrates, then remove (10):** `threat_heat_on_reveal`, `threat_all_heat_on_reveal`, `threat_force_choose_heat_or_wound`, `threat_force_discard_gear_or_gain_heat`, `threat_combat_plus_one_if_player_has_heat`, `threat_pay_heat_or_enemy_plus_two`, `threat_fail_gain_heat`, `threat_fail_gain_two_heat`, `threat_fail_wound_and_heat`, `threat_defeat_reduce_heat`.

Machine IDs may retain legacy wording while all player-facing names use current terms.

## Mode, persistence, and automation conclusions

- No bots or automated-player-specific Heat spending path was found.
- Rivalry does not need a different replacement cost; no private Heat projection should be introduced.
- Reconnect currently preserves Heat because it serializes the full state. Future migration must preserve session sequence and pending reaction state while ignoring legacy Heat.
- Current Heat-heavy tests mostly protect compatibility, seeded legacy behavior, or fixtures—not a coherent active resource design.
