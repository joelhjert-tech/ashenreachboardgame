# Item effect model audit

## 1. Executive summary

This report audits the 30 canonical normal Equipment records named by `itemTierSeparation.test.ts` and all 30 canonical Artifact cards. It is report-only: no item, schema, engine, UI, server, or asset file was changed.

The present system has two different item layers:

- Equipment and converted Artifact gear use `GearItem`, live in `heldGear` / `equippedGear`, and can carry `statBonus`, `useLimit`, `charges`, and `timingWindows`.
- Artifact cards use `ArtifactCard`. Resolving one may grant gear, grant a follower, add a note, advance scenario progress, or apply an immediate effect. The card's `charge` field is not itself a persistent current-charge counter.

Recommended classification across the 60 canonical records:

| Model | Equipment | Artifacts | Total |
| --- | ---: | ---: | ---: |
| Permanent passive | 8 | 2 | 10 |
| Conditional passive | 21 | 7 | 28 |
| Charged activation | 0 | 9 | 9 |
| Exhaust activation | 0 | 5 | 5 |
| Consumable | 1 | 7 | 8 |
| Passive with expendable charge | 0 | 0 | 0 |
| **Total** | **30** | **30** | **60** |

No current item justifies a hybrid model. The highest systemic risk is not raw balance but false authority: conditional Equipment bonuses are currently represented by a generic `statBonus`, while the server applies equipped bonuses to every matching-stat battle/check without encoding the card's stated condition. Artifact-card charges also do not consistently become persistent runtime charges.

Legend used in the tables:

- **Support:** `Full` means the named model and lifecycle are authoritative; `Partial` means some state/validation exists but the stated effect is incomplete; `Acquisition only` means the card resolves but its ongoing item model does not exist; `No` means the described ongoing effect is not authoritative.
- **Phone:** `Yes` means current state can be displayed; `Partial` means generic text/state appears but the required condition/reset/depletion detail does not; `No` means the relevant state does not exist.
- **Equipped:** whether the ongoing effect should require the item to occupy its slot. Consumables and acquisition-only cards use `No` unless activation from an equipped slot is intentionally selected later.

## 2. Current engine capability

### What exists

- Equipped `GearItem.statBonus` values are added by `getEquippedGearModifierSources`. Carried but unequipped items are excluded.
- Server roll breakdowns separate Base, permanent stat upgrades, equipped gear, afflictions, character/scenario effects, and pending temporary modifiers.
- The reducer rejects `USE_GEAR` at zero charges, spends one charge for `useLimit: "charge"`, removes gear when the action sets `discard`, and guards `oncePerTurn` / `oncePerRound` by event-log boundaries.
- Held gear, equipped IDs, current `charges`, and use history are in authoritative session state and therefore survive reconnect projections.
- Phone inventory can show equipped/carried state, timing status, charge counts, and generic readiness/lock reasons.
- Artifact acquisition effects are server-resolved through typed encounter effects.

### What does not exist or is incomplete

- Equipment conditions such as “in battle,” “on movement tests,” “against anomalies,” “during recovery,” “on locks,” or “in unstable sectors” are not typed. The generic equipped stat bonus applies more broadly than most wording implies.
- The phone player-card breakdown can calculate equipped gear totals, but it does not consistently present a single Base / Gear-Artifact / Temporary / Final breakdown for every check context.
- `ArtifactCard.charge` is acquisition metadata. It is not a per-owned-card current/max charge state unless the card grants a `GearItem` that separately has `charges`.
- `exhausted` exists on the gear schema but reset state is generally inferred from event history. There is no typed reset window beyond turn/round use limits and no encounter/test reset model.
- Recharge rules are not typed. No common server operation defines recharge amount, cap, timing, or eligibility.
- Artifact cards that become followers or notes do not remain as inspectable owned Artifact inventory objects.
- Generic item effects are not data-driven. Several special items rely on ID-specific server branches.
- Schema validation does not require an explicit effect model or require the fields appropriate to that model.

## 3. Equipment classification table

All 30 rows are normal Equipment (`startingEligible: true`, `normalShopCommon: true`). “Current effect” quotes or closely preserves the authored text. `Stat +1` refers to the existing `statBonus` field.

