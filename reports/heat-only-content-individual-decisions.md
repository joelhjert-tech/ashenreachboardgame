# Heat-only content individual decisions

Status: **pending approval**. Baseline: `cd41d75`. This review changes no mechanics.

## Reconciliation and method

The Phase 1B population contains **50 primary IDs**. Current content resolves their `gain_heat`, `gain_heat_all`, and `lose_heat` members through the deliberate compatibility no-op. Three cards contain both gain and loss branches, so the population is 50 IDs but 53 Heat-effect branches. Notes and flavor are not authoritative effects. Separate card-level fields (for example an escalation delta) are surrounding card behavior, not a working replacement for the Heat-only branch.

Severity is current/proposed. Every proposal above 0 is a real rebalance. `Floor` defines incomplete resolution. All IDs remain stable.

| ID | Name | Category / branch | Current | Preferred treatment | Exact proposed effect | Sev. | Risk | Batch |
|---|---|---|---:|---|---|---:|---|---:|
| anomaly-ashfall-murmur | Ashfall Murmur | anomaly / recovery | 0 | Remove | Delete the no-op recovery; text: “The ash settles.” | 0 | Low | 1 |
| anomaly-bellrain-inversion | Bellrain Inversion | anomaly / recovery | 0 | Test | Signal 7; success gain 1 Salvage, failure no effect | 1 | Medium | 4 |
| anomaly-glassmere | Glassmere | anomaly / recovery | 0 | Remove | Delete the no-op recovery and rewrite as observation | 0 | Low | 1 |
| cartel-crossing-thread | Cartel Crossing Thread | contract reward | 0 | Salvage | On the existing reward branch gain 1 Salvage | 1 | Low | 2 |
| choir-echo-triangulation | Choir Echo Triangulation | contract reward | 0 | Salvage | On completion gain 1 Salvage | 1 | Low | 2 |
| choir-hush-census | Choir Hush Census | contract reward | 0 | Salvage | On completion gain 1 Salvage | 1 | Low | 2 |
| choir-well-canticle | Choir-Well Canticle | contract reward | 0 | Salvage | On completion gain 1 Salvage | 1 | Low | 2 |
| clan-salt-burial | Clan Salt Burial | contract reward | 0 | Salvage | On completion gain 1 Salvage | 1 | Low | 2 |
| compact-equipment-requisition | Compact Equipment Requisition | contract reward | 0 | Equipment | On completion draw one normal Equipment offer; owner may take one legal card or decline | 2 | High | 3 |
| contract-beacon | Contract Beacon | contract reward | 0 | Salvage | On completion gain 1 Salvage | 1 | Low | 2 |
| warden-span-vigil | Warden Span Vigil | contract reward | 0 | Salvage | On completion gain 1 Salvage | 1 | Low | 2 |
| escalation-ashfall-curfew | Ashfall Curfew | escalation recovery branch | 0 | Remove | Delete no-op recovery; preserve existing escalation delta | 0 | Low | 1 |
| escalation-ridge-suture | Ridge Suture | escalation recovery branch | 0 | Remove | Delete no-op recovery; preserve all other fields | 0 | Low | 1 |
| escalation-webglass-afterimage | Webglass Afterimage | escalation recovery branch | 0 | Remove | Delete no-op recovery; preserve all other fields | 0 | Low | 1 |
| crownless-advocate | Crownless Advocate | follower ability | 0 | Test | Once per round, before a Contract test, spend the existing timing opportunity for +1 Guile to that test | 1 | Medium | 4 |
| saltflat-bone-reader | Saltflat Bone Reader | follower ability | 0 | Test | Once per round, before an anomaly test, +1 Signal to that test | 1 | Medium | 4 |
| anomaly-red-suture-field | Red Suture Field | anomaly penalty | 0 | Wound | On the authored failure branch gain 1 preventable Wound | 3 | High | 6 |
| escalation-crownfall-writ | Crownfall Writ | escalation penalty | 0 | Salvage | Active operative loses up to 1 Salvage; floor 0 | 1 | Medium | 3 |
| escalation-marrow-surgery-debt | Marrow Surgery Debt | escalation penalty | 0 | Wound | Active operative gains 1 preventable Wound | 3 | High | 6 |
| ash-cinder-runt | Ash-Cinder Runt | Threat loss | 0 | Wound | On confrontation loss gain 1 preventable Wound | 3 | Medium | 6 |
| ash-rat-skitter | Ash-Rat Skitter | Threat loss | 0 | Salvage | Lose up to 1 Salvage; floor 0 | 1 | Low | 3 |
| bell-mask-pilgrim | Bell-Mask Pilgrim | Threat branch | 0 | Test | Faith is not canonical: use Signal 6; failure lose up to 1 Salvage | 2 | Medium | 4 |
| bridge-toll-runt | Bridge-Toll Runt | Threat toll | 0 | Salvage | Lose up to 1 Salvage; floor 0 | 1 | Low | 3 |
| cracked-censer-novice | Cracked-Censer Novice | Threat branch | 0 | Rewrite | Guile 6; success no effect, failure end this optional interaction | 1 | Medium | 7 |
| crown-bell-baron | Crown-Bell Baron | Threat loss | 0 | Salvage | Lose up to 2 Salvage; floor 0 | 2 | Medium | 3 |
| false-route-procession | False-Route Procession | route Threat | 0 | Rewrite | On loss, movement ends at the current authoritative sector; never undo resolved movement | 1 | Medium | 7 |
| gate-tax-collectors | Gate-Tax Collectors | toll Threat | 0 | Salvage | Pay up to 1 Salvage before reward; floor 0 and no debt | 1 | Low | 3 |
| glass-chime-swarm | Glass-Chime Swarm | Threat loss | 0 | Equipment | Discard one carried normal Equipment chosen by owner; if none, no effect | 2 | High | 3 |
| glasswing-midge-cloud | Glasswing Midge Cloud | Threat loss | 0 | Rewrite | Apply -1 Signal to the next test this turn; expires at turn end | 1 | High | 7 |
| grave-silt-press | Grave-Silt Press | hazard branch | 0 | Wound | On failed Grit test gain 1 preventable Wound | 3 | High | 6 |
| gutter-bell-mite | Gutter-Bell Mite | Threat loss | 0 | Salvage | Lose up to 1 Salvage; floor 0 | 1 | Low | 3 |
| hymn-scarred-zealot | Hymn-Scarred Zealot | Threat loss | 0 | Scar | Gain the specifically authored compatible Scar `Languishing Mind`; if already owned, gain 1 Wound instead | 4 | Critical | 6 |
| marrow-tax-auditors | Marrow-Tax Auditors | toll Threat | 0 | Salvage | Lose up to 2 Salvage; floor 0 | 2 | Medium | 3 |
| memory-tax-gate | Memory-Tax Gate | sector/gate | 0 | Rewrite | Guile 7; failure ends the gate interaction without moving | 2 | Medium | 7 |
| mirror-mite-bloom | Mirror-Mite Bloom | Threat loss | 0 | Test | Signal 6; failure applies -1 to the next Signal test this turn | 2 | High | 4 |
| pale-toll-enforcer | Pale Toll Enforcer | toll Threat | 0 | Salvage | Lose up to 1 Salvage; floor 0 | 1 | Low | 3 |
| relay-pilgrim-riot | Relay Pilgrim Riot | crowd Threat | 0 | Global Escalation | Increase Global Escalation by 1, capped by scenario rules | 2 | High | 5 |
| roadside-bone-oracle | Roadside Bone Oracle | optional trade | 0 | Rewrite | Owner may pay 1 Salvage to gain the existing reward; decline ends interaction | 1 | Medium | 7 |
| rust-choir-peddlers | Rust-Choir Peddlers | optional trade | 0 | Salvage | Pay 1 Salvage before receiving the existing offer; insufficient means decline | 1 | Low | 3 |
| rust-mote-drone | Rust-Mote Drone | Threat loss | 0 | Salvage | Lose up to 1 Salvage; floor 0 | 1 | Low | 3 |
| signal-rotted-engineer | Signal-Rotted Engineer | Threat loss | 0 | Test | Forge 7; failure applies -1 Forge to the next test this turn | 2 | High | 4 |
| soot-stained-cutpurse | Soot-Stained Cutpurse | theft | 0 | Salvage | Lose up to 2 Salvage; floor 0 | 2 | Low | 3 |
| spindle-static-squall | Spindle-Static Squall | anomaly/hazard | 0 | Rewrite | Signal 7; failure ends remaining movement without relocation | 2 | High | 7 |
| toll-scrip-urchins | Toll-Scrip Urchins | theft | 0 | Salvage | Lose up to 1 Salvage; floor 0 | 1 | Low | 3 |
| escalation-blackstar-hunger | Blackstar Hunger | party escalation | 0 | Loss Pressure | Increase Loss Pressure by 1, capped normally | 3 | Critical | 5 |
| escalation-choir-feedback | Choir Feedback | party escalation | 0 | Global Escalation | Increase Global Escalation by 1, capped normally | 2 | High | 5 |
| escalation-saltwind-lockdown | Saltwind Lockdown | party escalation | 0 | Loss Pressure | Increase Loss Pressure by 1, capped normally | 3 | Critical | 5 |
| lantern-moth-swarm | Lantern-Moth Swarm | success/failure polarity | 0 | Rewrite | Signal 6: success gain 1 Salvage; failure lose up to 1 Salvage | 1 | Medium | 7 |
| siren-relay-echo | Siren Relay Echo | success/failure polarity | 0 | Rewrite | Signal 7: success gain +1 to next Signal test this turn; failure -1 instead | 2 | High | 7 |
| void-salt-sickness | Void-Salt Sickness | success/failure polarity | 0 | Retire | Remove from normal availability; preserve ID as compatibility alias | 0 | Medium | 8 |

