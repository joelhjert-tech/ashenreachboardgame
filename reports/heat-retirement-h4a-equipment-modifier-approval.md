# Heat retirement Phase H4A: Equipment and modifier lifecycle approval

Status: APPROVED FOR LATER IMPLEMENTATION. This is a report-only decision pass against checkpoint `3a3d1f8`; it changes no Threat, mechanic, schema, runtime, projection, UI, asset, or card count.

## Decision summary

Phase H4A resolves the three temporary owner-pressure design gates without translating Heat into Wounds, Scars, Salvage loss, Global Escalation, or movement loss.

| Stable ID | Decision | Approved model | Severity | Implementation group |
|---|---|---|---:|---|
| `relay-husk` | APPROVED — IMPLEMENTED H4B | owner chooses one exact equipped normal Equipment instance; suppress it through the owner's next Threat resolution | 2 | shared Equipment suppression |
| `signal-rotted-engineer` | APPROVED — IMPLEMENTED H4B | after a combat loss, owner chooses one exact equipped normal Equipment instance; suppress it during the owner's next battle | 2 | shared Equipment suppression |
| `siren-relay-echo` | APPROVED | next eligible non-battle Command test gets `+1` after success or `-1` after failure | 2 | separate Command modifier |

The remaining six IDs stay BLOCKED and unchanged: `ashen-doppelganger`, `false-route-procession`, `gateblind-pulse`, `hymn-scarred-zealot`, `marrow-tax-auditors`, and `memory-tax-gate`.

## Current-card inspection

| Stable ID | Display / lane / type | Difficulty | Current rules and reward | Original Heat clause and runtime | Intent and overlaps |
|---|---|---:|---|---|---|
| `relay-husk` | Relay Husk; Yellow hazard | Guile 6 | success gains `marshal-seal`; failure has no effective consequence; no separate reward | failure `gain_heat 1` is parsed as a compatibility no-op | false instructions damage or misroute Equipment; closest overlaps are `wireghost-key`, `pale-cartel-shakedown`, and `signal-rotted-engineer` |
| `signal-rotted-engineer` | Signal-Rotted Engineer; Yellow enemy | Forge 4 | defeat; tool-rig reward note and 2 Trophies; current battle suppresses the Weapon slot; auxiliary failure note exposes held gear | loss `gain_heat 1` is a compatibility no-op | Equipment interference; closest overlaps are `rust-mote-drone`, `wire-chewer-pack`, and `relay-husk` |
| `siren-relay-echo` | Siren Relay Echo; Yellow hazard | Command 6 | both authored branches are currently ineffective; no reward | success `lose_heat 1` and failure `gain_heat 2` are compatibility no-ops | paired Command reinforcement/interference; closest overlaps are `false-route-procession`, `memory-tax-gate`, and `relay-husk` |

The authored/runtime mismatch is therefore exact: all three retain text/data branches that no longer change player state. Signal-Rotted Engineer's separate `threat_disable_weapon_bonus` remains active only during its current battle; its `threat_fail_drop_gear` remains a note, not item mutation.

Relevant current systems are authoritative exact `heldGear[].instanceId` ownership, slot-based equipped state, private phone inventory projection, battle/check source breakdowns, the Glass-Chime pending modifier lifecycle, reroll reuse of a committed source breakdown, reconnect serialization, recall cleanup, and session-end cleanup. The current `equippedGear` fields still identify catalog IDs, so implementation must augment or migrate equipped identity to exact owned-instance IDs before either Equipment choice can be accepted. A catalog ID must never be treated as sufficient when duplicate copies exist.

## Shared design boundary

- All effects belong to the resolving operative. They cannot inspect, target, or mutate another player's inventory.
- Equipment definitions, printed stats, charges, exhausted state, and consumed state remain unchanged. Suppression is a separate typed state.
- Private choices and exact inventory identities project only to the owner phone. TV/public state receives a concise source and expiry summary without item identity.
- Reconnect reconstructs committed pending choices and active effects; it never clears or replays them.
- Every creation and consumption is keyed by a server-authored source event ID. Display text, display names, and card prose are never parsed.
- Recall, operative replacement, session end, and room reset clear all effects owned by that operative. An exact suppression clears when its item leaves inventory and never transfers to another copy.

## Equipment eligibility and suppression contract

Relay Husk and Signal-Rotted Engineer use the same eligibility predicate:

