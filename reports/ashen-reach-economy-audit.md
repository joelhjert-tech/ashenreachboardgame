# Ashen Reach Economy Audit

## Final resource inventory

| Value | Role | Owner / visibility | Start / cap | Gain | Consume | Authority and persistence |
|---|---|---|---|---|---|---|
| Salvage | Ordinary currency | Operative; balance public, decisions private | 3 multiplayer, 4 solo; no cap | Typed rewards, Contracts, anomaly, sales | Purchases, services, typed pay/spend, floor-zero loss | Server reducer; v2 save/reconnect |
| Trophy value | Character progression | Operative; total public | 0; no storage cap | Eligible defeated enemies and explicit Trophy rewards | Permanent stat advancement only | Trophy pile plus numeric total; exact spend and replay-safe combat |
| Completed Contracts | Long-term rare access | Exact IDs private, count public | 0; no cap | `COMPLETE_CONTRACT` once | Exactly 3 for one of two Artifacts | Exact ID ledger; pending choice survives reconnect |
| Active Contract / progress | Objective state, not currency | Owner details; safe public summary | One active | Accept/progress | Completion transitions to archive | Server objective lifecycle |
| Equipment | Owned capability | Owner detail/public-safe summary | Character loadout | Loadout, shops, effects | Sale/discard/use rules | Exact instances and charges |
| Artifacts | Rare capability, not currency | Owner detail; public-safe acquisition | None in normal starting loadouts | Contract exchange and approved authored effects | Explicit consume effects only | Excluded from normal shops and sale |
| Wounds / Scars | Attrition | Operative | 0 / authored limits | Combat and effects | Prevention, treatment, relief | Independent of economy currencies |
| Global Escalation / Loss Pressure | Shared pressure | Public | Scenario defaults/caps | Shared rules | Scenario rules | Never accepted as payment |
| Scenario preparation / confrontation | Scenario state | Public or owner-safe | Scenario-defined | Scenario triggers | Confrontation rules | Never generic currency |
| Notes / character counters / charges | Permission or object state | Usually owner-private | Definition-defined | Exact effects | Exact abilities | Not accepted by ordinary economy APIs |

## Canonical Salvage sources

The canonical typed search found **10 authored gain leaves**: one Threat (`latchspire-raider`, +1), eight Contracts (`cartel-crossing-thread`, `choir-echo-triangulation`, `choir-hush-census`, `choir-well-canticle`, `clan-salt-burial`, `compact-equipment-requisition`, `contract-beacon`, `warden-span-vigil`, all +1), and one anomaly (`anomaly-bellrain-inversion`, +1). Sales are a separate server transaction source. Character/follower/item abilities may modify opportunity but do not create a generic client-authored balance.

| Classification | Count | Amount | Reliability |
|---|---:|---:|---|
| Threat victory | 1 | 1 | Conditional, combat |
| Contract reward | 8 | 1 each | One-time, mission-focused |
| Anomaly resolution | 1 | 1 | Conditional, Signal route |
| Equipment sale | Dynamic | Authoritative sale value | Voluntary, exact-instance |

The search also found **13 automatic `lose_salvage 1` leaves**: 12 Threat failures and one escalation. They are losses, not payments, and floor at zero.

## Salvage sinks and semantics

| Sink | Cost | Semantic | Insufficient funds | Replay/reconnect |
|---|---:|---|---|---|
| Normal Equipment | Item price 2-4 (average 2.90) | Spend/purchase | Reject | Stock entry and event identity prevent duplicate purchase |
| Repair Gear | 2 | Pay | Reject | Server action once |
| Supplies | 1 | Pay | Reject | Server action once |
| Treatment | 2 | Pay | Reject | Server action once |
| Encounter payment | Authored, normally 1 | Pay or decline | Paid branch disabled | Pending owner choice restored |
| Automatic authored loss | Normally 1 | Lose | Floor zero, effect continues | Source-event protection |
| Sale | Grants sale value | Sell exact instance | Item/restriction validation | Instance removed once |

Definitions: gain increases; lose is automatic floor-zero; pay/spend requires the full balance; possess is a non-consuming check; sell removes one exact instance; refunds require a named cancellation lifecycle. No current generic refund path exists.

## Equipment price audit

- Canonical normal-shop Equipment: **30**.
- Price range: **2-4 Salvage**; average **2.90**.
- Sale-profit violations: **0**.
- Artifact card catalog: **30**; eligible Artifact gear options: **24** plus QA-only definitions kept out of normal sessions.
- Normal shops filter Artifact tier structurally.
- Artifact tier is not sellable.
- Non-QA character starting gear contains no Artifact tier.

## Trophy lifecycle

Eligible enemy defeat adds the card's Trophy value and a pile entry once. Hazards, anomalies, and non-enemy encounters do not become Trophies. Stat advancement is server-authoritative, action-phase only, owner-only, capped by the existing normal stat cap, and costs the next stat value. `spendTrophyPileValue` consumes exact available value while preserving excess on partially spent cards. Trophies are not accepted by normal shop services.

## Completed Contract lifecycle

`COMPLETE_CONTRACT` validates the active objective, pays the immediate reward once, archives the exact stable Contract ID once, clears the active slot, and permits replacement acceptance. At a Relic Dealer, three stored IDs enable a two-option private reveal. No IDs are removed at reveal. Selecting an eligible option removes exactly those three IDs, grants one exact Artifact, clears the reveal, and returns the unselected option to eligibility. Repeated/stale/wrong-seat selections fail. With one eligible Artifact remaining the single option is offered; with zero the service rejects without spending.

## Confirmed gaps and exploit findings

| Finding | Previous behavior | Resolution |
|---|---|---|
| Artifact exchange skipped choice | One Artifact auto-granted and Contracts spent immediately | Two private choices; spend on accepted selection |
| Salvage-funded Artifact access | Deep Relic Search revealed Artifacts for 1 Salvage then sold them at Salvage prices | Removed from canonical services |
| Artifact resale | Artifact tier could convert to Salvage | Artifact tier now non-sellable |
| Private option leak | Revealed Artifact stock used the public shop projection | Only the owner phone receives choices |
| Terminology drift | UI said completed Missions | Canonical UI says completed Contracts |
| Solo fallback Artifact | Empty-loadout solo fallback was Veil Hook | Normal Equipment fallback is Field Lens |

No buy-low/sell-high, duplicate Contract reward, client-authored amount, or replayable accepted exchange remains in the tested paths.
