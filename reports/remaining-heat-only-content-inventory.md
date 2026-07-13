# Remaining Heat-only content inventory

Phase 1W baseline: `a0fe8e8d986069311358f916e759d42eb896fb6d`.

## Count correction

A recursive canonical-content scan finds **36 unique IDs, 38 explicit Heat-only branches, and 38 Heat-effect occurrences**. The discriminator split is exact: 25 `gain_heat`, 3 `gain_heat_all`, and 10 `lose_heat`. The inherited 27-ID / 29-branch estimate cannot be reproduced from current content or reachable history and is superseded for Phase 1W. Each explicit branch contains one Heat effect; `lantern-moth-swarm` and `siren-relay-echo` each own two branches. All 28 Threat IDs occur in the canonical sector graph. The remaining records are canonical loader content: one anomaly, one Contract, four escalations, and two followers.

The 52 compatibility approvals remain 38 Heat-effect approvals plus 14 other compatibility approvals. Two Heat-effect approvals (`anomaly-cinder-mirage-lane`, `artifact-cinder-suture-kit`) authorize text only and are not outcome entries in this inventory.

## Population

| ID | Name | File/category | Branches and Heat | Severity / route | Intro history |
|---|---|---|---|---|---|
| `anomaly-bellrain-inversion` | Bellrain Inversion | anomalies | `resolveEffect: lose_heat 1` | anomaly; graph x3 | `4ae3610` |
| `compact-equipment-requisition` | Equipment Requisition | contracts | `reward: lose_heat 1` | active Contract loader | `84904f8` |
| `escalation-blackstar-hunger` | Blackstar Hunger | escalations | `resolveEffect: gain_heat_all 1` | escalation; graph x3 | `1751f75` |
| `escalation-choir-feedback` | Choir Feedback | escalations | `resolveEffect: gain_heat_all 1` | escalation; graph x5 | `1751f75` |
| `escalation-marrow-surgery-debt` | Marrow Surgery Debt | escalations | `resolveEffect: gain_heat 1` | escalation; graph x1 | `1751f75` |
| `escalation-saltwind-lockdown` | Saltwind Lockdown | escalations | `resolveEffect: gain_heat_all 1` | escalation; graph x1 | `1751f75` |
| `ash-cinder-runt` | Ash-Cinder Runt | threats | `woundOnLoss: gain_heat 1` | S1 red outer; graph x2 | `35b22e0` |
| `ashen-doppelganger` | Ashen Doppelganger | threats | `woundOnLoss: gain_heat 2` | S4 blue inner; graph x3 | `1751f75` |
| `bell-mask-pilgrim` | Bell-Mask Pilgrim | threats | `woundOnLoss: gain_heat 1` | S1 blue outer; graph x2 | `85a7fd7` |
| `choir-static-burst` | Choir-Static Burst | threats | `failEffect: gain_heat 2` | S3 blue middle; graph x4 | `1751f75` |
| `cinder-gate-backlash` | Cinder Gate Backlash | threats | `successEffect: lose_heat 2` | S5 blue inner; graph x3 | `1751f75` |
| `cracked-censer-novice` | Cracked-Censer Novice | threats | `woundOnLoss: gain_heat 1` | S1 blue outer; graph x3 | `35b22e0` |
| `crown-bell-baron` | Crown-Bell Baron | threats | `woundOnLoss: gain_heat 2` | S3 yellow middle; graph x1 | `35b22e0` |
| `false-route-procession` | False-Route Procession | threats | `failEffect: gain_heat 2` | S2 yellow outer; graph x5 | `4ae3610` |
| `gateblind-pulse` | Gateblind Pulse | threats | `failEffect: gain_heat 2` | S4 blue inner; graph x3 | `1751f75` |
| `glass-chime-swarm` | Glass-Chime Swarm | threats | `failEffect: gain_heat 1` | S2 blue outer; graph x1 | `3b02f11` |
| `glasswing-midge-cloud` | Glasswing Midge Cloud | threats | `woundOnLoss: gain_heat 1` | S1 blue outer; graph x2 | `35b22e0` |
| `grave-silt-press` | Grave-Silt Press | threats | `failEffect: gain_heat 1` | S1 blue outer; graph x2 | `3b02f11` |
| `hymn-scarred-zealot` | Hymn-Scarred Zealot | threats | `woundOnLoss: gain_heat 1` | S1 red outer; graph x1 | `f3afbaf` |
| `lantern-moth-swarm` | Lantern-Moth Swarm | threats | `successEffect: lose_heat 1`; `failEffect: gain_heat 1` | S1 blue outer; graph x2 | `4ae3610` |
| `latchspire-raider` | Latchspire Raider | threats | `defeatReward: lose_heat 1` | S2 yellow outer; graph x1 | `3b02f11` |
| `marrow-tax-auditors` | Marrow-Tax Auditors | threats | `failEffect: gain_heat 2` | S2 yellow outer; graph x4 | `4ae3610` |
| `memory-tax-gate` | Memory Tax Gate | threats | `failEffect: gain_heat 2` | S3 yellow middle; graph x3 | `1751f75` |
| `mirror-mite-bloom` | Mirror-Mite Bloom | threats | `woundOnLoss: gain_heat 1` | S2 blue outer; graph x2 | `4ae3610` |
| `mirror-rot-interference` | Mirror-Rot Interference | threats | `successEffect: lose_heat 1` | S4 blue middle; graph x2 | `1751f75` |
| `pale-contract-collector` | Pale Contract Collector | threats | `woundOnLoss: gain_heat 2` | S2 yellow outer; graph x2 | `1751f75` |
| `relay-husk` | Relay Husk | threats | `failEffect: gain_heat 1` | S2 yellow outer; graph x1 | `3b02f11` |
| `relay-pilgrim-riot` | Relay Pilgrim Riot | threats | `woundOnLoss: gain_heat 1` | S2 yellow outer; graph x2 | `4ae3610` |
| `roadside-bone-oracle` | Roadside Bone Oracle | threats | `failEffect: gain_heat 1` | S1 blue outer; graph x2 | `4ae3610` |
| `signal-rotted-engineer` | Signal-Rotted Engineer | threats | `woundOnLoss: gain_heat 1` | S2 yellow outer; graph x2 | `f3afbaf` |
| `siren-relay-echo` | Siren Relay Echo | threats | `successEffect: lose_heat 1`; `failEffect: gain_heat 2` | S2 yellow outer; graph x3 | `1751f75` |
| `soot-stained-cutpurse` | Soot-Stained Cutpurse | threats | `woundOnLoss: gain_heat 1` | S1 yellow outer; graph x2 | `35b22e0` |
| `spindle-static-squall` | Spindle Static Squall | threats | `failEffect: gain_heat 1` | S2 blue outer; graph x3 | `4ae3610` |
| `webglass-snarefield` | Webglass Snarefield | threats | `successEffect: lose_heat 1` | S3 blue middle; graph x3 | `1751f75` |
| `crownless-advocate` | Crownless Advocate | followers | `activeEffect: lose_heat 1` | active follower loader | `658e49a` |
| `saltflat-bone-reader` | Saltflat Bone-Reader | followers | `activeEffect: lose_heat 1` | active follower loader | `658e49a` |