| ID / name | Subtype | Current effect | Support / phone | Recommended model | Timing; cost/reset/depletion; equipped | Problems and gaps | Risk / action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `rustknife-carbine` — Rustknife Carbine | weapon | +1 Guile “in close, dirty engagements” | Partial / Partial | Conditional passive | Battle/close engagement; none; Yes | “Close” has no typed meaning; server grants Guile on all matching checks. | M / Implement |
| `nailspike-maul` — Nailspike Maul | weapon | +1 Grit in battle | Partial / Partial | Conditional passive | Battle; none; Yes | Battle condition is text-only. | M / Implement |
| `emberlock-pistol` — Emberlock Pistol | weapon | +1 Command in battle | Partial / Partial | Conditional passive | Battle; none; Yes | Battle condition is text-only. | M / Implement |
| `chainhook-blade` — Chainhook Blade | weapon | +1 Guile “when fighting for position” | Partial / Partial | Conditional passive | Battle; none; Yes | “Fighting for position” is undefined. Clarify as battle or movement before implementation. | M / Clarify |
| `ashen-bayonet` — Ashen Bayonet | weapon | +1 Grit in battle | Partial / Partial | Conditional passive | Battle; none; Yes | Battle condition is text-only. | M / Implement |
| `stormcut-axe` — Stormcut Axe | weapon | +1 Forge in battle | Partial / Partial | Conditional passive | Battle; none; Yes | Battle condition is text-only. Advanced tier may warrant later balance review, not now. | M / Implement |
| `rivetplate-vest` — Rivetplate Vest | armour | +1 Grit while equipped | Full / Yes | Permanent passive | Continuous; none; Yes | Model is clear. Confirm all sale/loss paths unequip immediately. | L / Keep |
| `sootmantle-cloak` — Sootmantle Cloak | armour | +1 Guile while equipped | Full / Yes | Permanent passive | Continuous; none; Yes | Model is clear. | L / Keep |
| `ironhide-bracers` — Ironhide Bracers | armour | +1 Forge while equipped | Full / Yes | Permanent passive | Continuous; none; Yes | Model is clear. | L / Keep |
| `salvage-guard-mask` — Salvage Guard Mask | armour | +1 Signal while equipped | Full / Yes | Permanent passive | Continuous; none; Yes | Model is clear though “survey mask” could imply a condition; current text explicitly says equipped. | L / Keep |
| `chapel-guard-harness` — Chapel Guard Harness | armour | +1 Command while equipped | Full / Yes | Permanent passive | Continuous; none; Yes | Model is clear. | L / Keep |
| `wardens-kneeplate` — Warden's Kneeplate | armour | +1 Grit while equipped | Full / Yes | Permanent passive | Continuous; none; Yes | Model is clear. | L / Keep |
| `route-compass` — Route Compass | tool | +1 Signal on movement tests | Partial / Partial | Conditional passive | Movement test; none; Yes | Movement-test context is not typed into generic gear modifiers. | M / Implement |
| `field-lens` — Field Lens | tool | +1 Signal while inspecting hazards | Partial / Partial | Conditional passive | Hazard check; none; Yes | “Inspecting” is undefined; likely hazard/anomaly check context. | M / Clarify |
| `lockjaw-kit` — Lockjaw Kit | tool | +1 Guile on locks and bargains | Partial / Partial | Conditional passive | Lock/bargain checks; none; Yes | Neither lock nor bargain is a typed modifier context. | M / Implement |
| `bridge-spike` — Bridge Spike | tool | +1 Forge on route work | Partial / Partial | Conditional passive | Movement/route check; none; Yes | “Route work” is not typed. | M / Clarify |
| `static-probe` — Static Probe | tool | +1 Signal against anomalies | Partial / Partial | Conditional passive | Anomaly check; none; Yes | Anomaly condition is text-only. | M / Implement |
| `surveyor-chalk` — Surveyor Chalk | tool | +1 Command when coordinating movement | Partial / Partial | Conditional passive | Movement test; none; Yes | “Coordinating” is undefined and may imply assisting another player. | M / Clarify |
| `cinder-suture-kit` — Cinder Suture Kit | medical | +1 Forge during recovery work | Partial / Partial | Conditional passive | Recovery check/action; none; Yes | Recovery context is not a generic roll mode. | M / Implement |
| `saintwire-splint` — Saintwire Splint | medical/armor | +1 Forge “while holding together” | Partial / Partial | Conditional passive | Recommend recovery or wounded condition; none; Yes | Condition is poetic rather than actionable. | M / Clarify |
| `salt-gauze-wrap` — Salt Gauze Wrap | medical | +1 Grit while recovering | Partial / Partial | Conditional passive | Recovery; none; Yes | Recovery condition is text-only. | M / Implement |
| `last-breath-rivet` — Last-Breath Rivet | medical/armor | +1 Grit while equipped | Full / Yes | Permanent passive | Continuous; none; Yes | Name implies emergency use but mechanics are a permanent bonus; wording/model mismatch only. | M / Clarify |
| `ember-poultice` — Ember Poultice | supply | +1 Forge during recovery | Partial / Partial | Conditional passive | Recovery; none; Yes | Reads like a consumable but is authored as reusable passive Equipment. Do not change balance yet. | M / Redesign |
| `wound-clamp` — Wound Clamp | medical/armor | +1 Grit while equipped | Full / Yes | Permanent passive | Continuous; none; Yes | Model is clear. | L / Keep |
| `black-route-fuse` — Black Route Fuse | supply | Break for +3 Grit before battle; +1 escalation | Full for named branch / Partial | Consumable | Before battle roll; discard, +1 escalation; removed; No | Server special-case works and reducer discards, but cancellation/failure semantics and duplicate-intent test coverage should be explicit. Its stored `statBonus +1` conflicts with activated +3. | H / Clarify |
| `salvage-ledger` — Salvage Ledger | utility | +1 Guile during shop dealings | Partial / Partial | Conditional passive | Shop transaction/check; none; Yes | Shop actions currently do not generally roll through this modifier system. Effect may be non-functional. | H / Implement |
| `mirror-token` — Mirror Token | utility | +1 Command on contested tests | Partial / Partial | Conditional passive | Opposed/contested check; none; Yes | Contested-test context is not typed. | M / Implement |
| `oath-chain` — Oath Chain | utility | +1 Command when holding a vow | Partial / Partial | Conditional passive | While active contract/vow exists; none; Yes | “Vow” lacks a typed mapping; likely active Contract or note resource. | M / Clarify |
| `red-march-bell` — Red March Bell | utility | +1 Grit when danger closes | Partial / Partial | Conditional passive | Recommend battle or active threat; none; Yes | “Danger closes” is undefined. | M / Clarify |
| `signal-lantern` — Signal Lantern | utility | +1 Signal in unstable sectors | Partial / Partial | Conditional passive | Sector with anomaly/instability; none; Yes | Unstable-sector predicate is undefined. | M / Implement |