## Individual decision contract

Each matrix row is the complete primary decision for that ID. Implementation must additionally obey these common rules:

- **Timing and targets:** use the existing branch timing and affected seat unless the row explicitly names the party. Rewards resolve only after the branch succeeds; costs are validated before rewards.
- **Impossible resolution:** Salvage never goes below zero; discard choices do nothing when no eligible Equipment exists; capped shared tracks remain capped; movement restrictions never roll back resolved movement; temporary modifiers expire at turn end and cannot stack with themselves.
- **Prevention:** proposed Wounds use existing Wound prevention. Proposed Scar acquisition uses the authoritative Scar lifecycle and may not be prevented unless an existing eligible reaction says so.
- **Projection:** phone shows exact private choices and blocked reasons. TV shows only public-safe summaries. Rivalry never receives another seat’s private inventory or Contract data.
- **Testing:** every implementation needs acceptance, stale/duplicate rejection, reconnect, lower-bound, public/private projection, and sibling-branch regression tests.

## Alternatives and four-seat critique

- **New Player:** economic losses are stated numerically before voluntary choices; temporary modifiers name their expiry; no Heat or Risk vocabulary remains.
- **Optimizer:** zero Salvage is never debt or a free reward payment; discard cannot be aimed at another seat or at non-Equipment; shared pressure cannot exceed scenario caps.
- **Family Player:** most changes reuse Salvage, tests, Wounds, and existing tracks. The Lens-like temporary modifiers and the one Scar proposal need especially clear phone copy.
- **Rules Lawyer:** costs resolve before rewards, prevention applies only through established windows, movement never rewinds, and one source event resolves once.

The Scar, shared-pressure, temporary-modifier, equipment-offer, and retirement decisions require explicit approval. No recommendation is implemented by this report.