- The item is owned by the resolving operative and is currently equipped.
- The exact owned instance has a non-empty `instanceId`; the server returns that ID as an eligible choice.
- Tier is `starter`, `standard`, or `advanced`. Tier `artifact` is excluded.
- `qaOnly` items are excluded.
- Carried but unequipped items are excluded.
- Consumables are excluded. They are not equippable under the current content contract.
- Depleted charged items are excluded; charged Equipment is currently Artifact-only and already excluded.
- Starting Equipment is eligible.
- An item must have a currently meaningful passive, conditional, stat, exhaust, or activated effect. A definition with no active contribution is ineligible. An exhausted normal item remains eligible when its equipped stat/passive contribution is still active or it can reset before expiry.

The authoritative suppression record must contain: owner seat ID, source Threat ID, unique source event ID, exact owned item instance ID, creation event/time, typed expiry (`nextOwnerThreatResolved` or `nextOwnerBattleResolved`), and active/cleared state. Suppression gates all contributions from that exact instance while active: no passive or conditional modifier, no activation or reaction, no charge/use consumption, and no appearance as active in a test or battle source breakdown. Owned item state remains intact.

Same source plus same item refreshes the one matching suppression; it does not create another penalty. Different named sources may suppress different exact instances. Two suppressions on one exact instance remain a Boolean disable, not a larger numerical penalty; each record still clears only at its own typed boundary.

Unequipping and re-equipping does not clear or transfer suppression. If the instance is unequipped at its expiry event, the event still consumes the effect. Selling, discarding, consuming, or otherwise removing the exact instance clears its suppression immediately and safely.

## Player-choice lifecycle

1. After the qualifying result is final, the server derives eligible exact instances from authoritative ownership and equipped state.
2. With no eligible instance, the source closes with a public-safe “no eligible Equipment” summary and creates no suppression.
3. Otherwise the server creates one mandatory owner-private pending choice and projects exact eligible instance IDs plus owner-readable names only to that phone.
4. The owner submits one exact instance ID. Catalog IDs and arbitrary IDs are invalid.
5. The server revalidates owner, current equipped state, eligibility, pending source event, and unhandled status.
6. One suppression is created or refreshed, the choice closes, and a public-safe “Equipment disrupted” result is emitted.

There is no cancel action and no automatic timeout target. The normal game waits for the mandatory selection; reconnect restores the same choice. A stale or no-longer-eligible selection is rejected and the refreshed eligible list remains pending, or the source closes with the no-target fallback if the list is now empty. A duplicate submission after closure is rejected/idempotently ignored and cannot create another effect. Recall or operative replacement during the choice closes it without applying suppression and performs normal recall cleanup.

## `relay-husk` option review

| Option | Clarity / choice / privacy | Complexity / severity / exploit risk | Decision |
|---|---|---|---|
| A: end of current turn | clear and owner-chosen, but often expires immediately after the hazard | medium interaction for little gameplay pressure; severity 1; low exploit risk | REJECTED as too transient |
| B: through next Threat resolution | visible event boundary, meaningful owner choice, owner-private target | medium-high typed lifecycle; severity 2; unequip does not erase or postpone consumption | SELECTED |
| C: deterministic target | fast, but highest-cost/recently-equipped rules expose or require incidental bookkeeping | medium complexity; weak thematic transparency; optimizer can pre-load the target rule | REJECTED |
| D: remove without replacement | perfectly clear and trivial | no interaction, but leaves the card's false-instruction Equipment identity entirely on its success branch | REJECTED |

### Approval block: `relay-husk`

- Current Heat behavior: failed Guile 6 hazard `gain_heat 1`, now a compatibility-only no-op.
- Original gameplay intent: false relay instructions temporarily disrupt the operative's Equipment.
- Selected retirement model: Option B, exact-instance Equipment suppression through the owner's next Threat.
- Trigger: after the failed Relay Husk test is final and its reroll/reaction window is closed.
- Eligible item type: currently equipped, non-QA, normal tier (`starter`, `standard`, `advanced`) Equipment with a meaningful effect; Artifacts, consumables, carried items, depleted charged items, and inert items are excluded.
- Target ownership: resolving operative only.
- Target-selection method: mandatory private server-supplied exact-instance choice; no deterministic auto-target.
- Duration: begins after Relay Husk finalizes. Relay Husk itself does not count. The suppression remains active throughout the next hazard or enemy Threat resolved by that owner and clears after that Threat's final authoritative result and reroll/reaction window.
- Cleanup/reset: clear on that consumption event, item leaving inventory, owner recall, operative replacement, session end, or room reset. End/start of turn and `ROUND_COMPLETED` do not clear it. Unequip/re-equip does not clear it.
- No-eligible-target fallback: no additional effect; resolution closes once with no pending suppression.
- Duplicate behavior: same source/item refreshes one record; duplicate source processing is rejected; same item has only Boolean suppression; different sources may target different instances.
- Reconnect behavior: pending choice or active suppression serializes and resumes at the same lifecycle point.
- Phone presentation: private item picker, then exact item name plus “through your next Threat.”
- TV presentation: “Relay interference: Equipment disrupted through the operative's next Threat”; no item name or inventory list.
- Typed runtime support: requires a pending exact-instance choice, exact equipped-instance identity, generic suppression gate, typed next-owner-Threat expiry, projections, and cleanup. Existing ownership/reconnect patterns can support it; current catalog-ID equipped state is not sufficient by itself.
- Final player-facing rule: “If you fail, choose one equipped normal Equipment. It provides no effects through your next Threat.”
- Severity: 2/5. Frequency: one graph reference. Avoidability: pass Guile 6 or have no eligible item. Recovery cost: one Threat without the item. Persistence: event-bounded, possibly across turns. Item dependency: medium. Multiplayer impact: none beyond public status. Bookkeeping: medium.
- Complexity: medium-high implementation, low ongoing table load once status is visible.
- Balance risk: medium; no-target loadouts nullify it, but they also forgo equipped normal Equipment. Exact-instance choice prevents duplicate-copy spillover.
- Approval status: APPROVED — IMPLEMENTED H4B.