Equipment summary: 8 clear permanent passives, 21 conditional passives, and 1 consumable. Eight permanent items are substantially supported already. The other 22 need typed conditions or consumable lifecycle confirmation; nine of those primarily need wording decisions before engine work.

## 4. Artifact classification table

Artifact “current effect” includes what the card actually resolves, not only its flavor. An Artifact that grants gear/follower/note and then disappears is called out explicitly.

| ID / title | Kind | Current effect | Support / phone | Recommended model | Timing; cost/reset/depletion; equipped | Problems and gaps | Risk / action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `artifact-ashen-route-compass` — Ashen Route Compass | chargedRelic | Grants compass gear; 2 charges; soften movement/anomaly failure | Partial / Yes for granted gear | Charged activation | After failed movement/anomaly; 1 charge; no recharge; inert at 0; Yes (utility) | Card charge and gear charge are separate concepts; reset/recharge absent. | H / Implement |
| `artifact-bell-votive` — Bell Votive Casket | unspecified cache | Opens and grants Veil Hook plus note | Acquisition only / Partial | Consumable | On acquisition/open; consume card; removed after grant; No | `charge: 2` has no meaning and granted Veil Hook's model is not stated by this card. | H / Redesign |
| `artifact-black-route-fuse` — Black Route Fuse | cursedRelic | Grants Black Route Fuse gear | Full acquisition, activation special-cased / Partial | Consumable | Before battle; discard and +1 escalation; removed; No | Artifact `charge: 1` duplicates one-use gear semantics. | M / Clarify |
| `artifact-blackstar-ampoule` — Blackstar Ampoule | consumableSalvage | Grants one-use route-escape gear | Partial / Partial | Consumable | Failed movement/hazard; discard; removed; No | Granted gear lacks timing windows and effect implementation is not clearly authoritative. | H / Implement |
| `artifact-choir-lantern` — Choir Lantern | chargedRelic | Grants 2-charge ward-route gear | Partial / Yes | Charged activation | After Signal/anomaly; 1 charge; no recharge; inert at 0; Yes | Effect is mostly recorded as a note, not a typed route benefit. | H / Implement |
| `artifact-choir-static-censer` — Choir Static Censer | chargedRelic | Grants 2-charge anomaly/scar stabilizer | Partial / Yes | Charged activation | Signal/anomaly/scar window; 1; no recharge; inert at 0; Yes | Two alternative effects are not typed; timing windows absent. | H / Implement |
| `artifact-cinder-suture-kit` — Cinder Suture Kit | consumableSalvage | Grants normal passive Cinder Suture Kit gear | Full acquisition / Yes | Conditional passive | Recovery; none; Yes | Artifact claims one-use emergency treatment but grants reusable normal Equipment. Tier/power identity mismatch. | H / Redesign |
| `artifact-ember-burden-idol` — Ember Burden Idol | burdenRelic | Immediate +1 trophy, +1 heat, note | Full immediate / No owned state | Conditional passive | Recommend carried burden; no activation; lost when removed; likely Yes/Carried | Current card is a one-shot event, not an owned burden; no ongoing downside or inventory state. | H / Redesign |
| `artifact-fandiablos` — Fandiablos | factionRelic | Grants unique follower; refreshes start of owner's turn | Partial follower support / Partial | Exhaust activation | Follower timing windows; once/turn; start-of-turn reset; follower retained; No gear slot | Artifact charge is not follower use state; companion-specific paths exist. | M / Implement |
| `artifact-gate-saint-key` — Gate-Saint Key | gateRelic | Adds only a bargaining note | No ongoing authority / No | Charged activation | Final confrontation/gate; 1 charge; no recharge; consume or inert at 0; Carried | No owned Artifact or spend path; “may answer” is vague. | H / Implement |
| `artifact-heat-sink-prayer` — Heat-Sink Prayer | chargedRelic | Grants 2-charge stabilizing route-note gear | Partial / Yes | Charged activation | After space/scar; 1; no recharge; inert at 0; Yes | Name says Heat-Sink but authored effect does not explicitly remove Heat; actual benefit is vague. | H / Redesign |
| `artifact-last-breath-rivet` — Last-Breath Rivet | consumableSalvage | Grants permanent +1 Grit armor gear | Full acquisition / Yes | Permanent passive | Continuous; none; Yes | Artifact says one emergency brace but grants permanent Equipment; Artifact is weaker/less distinctive than common armor. | H / Redesign |
| `artifact-lucy-hell-puppy` — Lucy, Hell Puppy | factionRelic | Grants legendary follower, once-per-round support | Partial follower support / Partial | Exhaust activation | Follower windows; once/round; round reset; retained follower; No gear slot | Artifact itself has no owned state; follower reset is event-history based. | M / Implement |
| `artifact-marrow-route-key` — Marrow Route Key | gateRelic | Immediate scenario progress plus note | Full immediate / No owned state | Charged activation | Gate/final approach; 1; no recharge; consume/inert; Carried | Progress is granted on acquisition, so the key cannot later be chosen/spent. | H / Redesign |
| `artifact-mira-rift-twin` — Mira, Rift-Twin | factionRelic | Grants follower; Rumi +1 Signal/+1 Guile while following | Partial / Partial | Conditional passive | Continuous while follower present and owner is Rumi; none; removed with follower | Character/follower condition is explicit in note but needs authoritative modifier verification and player-card breakdown. | H / Implement |
| `artifact-mirror-reroll-token` — Mirror Reroll Token | factionRelic | Grants once-per-turn reroll gear with instability | Partial / Partial | Exhaust activation | After failed Guile/Signal; once/turn; turn reset; retained; Yes | Generic once-per-turn guard exists, but reroll/instability effect needs explicit authoritative path and timing. | H / Implement |
| `artifact-murkclaw-gravecrow` — Murkclaw & Gravecrow | factionRelic | Grants legendary follower, once-per-round omen support | Partial / Partial | Exhaust activation | Follower windows; once/round; round reset; retained follower | Artifact charge does not track follower readiness. | M / Implement |
| `artifact-oath-chain-ledger` — Oath-Chain Ledger | factionRelic | Grants contract object gear; convert reward into gear/scar relief/debt | Acquisition only / Partial | Conditional passive | On contract completion while held/equipped; none; Yes (utility) | Choice/effect is not typed or server-resolved; “protect” is undefined. | H / Implement |
| `artifact-oathchain-lens` — Oathchain Lens | factionRelic | Grants 2-charge bargain/contract route-note gear | Partial / Yes | Charged activation | After contract/oath/bargain check; 1; no recharge; inert at 0; Yes | Result is a generic note, not a defined mechanical benefit. | H / Implement |
| `artifact-pale-ledger-token` — Pale Ledger Token | factionRelic | Immediately grants fixer follower and note | Full acquisition / Partial | Consumable | On acquisition/bargain; consume token; removed; No | `charge: 1` is unused; note implies later use after token has already disappeared. | H / Clarify |
| `artifact-red-march-warbell` — Red March Warbell | cursedRelic | Grants once-per-turn +2 Grit battle gear and +1 Heat on acquisition | Partial special-case / Partial | Exhaust activation | Before battle; once/turn; turn reset; retained; Yes | Wording says exhaust but runtime readiness is event history; Artifact card `charge: 1` is misleading. | M / Clarify |
| `artifact-rift-anchor-spike` — Rift Anchor Spike | chargedRelic | Grants Veil Hook plus note; claims 2 charges | Acquisition only / Partial | Charged activation | Movement/shortcut; 1; no recharge; inert at 0; Yes | It grants the wrong/general gear identity and does not create a two-charge spike. | H / Redesign |
| `artifact-route-star` — Route Star | chargedRelic | Grants 2-charge safer-route note gear | Partial / Yes | Charged activation | After movement; 1; no recharge; inert at 0; Yes | Mechanical meaning of “record a safer route” is undefined. | H / Implement |
| `artifact-rune-eye-raven` — The Rune-Eye Raven | factionRelic | Grants legendary follower, once-per-round route-memory support | Partial / Partial | Exhaust activation | Follower windows; once/round; round reset; retained follower | Artifact charge is not runtime readiness. | M / Implement |
| `artifact-saintwire-splint` — Saintwire Splint | consumableSalvage | Grants normal passive +1 Forge armor | Full acquisition / Yes | Conditional passive | Recommend recovery/wounded; none; Yes | Card promises last-second one-use rescue but grants reusable normal Equipment. | H / Redesign |
| `artifact-throne-crown-fragment` — Throne-Crown Fragment | burdenRelic | Immediate scenario progress, +1 Heat, note | Full immediate / No owned state | Permanent passive | Recommend carried burden/progress token; no use; removed if lost; Carried | No persistent burden, leverage, or inventory object; currently a one-shot event. | H / Redesign |
| `artifact-void-key` — Void Key | gateRelic | Grants 1-charge gate-route gear | Partial / Yes | Charged activation | Gate/lock/final approach; 1; no recharge; inert/consumed at 0; Yes | Spending records a note rather than a typed gate override; depleted behavior unclear. | H / Implement |
| `artifact-void-salt-poultice` — Void-Salt Poultice | consumableSalvage | Heals 1 immediately and adds “ready” note | Full immediate / No inventory state | Consumable | On acquisition or chosen recovery; consume; removed; No | It heals before the player can choose timing, yet note says it remains ready. Contradictory lifecycle. | H / Redesign |
| `artifact-yard` — Yard Bellframe Core | unspecified cache | Grants Marshal Seal gear plus note | Acquisition only / Partial | Consumable | On opening; consume card; removed; No | `charge: 1` unused; granted Marshal Seal lacks a defined effect model. | H / Redesign |
| `artifact-zoey-thorn-violet` — Zoey, Thorn-Violet | factionRelic | Grants follower; triad bonus with Rumi and Mira | Partial / Partial | Conditional passive | Continuous while Zoey+Mira follow Rumi; none; removed with follower | Complex condition needs authoritative modifier source and clear phone breakdown. | H / Implement |

