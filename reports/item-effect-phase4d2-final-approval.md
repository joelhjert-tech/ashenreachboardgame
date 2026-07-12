# Phase 4D2 final charged Artifact approval

## Scope and locked architecture

The remaining charged set contains exactly five canonical Artifacts and no normal Equipment: `artifact-choir-static-censer`, `artifact-heat-sink-prayer`, `artifact-oathchain-lens`, `artifact-rift-anchor-spike`, and `artifact-route-star`.

Every approved implementation must use exact owned-instance `currentCharges`, catalog `maxCharges` and `startingCharges`, atomic server resolution, independent duplicate copies, zero-charge/stale/wrong-seat rejection without spend, reconnect persistence, and `rechargeRule: none`. No round, reconnect, mission, shop, or scenario refresh is permitted. Heat, vague instability, event-log inference, and client-authored legality are excluded.

## Decision summary

| Artifact | Recommended exact rule | Charges | Timing | Additional cost | Complexity | Power risk | Readiness |
|---|---|---:|---|---|---:|---:|---|
| Choir Static Censer | Static Intercession: prevent 1 pending Wound from a failed Signal anomaly tile challenge | 2/2, cost 1 | Failure reaction before consequences | None | 3 | 2 | Ready |
| Scar-Sink Prayer | Admit the Fear: prevent 1 pending Wound from the owner’s Scar trigger | 2/2, cost 1 | Scar reaction before consequences | None | 3 | 2 | Needs decision/state |
| Oathchain Lens | Price Before Promise: privately reveal structured immediate contract costs and failure consequences | 2/2, cost 1 | Before accepting a displayed contract | None | 4 | 2 | Needs decision/data |
| Rift Anchor Spike | Refuse Displacement: cancel one pending forced relocation while preserving other consequences | 2/2, cost 1 | Before forced movement resolves | None | 4 | 3 | Blocked by migration |
| Route Star | Least-Hungry Road: choose the server-ranked least-threat legal route to the selected destination | 2/2, cost 1 | After destination selection, before route confirmation | None | 3 | 2 | Needs decision/planner support |

## 1. Choir Static Censer

**ID / display:** `artifact-choir-static-censer` — Choir Static Censer.

**Authored text:** Artifact: “A censored shrine tool with two stable burns left in its wired brass lung.” Granted gear: “Spend 1 charge to reduce anomaly instability by 1 or steady one scar trigger after a Signal check.”

**Compatibility:** card `charge: 2`; same-ID charged gear with `charges: 2`, `useLimit: charge`, `+1 Signal` compatibility data, relic-dealer/medicae-shrine categories. Generic legacy use records only a note. Exact-instance charged infrastructure exists; consequence-specific Censer behavior does not.

### Options

| Option | Exact player-facing rule | Authority, failure, and stacking |
|---|---|---|
| **A — Static Intercession (recommended)** | **“Reaction — Before Wounds from your failed Signal test against an Anomaly Challenge resolve, spend 1 charge to prevent 1 of those Wounds. The test still counts as failed, the challenge remains recurring, and all other consequences resolve normally.”** | Only a persistent `tileChallenge` with `challengeType: anomaly`, `testStat: signal`, final failed result, owner seat, and pending Wound delta qualifies. Reject after consequences or without a Wound. It may follow Choir Lantern or Mirror because it acts on the accepted final failure; Blackstar and Mirror resolve before it. Only one prevention item may modify the same Wound consequence. |
| B — Forewarning Smoke | “Before rolling an Anomaly Challenge test, spend 1 charge to reveal its complete currently server-known success and failure effects. Then roll normally.” | Owner-private information only; no random/hidden future outcome. Charge remains spent once information is revealed. Does not modify the test. Requires structured effect preview but no consequence suppression. |
| C — Ground the Result | “Reaction — After your Anomaly Challenge test fails, before consequences resolve, spend 1 charge to treat the final total as 1 higher for consequence-band selection only. The test still counts as failed.” | Valid only if authored challenges gain typed consequence bands; currently unsupported. Cannot turn failure into success or stack with another result adjustment. |

**Recommended final specification:** maximum/starting 2/2; one charge; owner only; equipped/active under existing Artifact rules; no Salvage/Wound cost. Success prevents exactly one pending Wound. Decline, stale reaction, wrong test/stat/type, no Wound, or depleted instance spends nothing. At zero charges it remains owned and inert.