## `signal-rotted-engineer` option review

| Option | Clarity / choice / privacy | Complexity / severity / exploit risk | Decision |
|---|---|---|---|
| A: end of current turn | simple, but post-battle timing makes it nearly consequence-free | medium interaction for severity 1 | REJECTED |
| B: start of next owner turn | clear clock boundary, but often suppresses only between turns when the owner cannot use the item | medium bookkeeping and low practical cost | REJECTED |
| C: during next battle | preserves Equipment sabotage and makes the loss consequence distinct from current-battle Weapon suppression | medium-high typed consumption; severity 2; unequipping costs the item anyway and does not retain the effect | SELECTED |
| D: fixed next-battle `-1` | reliable and cheap, but abandons the authored Equipment identity and overlaps generic delayed modifiers | low complexity; severity 2; no item dependency | REJECTED |

### Approval block: `signal-rotted-engineer`

- Current Heat behavior: combat loss `gain_heat 1`, now a compatibility-only no-op.
- Original gameplay intent: corrupt engineering disables useful Equipment; the current battle already suppresses Weapon-slot bonus.
- Selected retirement model: Option C, owner-selected exact Equipment suppression during the owner's next battle.
- Battle result trigger: loss only, after the combat result and all reroll/reaction decisions are final. Victory creates no post-battle suppression.
- Eligible item type: the same shared normal equipped Equipment predicate used by `relay-husk`; it is not limited to Weapon because the current battle has already disabled the Weapon slot and the authored loss note refers to held gear generally.
- Target ownership: losing operative only.
- Target-selection method: mandatory owner-private server-supplied exact-instance choice after final loss; no permanent discard and no automatic highest-cost target.
- Duration: pending after selection; active for the owner's next battle from battle setup through its final authoritative result and reroll/reaction window, then consumed. The lost Engineer battle never counts.
- Cleanup/reset: consume after the next owner battle whether or not the selected instance is still equipped. Clear earlier if the item leaves inventory, or on recall, operative replacement, session end, or room reset. Turns, rounds, and unrelated Threats do not clear it. Unequip/re-equip does not erase it.
- No-eligible-target fallback: no additional post-battle effect; ordinary loss closes.
- Duplicate behavior: same source/item refreshes one record and duplicate processing cannot queue another next-battle penalty. Different sources can target different instances; one item suppressed twice remains Boolean-disabled.
- Reconnect behavior: the private choice and committed suppression persist; reconnect cannot avoid, retarget, or duplicate the consequence.
- Interaction with battle rewards/trophies: the trigger is a loss, so no defeat reward or Trophy is granted. Suppression is created only after the current result is committed and cannot alter that result.
- Suppression timing relative to battle finalization: current `threat_disable_weapon_bonus` applies only to the Engineer battle; the new record is created afterward and first becomes eligible at battle setup for the owner's next battle.
- Charged/consumable/spent behavior: consumables and Artifacts are ineligible. Suppression never changes charges, exhaustion, uses, or consumed state and cannot consume a use while disabled.
- Phone presentation: private item picker, then exact item name plus “disabled during your next battle.”
- TV presentation: “Engineer interference: Equipment disrupted for the operative's next battle”; no item identity.
- Typed runtime support: shares Relay's exact-instance choice, suppression gate, projections, dedup, and cleanup; uses a different `nextOwnerBattleResolved` expiry. Existing battle-scoped slot suppression is evidence for gating but is not a persistence model.
- Final player-facing rule: “If you lose, choose one equipped normal Equipment. It provides no effects during your next battle.”
- Severity: 2/5. Frequency: two graph references. Avoidability: win Forge battle or have no eligible item. Recovery cost: one battle without one chosen item. Persistence: event-bounded. Item dependency: medium. Multiplayer impact: owner-only. Bookkeeping: medium.
- Complexity: medium-high implementation, low-medium player interaction.
- Balance risk: medium; selection lets an optimizer choose the least valuable eligible item, which is preferable to routine random destruction and is bounded to one battle.
- Approval status: APPROVED — IMPLEMENTED H4B.