Artifact summary: nine charged activations, five exhaust activations, seven consumables, seven conditional passives, and two permanent burden/passive objects. Most are not end-to-end supported because the card layer frequently resolves into a different object or note.

## 5. Legacy/QA item notes

These records are outside the canonical 30+30 audit and must stay excluded from normal shops/progression:

| ID | Current shape | Audit note |
| --- | --- | --- |
| `qa_alpha_consumable_01` | `discard`, 5 charges | Contradictory: a discard consumable cannot normally have five activations. Keep QA-only or convert to charge use for stress tests. |
| `qa_alpha_consumable_02` | `discard`, 5 charges | Same contradiction; QA-only modifier-overflow tool. |
| `qa_alpha_armor_01` | passive Artifact armor | Timing says before damage but text says prevention after battle; ID-specific support should remain QA-gated. |
| `qa_alpha_relic_01` | five-charge +2-all-tests relic | Valid stress tool, not balanced content. |
| `qa_alpha_relic_02` | `oncePerTurn` plus five charges | Hybrid test object; intentionally exercises overlapping limits, not a model for production items. |
| `qa_alpha_tool_01` | once-per-turn gate/shop bypass | Highly privileged QA path; never expose to normal characters. |
| `qa_alpha_weapon_01` | passive +4 Grit | Modifier-overflow fixture only. |
| `qa_alpha_weapon_02` | once-per-turn +4 Forge/Guile | Multi-stat choice requires special handling; fixture only. |
| `riftblade`, `saintplate-harness`, `void-plate`, `mirecoil-wardcloak`, `scrap-drone`, `signal-pike` | noncanonical legacy gear | Retain for compatibility but do not count among canonical Equipment until explicitly promoted and classified. |
| Converted Artifact gear (`coffin-rig`, `marshal-seal`, `tuning-spines`, `veil-hook`, etc.) | runtime gear backing some Artifact cards | These require a later reconciliation pass so every canonical Artifact points to one matching runtime object rather than an alias, note, or unrelated gear record. |