**State/action/UI:** extend the existing persisted pending failure-consequence window with exact source classification and suppressible Wound amount; bind reaction ID, test/challenge resolution ID, seat, and instance ID. Phone: “Use Static Intercession? Spend 1 charge to prevent 1 Wound. The anomaly test still counts as failed.” TV: only “Choir Static Censer prevented 1 Wound” when publicly safe; never show remaining charges. Legacy charge migration initializes once.

**Recommendation:** Option A. It preserves post-Signal-pressure identity, is distinct from Choir Lantern’s pre-roll +2, and does not remove or suppress the recurring challenge.

Choir Static Censer:
- Selected option: [UNAPPROVED]
- Maximum charges: [UNAPPROVED]
- Starting charges: [UNAPPROVED]
- Cost per activation: [UNAPPROVED]
- Additional cost: [NONE / SALVAGE / WOUND / UNAPPROVED]
- Recharge: none
- Final rule text: [UNAPPROVED]

## 2. Scar-Sink Prayer

**ID / display:** legacy ID `artifact-heat-sink-prayer`; player-facing name **Scar-Sink Prayer**. The old Artifact title and “drinks excess Heat” wording are compatibility-only and must be removed from player-facing activation copy.

**Compatibility:** card `charge: 2`; gear `heat-sink-prayer`, display Scar-Sink Prayer, `charges: 2`, `useLimit: charge`, `+1 Signal` compatibility data, medicae-shrine/relic-dealer categories. There is no typed pending Scar-trigger reaction today.

### Options

| Option | Exact player-facing rule | Scar ownership and authority |
|---|---|---|
| **A — Admit the Fear (recommended)** | **“Reaction — Before an equipped Scar trigger causes you to suffer Wounds, spend 1 charge to prevent 1 of those Wounds. The Scar still triggers, remains owned, and all other effects resolve normally.”** | Prevents, never delays/removes, one Wound. Owner-only pending Scar trigger must expose its Wound delta. Reject non-Scar damage, resolved triggers, or zero pending Wounds. |
| B — Cold Litany | “After resolving an equipped Scar trigger, spend 1 charge to heal 1 Wound.” | Scar remains owned. Requires at least one existing Wound after full trigger resolution. Simpler ordering but can erase the consequence immediately and is therefore higher power. |
| C — Bear the Mark | “Reaction — Before an equipped Scar trigger causes you to suffer 2 or more Wounds, spend 1 charge and 1 Salvage to reduce that Wound amount by 2.” | Controlled optional Salvage cost; never below zero. More resource coupling and swing than the identity needs. |

**Recommended final specification:** Option A; 2/2, cost one charge, no additional cost. A persisted server reaction identifies Scar ID, owner, trigger ID, pending Wounds, and lifecycle revision. Phone uses the canonical name and exact prevented amount. TV shows only the public prevention. Zero charges means depleted/inert. Legacy ID remains stable for saves; legacy Heat copy is quarantined.

**Readiness:** Needs decision and a narrow pending Scar-trigger consequence state. Complexity 3/5; power risk 2/5. It never grants blanket immunity.

Scar-Sink Prayer:
- Selected option: [UNAPPROVED]
- Maximum charges: [UNAPPROVED]
- Starting charges: [UNAPPROVED]
- Cost per activation: [UNAPPROVED]
- Additional cost: [NONE / SALVAGE / WOUND / UNAPPROVED]
- Recharge: none
- Final rule text: [UNAPPROVED]

## 3. Oathchain Lens

**ID / display:** `artifact-oathchain-lens` — Oathchain Lens.

**Authored text:** “A cracked ledger-lens that shows the cost of every promise before the promise is made.” Current gear spends after a contract, oath, or bargain check merely to record the revealed cost.

**Compatibility/support:** card `charge: 2`, faction-relic classification; same-ID gear with `charges: 2`, `useLimit: charge`, `+1 Command` compatibility data. Mission offers and `COMPLETE_CONTRACT` exist, but there is no generic typed oath/bargain offer or private structured consequence preview.

### Options

| Option | Exact player-facing rule | Private data and boundary |
|---|---|---|
| A — Bind the Cost | “Before rolling a Command test explicitly sourced by your active contract, spend 1 charge to gain +2 Command for that test.” | Narrow and cheap, but depends on authored contract-test source classification and overlaps test boosters. It cannot complete or reward a contract. |
| **B — Price Before Promise (recommended)** | **“Before accepting a displayed Contract, spend 1 charge to privately reveal all immediate costs and failure consequences currently defined for that offer. Then accept or decline it. Hidden future events and rewards are not revealed.”** | Owner-only `PhonePatchPayload`; stable offer ID and revision. Charge is spent when the information is revealed, even if declined. Stale/changed offer rejects without spend. Solo/co-op/rivalry reveal only the owner’s server-known offer data and never another player’s mission or agenda. |
| C — Wider Reading | “When choosing a new Contract, spend 1 charge to reveal one additional server-selected eligible Contract option for you. Choose one offer or decline.” | Changes mission offer economy and needs deterministic option eligibility; no direct completion or reward. Higher balance surface. |