## `siren-relay-echo` option review

The card's typed test stat and fiction both select Command. Lane identity is not used as a runtime test category.

| Option | Clarity / distinctness | Complexity / severity / exploit risk | Decision |
|---|---|---|---|
| A: next specified-stat test | exact typed Command scope; distinct from Glass-Chime's any-stat Hazard/tile penalty and Spindle's movement penalty | medium schema generalization; severity 2; paired success can be planned but not freely farmed | SELECTED as paired `+1/-1` |
| B: next test in lane | lane is card metadata, not a typed player-test context | would require ambiguous inference | REJECTED |
| C: first Command test before end of turn | visible expiry but often vanishes unused after hazard resolution | medium bookkeeping, low gameplay value | REJECTED |
| D: sector persistence | thematically possible but no existing local persistence lifecycle is justified | high bookkeeping and multiplayer ambiguity | REJECTED |

### Exact modifier contract

Eligible events are server-authored, rolled, non-battle Command tests owned by the affected seat: Threat hazards, tile challenges, Anomalies, and scenario or mission tests only when they enter the same typed authoritative Command-check pipeline. Battles, movement rolls, automatic effects, previews, payments, and another player's tests are excluded. Scar consequences are excluded unless they explicitly request a rolled Command test through that pipeline; the Scar event itself is not eligible.

Arithmetic uses the existing source pipeline: base stat, permanent sources, conditional character/Equipment/Artifact/Contract/scenario sources, other temporary sources, Siren source once, then the existing final-total minimum/clamp. Siren does not mutate the stored stat and introduces no new minimum. Differently named sources stack arithmetically. If Siren and Glass-Chime are both eligible for one Command Hazard/tile test, both appear once and both apply; `+1` and `-1` may cancel. Glass-Chime remains pending on Command contexts outside its own typed eligibility.

The modifier is attached to one test-resolution ID. It is shown on every authoritative roll/reroll breakdown for that same resolution but counted only once per roll, and it is consumed only when the final result and reroll/reaction window close. An invalid/stale request or preview cannot consume it.

### Approval block: `siren-relay-echo`

- Current Heat behavior: success `lose_heat 1` and failure `gain_heat 2`, both compatibility-only no-ops.
- Original gameplay intent: a resolved signal either reinforces or interferes with the operative's next Command effort.
- Selected retirement model: paired stat-specific delayed modifier.
- Exact stat/context: next eligible owner-authored non-battle Command test in the typed check pipeline.
- Battle eligibility: excluded, including Command battles.
- Trigger: after Siren Relay Echo's final success/failure and reroll/reaction window. Success creates `+1`; failure creates `-1`.
- Duration: persists until the next eligible Command test completes, or cleanup. End/start of turn and `ROUND_COMPLETED` do not expire it unused.
- Consumption timing: reserve for the accepted test-resolution ID; consume after that resolution's final authoritative result.
- Reroll behavior: reuse the same source once on each rerolled calculation in that resolution; do not add another copy and do not spend it on an abandoned preliminary roll.
- Minimum/clamp: ordinary existing final-total minimum/clamp after all sources; no stat mutation and no special Siren floor.
- Stacking: one pending Siren modifier per owner. A later Siren resolution replaces the prior amount and source (`+1` can replace `-1` and vice versa); it never queues or becomes `+2/-2`. Differently named eligible modifiers stack normally. Source-event dedup prevents replay.
- Cleanup/reset: clear on eligible-test consumption, recall, operative replacement, session end, or room reset. Turns, rounds, movement, battle, and ineligible tests leave it pending.
- Reconnect behavior: pending or reserved state persists and the same test-resolution ID completes once; reconnect cannot clear or duplicate it.
- Phone presentation: owner-only status “Siren Relay Echo: +1/-1 on your next non-battle Command test,” with pending/in-resolution state.
- TV presentation: concise public status that the operative has Command reinforcement/interference; no private modifier alternatives or unrelated state.
- Typed runtime support: generalize the existing Glass-Chime record to carry typed source ID, label, amount, stat, context eligibility, and resolution reservation. Current source-locked `nextNonBattleTest` schema cannot be reused unchanged.
- Final player-facing rule: “If you succeed, gain +1 on your next non-battle Command test. If you fail, suffer -1 on your next non-battle Command test.”
- Severity: 2/5. Frequency: three graph references. Avoidability: pass Command 6 for a benefit. Recovery cost: one bounded test. Persistence: until consumed/cleanup. Item dependency: none. Multiplayer impact: owner-only. Bookkeeping: low once projected.
- Complexity: medium.
- Balance risk: medium-low; paired outcome is legible, the bonus cannot queue, and the narrow Command scope prevents generic bonus farming.
- Approval status: APPROVED.