Character abilities are otherwise out of scope. Follower-granting Artifacts were considered only to identify whether their resulting follower is passive or exhaust-limited.

## 6. Missing schema/state support

Recommended smallest extensible shape (names are recommendations, not implemented):

```ts
effectModel: "permanent" | "conditional" | "charged" | "exhaust" | "consumable" | "hybrid"

effect?: {
  requiresEquipped?: boolean
  activationTiming?: GearTimingWindow[]
  condition?: TypedItemCondition
  maxCharges?: number
  startingCharges?: number
  chargeCost?: number
  resetWindow?: "turn" | "round" | "encounter" | "test"
  consumeOnUse?: boolean
  depletedBehavior?: "inert" | "discard" | "retain-passive"
  recharge?: { timing: TypedRechargeTiming; amount: number; cost?: TypedCost }
}
```

Validation rules should require:

- `permanent`: `requiresEquipped: true`; no activation, charge, reset, or consume fields.
- `conditional`: a typed condition plus `requiresEquipped: true`; no manual activation unless promoted to justified `hybrid`.
- `charged`: positive max/starting charges, positive charge cost, activation timing, and depleted behavior.
- `exhaust`: activation timing and reset window; no numeric charges.
- `consumable`: activation timing and `consumeOnUse: true`; no reset or recharge.
- `hybrid`: both passive and activation definitions, permitted only by an explicit allowlist/review.