**Recommended final specification:** Option B; 2/2, one charge, no additional cost, owner-private before contract acceptance. It never changes objective progress, rewards, `completedContracts`, or `COMPLETE_CONTRACT`. TV may show “Oathchain Lens consulted” only after use, without offer details. Depleted behavior is inert retention; migrate legacy charges once.

**Readiness:** Needs decision and structured private offer-preview data. Complexity 4/5; power risk 2/5.

Oathchain Lens:
- Selected option: [UNAPPROVED]
- Maximum charges: [UNAPPROVED]
- Starting charges: [UNAPPROVED]
- Cost per activation: [UNAPPROVED]
- Additional cost: [NONE / SALVAGE / WOUND / UNAPPROVED]
- Recharge: none
- Final rule text: [UNAPPROVED]

## 4. Rift Anchor Spike

**ID / display:** `artifact-rift-anchor-spike` — Rift Anchor Spike.

**Authored text:** “A scorched brass spike that pins one impossible route to the board for a few breaths.” Acquisition currently grants normal `veil-hook` gear and a note instead of an owned Spike.

**Compatibility/support:** card `charge: 2`; no Spike gear definition, owned instance, typed effect, or migration. Existing charged movement items do not provide forced-displacement reaction state.

### Options

| Option | Exact player-facing rule | Authority and interactions |
|---|---|---|
| **A — Refuse Displacement (recommended)** | **“Reaction — Before an anomaly or route effect would move you from your current sector to another sector, spend 1 charge to remain in your current sector. The triggering test or effect still counts as resolved, and all other consequences apply.”** | Pending forced relocation must include source, from/to sectors, owner, and remaining consequences. Reject voluntary movement, already-resolved relocation, scenario-mandated transitions, and unrelated locks. It does not roll back movement. Void Key/Compass act during voluntary planning; Marrow acts on failed movement before consequences; Spike acts only on a later forced-relocation consequence. |
| B — Pin the Breach | “During movement planning, spend 1 charge to traverse one server-authored breach edge for this movement. Exact distance and every other route, gate, destination, threat, blocker, and scenario rule still apply.” | Requires canonical breach-edge data and planner support. Cannot invent topology or bypass scenario locks. Overlaps gate/movement family more strongly. |
| C — Local Anchor | “Before resolving an anomaly on your sector, spend 1 charge. Until that one resolution closes, forced movement cannot move any operative out of that sector.” | Party-wide one-resolution state, target scope, and public projection increase complexity and power. No permanent lock. |

**Recommended final specification:** Option A; 2/2, one charge, owner only, no extra cost, one pending relocation only. Original failure still counts when applicable. Reconnect preserves the pending reaction; resolving/declining expires it. TV may show “Rift Anchor held [operative] at [sector].” Zero charges is inert.

**Migration blocker:** replace the `veil-hook` acquisition only through a one-time compatibility migration that creates one exact Spike instance without duplicating rewards. Old saves that already received Veil Hook require an explicit conversion policy. Complexity 4/5, power risk 3/5; implementation remains **Blocked** until migration is approved.

Rift Anchor Spike:
- Selected option: [UNAPPROVED]
- Maximum charges: [UNAPPROVED]
- Starting charges: [UNAPPROVED]
- Cost per activation: [UNAPPROVED]
- Additional cost: [NONE / SALVAGE / WOUND / UNAPPROVED]
- Recharge: none
- Final rule text: [UNAPPROVED]

## 5. Route Star

**ID / display:** `artifact-route-star` — Route Star.

**Authored text:** “A dead-glass navigation star that points toward the route least hungry for blood.” Gear currently records a safer breach route without defining the mark, expiry, or benefit.

**Compatibility/support:** card and gear charges 2; same-ID charged gear, `+1 Guile` compatibility data. The authoritative planner already owns destination/route legality, but it does not expose a least-visible-threat route ranking action.

### Options