## Cleanup matrix

| Event | `relay-husk` suppression | `signal-rotted-engineer` suppression | `siren-relay-echo` modifier |
|---|---|---|---|
| effect consumption | clear after next owner Threat finalizes | clear after next owner battle finalizes | clear after reserved Command test finalizes |
| end of turn | retain | retain | retain |
| start of next turn | retain | retain | retain |
| `ROUND_COMPLETED` | retain | retain | retain |
| recall | clear; pending choice closes | clear; pending choice closes | clear |
| operative replacement | clear | clear | clear |
| item sold/discarded/consumed | clear that exact suppression | clear that exact suppression | not applicable |
| item unequipped | retain; next Threat still consumes | retain; next battle still consumes | not applicable |
| reconnect | restore unchanged | restore unchanged | restore unchanged |
| session end | clear | clear | clear |
| room reset | clear | clear | clear |

## Four-seat critique

| Seat | Relay Husk | Signal-Rotted Engineer | Siren Relay Echo |
|---|---|---|---|
| New player | phone names the item and says “through next Threat” | consequence is visibly separate from the lost battle and names “next battle” | exact Command icon/context and `+1/-1` endpoint are visible |
| Optimizer | worthless equipped gear can absorb it, but must be legitimately equipped and unequip cannot erase state | least-useful choice is allowed; unequipping still means fighting without that item and consumes the effect | identical copies cannot queue; success replaces failure and vice versa |
| Family/casual | one mandatory picker, then one event boundary | one mandatory picker, then one battle boundary | no choice; one projected token |
| Rules lawyer | current Relay excluded; exact instance; item-leave and recall cleanup explicit | loss-only; post-finalization; current battle excluded; rewards unchanged | Command/non-battle eligibility, arithmetic, rerolls, Glass-Chime stacking, and cleanup explicit |

## Implementation grouping and test gates

Relay Husk and Signal-Rotted Engineer may share one Equipment-suppression implementation because they use the same exact-instance ownership, eligibility, choice, projection, suppression, dedup, and cleanup contracts. Their only rule differences are trigger and typed expiry. The shared model must use an expiry enum; it must not store free-form predicates. Recommended later commit: `feat: retire equipment pressure heat threats`.

Siren Relay Echo remains separate because it changes the typed check modifier source model, eligibility, source breakdown, and reroll consumption. Recommended later commit: `feat: retire siren relay echo heat effect`.

Equipment implementation tests must cover duplicate catalog copies, exact equipped instance migration, owner/private projection, no-target fallback, stale/duplicate submissions, reconnect during choice and active suppression, all item-leave paths, unequip/re-equip, passive/conditional/exhaust/activation gating, no charge/use mutation, each expiry event, recall/replacement/session cleanup, and isolation between players.

Siren tests must cover success/failure replacement, identical-source dedup, all eligible and excluded contexts, other-seat isolation, normal stacking including Glass-Chime, source breakdown once, existing minimum/clamp, rerolls under one resolution ID, invalid requests, reconnect before and during consumption, and recall/replacement/session cleanup.

## Remaining blocked boundary

| Stable ID | Unresolved issue retained from prior triage |
|---|---|
| `ashen-doppelganger` | conditional 2-Wound severity and recall-rate impact |
| `false-route-procession` | forced-displacement destination, topology fallback, and reset |
| `gateblind-pulse` | Global Escalation amount, cap, threshold ordering, and scenario impact |
| `hymn-scarred-zealot` | loss-versus-defeat trigger conflict and routine-Scar severity |
| `marrow-tax-auditors` | four-reference Salvage starvation/frequency balance |
| `memory-tax-gate` | exact private choices, ownership, cancellation, projection, and reset lifecycle |

No redesign or status change for those six is authorized here. Threat totals remain Red 26, Blue 35, Yellow 48, overall 109. The +116-card expansion remains unapproved.