Runtime state should separate immutable definition from ownership state:

```ts
ownedItemState: {
  itemId: string
  currentCharges?: number
  exhausted?: boolean
  lastUsedTurn?: number
  lastUsedRound?: number
  acquiredInstanceId: string
}
```

Do not overload `ArtifactCard.charge` as current state. Treat it as definition-time starting/max data only after migration, or replace it with the proposed fields.

## 7. Phone UI requirements

Required player-facing fields:

- Model badge: Permanent bonus, Conditional bonus, Charged, Exhaust, or Consumable.
- Equipped / Carried state and slot.
- Stat breakdown: Base, permanent character upgrades, equipped Gear/Artifact, temporary/conditional modifiers active for this action, Final.
- Charges `current/max`, activation cost, and recharge condition.
- Ready / Exhausted plus exact refresh text such as “Ready next turn” or “Refreshes next round.”
- Consumable and “Discard after use.”
- Condition text and whether it is currently met.
- Depleted behavior: inert, discarded, or passive portion retained.

The current phone can display generic charges and timing, but it cannot reliably explain typed conditions, reset windows beyond turn/round, recharge rules, or why a conditional bonus is included in a specific Final value.

## 8. Server-authority requirements

- All bonus eligibility must be calculated from equipped IDs plus a typed context predicate. Never trust the phone to decide that a condition is met.
- Unequip, sale, discard, loss, replacement, and recall transitions must remove modifier eligibility atomically.
- Activation must validate ownership, equipped requirement, timing, condition, remaining charges/readiness, active seat/phase, and target before applying an effect.
- Charge/exhaust/consume mutation and effect resolution must be one authoritative reducer transaction. Duplicate intents must see the mutated state and reject.
- Failed or cancelled activations need an explicit rule: normally do not spend/consume unless the effect committed.
- Reconnect and snapshots must project current charge/readiness state from the server, not reconstruct it from UI history.
- Recharge/reset must cap at maximum and occur exactly once at its typed boundary.
- Artifact acquisition should produce a stable owned object when later activation/passive behavior is promised. Notes are not spendable or authoritative item state.
- Keep Equipment and Artifact catalogs/tiers separate even if both eventually share an owned-effect runtime structure.