| Option | Exact player-facing rule | Route authority and stale handling |
|---|---|---|
| **A — Least-Hungry Road (recommended)** | **“After selecting a legal destination that has more than one legal route, spend 1 charge to select the server-ranked route with the fewest publicly visible Threats. Confirm that route or choose another destination. Exact movement distance and all normal route, gate, blocker, scenario, and destination rules still apply.”** | Server ranks already-authoritative route variants by visible Threat count with deterministic tie-breaking. No hidden cards are counted/revealed. Spend atomically when the ranked route is committed; changed destination/route revision rejects without spend. TV highlights the selected route and may label it “Route Star.” |
| B — Fixed Bearing | “After selecting one legal destination and route, spend 1 charge to preserve that route selection through one server-authored route-choice refresh before confirmation. If the route becomes illegal, the effect ends without making it legal.” | Requires a stable planner revision and narrow refresh definition. Charge spending/refund semantics are harder to communicate. |
| C — Mark the Crossing | “After completing movement, spend 1 charge to mark one traversed route tile. The next time you arrive there, reveal its currently public destination information before choosing onward movement, then clear the mark.” | Needs owner-persistent tile mark and offers weak/unclear value because public tile information may already be available. |

**Recommended final specification:** Option A; 2/2, cost one charge, no additional cost. Prompt only with at least two otherwise legal route variants to the same legal destination. It does not change rolled distance, topology, gates, or legality and cannot stack with a Compass adjustment or Void Key override in the same movement commitment window; finish those authoritative adjustments first, then recompute eligible variants. Gate-Saint and Marrow use different windows.

**Readiness:** Needs decision and bounded planner ranking/route-commit support. Complexity 3/5; power risk 2/5. Depleted behavior is inert retention; legacy charges migrate once.

Route Star:
- Selected option: [UNAPPROVED]
- Maximum charges: [UNAPPROVED]
- Starting charges: [UNAPPROVED]
- Cost per activation: [UNAPPROVED]
- Additional cost: [NONE / SALVAGE / WOUND / UNAPPROVED]
- Recharge: none
- Final rule text: [UNAPPROVED]

## Cross-item interaction and priority

| Artifact | May stack | Cannot stack / priority |
|---|---|---|
| Choir Static Censer | Choir Lantern may modify the pre-roll test; Mirror or Blackstar may act on the failed result first. | Final-result reroll/replacement windows close before Censer consequence prevention. Only one item may prevent the same Wound unit. The recurring anomaly remains. |
| Scar-Sink Prayer | Unrelated test modifiers and movement items. | Only one prevention source may modify the same Scar Wound unit. It does not act on anomaly failure unless the Wound source is independently a Scar trigger. |
| Oathchain Lens | May coexist with movement and battle items because it acts on a private contract offer. | Cannot expose rivalry agendas, another seat’s offer, hidden future randomness, or trigger mission completion. Offer revision invalidates stale use. |
| Rift Anchor Spike | Test/reroll items may resolve before a resulting forced-displacement consequence. | Forced-relocation reaction acts after final test outcome but before movement. It cannot combine with Marrow to produce two relocations, or with Void Key/Compass to rewrite voluntary movement. |
| Route Star | May follow a committed Compass adjustment or Void Key eligibility recomputation. | Only one route-selection Artifact may commit a route in the same movement window. Server recalculates after earlier movement modifiers; stale route IDs reject. |

Pending-window priority is: pre-roll modifiers (Choir Lantern) → authoritative roll → reroll/result replacement (Mirror/Blackstar where eligible) → final failure classification → consequence prevention (Censer/Prayer) or forced-displacement prevention (Spike) → consequence resolution. Movement planning uses Compass/Void Key first where applicable, recomputes legal routes, then Route Star selects among remaining legal variants. Mission lifecycle is unaffected; no item can call or bypass `COMPLETE_CONTRACT`.

## Recommended implementation order

1. **Choir Static Censer — Option A, Static Intercession**: safest next single-item slice; reuses persisted anomaly failure/consequence data, no migration, no targeting subsystem, and is distinct from Choir Lantern.
2. **Scar-Sink Prayer — Option A, Admit the Fear**: same prevention primitive after a typed Scar-trigger window exists.
3. **Route Star — Option A, Least-Hungry Road**: bounded planner enhancement with no topology changes.
4. **Oathchain Lens — Option B, Price Before Promise**: wait for structured private offer previews and rivalry audit.
5. **Rift Anchor Spike — Option A, Refuse Displacement**: last due to ownership/content migration and new forced-relocation reaction state.

## Final status

- Five remaining IDs confirmed exactly once.
- Recommended next Artifact: `artifact-choir-static-censer`.
- Ready for implementation after option approval: **1**.
- Needs final decisions or prerequisite typed data: **3**.
- Blocked: **1** (`artifact-rift-anchor-spike`).
- Highest risk: Rift Anchor Spike.
- No mechanics, content, schema, engine, UI, validation, or tests changed in this report-only pass.