## Runtime and availability findings

- Generic Heat effects validate only through the construct-specific manifest and resolve as deliberate no-ops. They do not read or write character state and produce no current Heat/Risk projection.
- Threat hazards resolve their success/failure branch and leave normal continuation to the encounter engine. Enemy `woundOnLoss` runs on defeat failure while the enemy remains under existing cleanup rules.
- Canonical graph decks are shared by single-player, cooperative, and Rivalry setup. No reviewed Threat is QA-only or retired.
- Escalations and anomalies use their normal typed resolver; Contract rewards remain owned by `COMPLETE_CONTRACT`; follower active effects require owner-authoritative use and lifecycle handling.
- Current v2 runtime and snapshots are Heat-free. Strict v0/v1 compatibility, archival character-Heat metadata, and Mirror threshold migration are outside this population.

## Existing coverage and history

The introduction hashes above show five major authoring waves rather than a later coherent Heat balance pass. Later edits mostly added metadata, lane/region classification, or removed mixed siblings; they did not establish replacement semantics. Phase 1J explicitly retained three separate Heat-only branches and stable compatibility keys, but did not define the remaining outcomes. Existing validation proves manifest integrity and blocks unapproved Heat; engine tests prove generic no-op behavior, ordering, reconnect, Wounds, Salvage, pressure, payments, and projections. There is no focused behavioral coverage for these 38 no-op branches because they currently do not mutate gameplay.