## 9. Balance-risk watchlist

This is not a rebalance recommendation; it identifies items whose eventual implementation could materially change power.

High risk:

- All conditional Equipment currently applying as unconditional matching-stat bonuses, especially shop/recovery/movement tools.
- `black-route-fuse`: +3 activation, +1 escalation, discard timing, and conflicting stored +1 stat bonus.
- `salvage-ledger`: possibly non-functional today; implementing it could alter economy efficiency.
- Artifact cards that grant common Equipment (`Cinder Suture Kit`, `Last-Breath Rivet`, `Saintwire Splint`) and may be weaker than ordinary Artifact expectations.
- `Ember Burden Idol` and `Throne-Crown Fragment`: intended persistent burdens currently resolve as immediate rewards/costs.
- Gate relics: implementing real gate bypasses changes scenario access and must remain server-authoritative.
- Companion Artifacts (`Mira`, `Zoey`, Fandiablos and others): multi-stat/passive or repeatable support can become build-defining.
- `Rift Anchor Spike`, Bell Votive Casket, and Yard Bellframe Core: Artifact identity does not match the runtime gear granted.
- `Void-Salt Poultice`: immediate heal and future-ready note conflict.

Potentially underpowered Artifacts relative to Equipment:

- Acquisition-only note artifacts without a typed spend path.
- Artifact cards that merely grant an existing +1 normal Equipment item.
- Charged relics whose activation only records a note with no mechanical consequence.

## 10. Recommended implementation phases

### Phase 1: permanent and conditional passives

Start here. Add explicit `effectModel`, `requiresEquipped`, and typed conditions. Make server modifier selection context-aware, prove carried gear is excluded, prove unequip/sale/loss removes bonuses, and expose Base / Gear-Artifact / Temporary / Final on phone. Migrate the eight clear permanent Equipment items first, then conditional Equipment in small context groups (battle, movement, anomaly, recovery, shop/contract).

### Phase 2: consumables

Define atomic apply-then-remove behavior, timing, cancellation/failure rules, and duplicate-intent rejection. Begin with Black Route Fuse because it already has a server path, then reconcile Artifact consumables that currently heal/grant gear immediately.

### Phase 3: exhaust/reset-window items

Add typed reset windows and authoritative readiness. Migrate Red March Warbell and Mirror Reroll Token, then follower-granting Artifacts. Prefer boolean/boundary state over fake numeric charges.

### Phase 4: numeric charges and recharge

Separate definition max/starting charges from owned current charges. Add charge-cost validation, zero-charge rejection, reconnect persistence, depleted behavior, and typed recharge. Migrate one simple relic (Void Key) before route/note relics.

### Phase 5: Artifact-specific hybrids only where justified

Reconcile card-to-owned-object identity, persistent burdens, gate relics, companions, and any true passive-plus-charge design. No current canonical item requires hybrid classification yet; introduce it only after a concrete design proves both parts necessary.

## Audit disposition

- Total canonical items audited: 60 (30 Equipment, 30 Artifacts).
- Already substantially supported under the recommended model: 8 Equipment permanent passives, Black Route Fuse's core consumable path, and immediate acquisition effects; full end-to-end support is narrower because conditions and Artifact ownership are not typed.
- Wording/identity clarification before engine work: at least 9 Equipment and 8 Artifacts.
- Engine/state implementation required: 21 conditional Equipment effects and most ongoing Artifact effects.
- Recommended first implementation: Phase 1 permanent and conditional passives, beginning with permanent Equipment and battle-only weapon conditions.
