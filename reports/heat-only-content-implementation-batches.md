# Heat-only content implementation batches

All entries remain pending approval. Each batch must start from a green baseline, update only named content plus focused tests/validation, and be independently revertible.

| Batch | Treatment | Count | IDs |
|---|---|---:|---|
| 1 | removals/text | 5 | anomaly-ashfall-murmur, anomaly-glassmere, escalation-ashfall-curfew, escalation-ridge-suture, escalation-webglass-afterimage |
| 2 | bounded rewards | 7 | cartel-crossing-thread, choir-echo-triangulation, choir-hush-census, choir-well-canticle, clan-salt-burial, contract-beacon, warden-span-vigil |
| 3 | economy/equipment | 14 | compact-equipment-requisition, escalation-crownfall-writ, ash-rat-skitter, bridge-toll-runt, crown-bell-baron, gate-tax-collectors, glass-chime-swarm, gutter-bell-mite, marrow-tax-auditors, pale-toll-enforcer, rust-choir-peddlers, rust-mote-drone, soot-stained-cutpurse, toll-scrip-urchins |
| 4 | tests/temporary effects | 6 | anomaly-bellrain-inversion, crownless-advocate, saltflat-bone-reader, bell-mask-pilgrim, mirror-mite-bloom, signal-rotted-engineer |
| 5 | shared scenario tracks | 4 | relay-pilgrim-riot, escalation-blackstar-hunger, escalation-choir-feedback, escalation-saltwind-lockdown |
| 6 | Wounds/Scar | 5 | anomaly-red-suture-field, escalation-marrow-surgery-debt, ash-cinder-runt, grave-silt-press, hymn-scarred-zealot |
| 7 | bespoke rewrites | 8 | cracked-censer-novice, false-route-procession, glasswing-midge-cloud, memory-tax-gate, roadside-bone-oracle, spindle-static-squall, lantern-moth-swarm, siren-relay-echo |
| 8 | retirement | 1 | void-salt-sickness |
| **Total** |  | **50** | |

## Batch contract

- **Entry:** exact IDs approved, current tests green, content validator understands the target typed effect, and any required authoritative state already exists.
- **Exit:** no Heat clause remains for the batch; exact content tests cover success, failure, lower bounds, stale/duplicate requests, reconnect, and public/private projection; full suite and content audit pass.
- **Rollback:** revert the single batch commit, restoring the deliberate no-op and its allowlist entry together.
- **Commit boundaries:** one commit per row above; split Batch 3 by rewards versus penalties if its diff exceeds a focused review.

## Dependencies and risk

- Batch 1 is safest and contains exactly the five removal rows in the decision matrix.
- Batch 2 uses existing Salvage gain and test systems.
- Batch 3 requires authoritative cost/loss floors and deterministic Equipment eligibility.
- Batch 4 may proceed only where existing temporary-modifier infrastructure supports the exact expiry. Otherwise mark the affected ID Blocked.
- Batch 5 needs scenario-specific frequency and Rivalry griefing approval.
- Batch 6 requires Wound prevention and Scar-trigger regressions; the Scar is its own commit if approved.
- Batch 7 must reuse existing movement/gate state and cannot add client legality.
- Batch 8 removes normal availability while retaining the stable ID as a compatibility alias.

## Four-seat batch critique

New players need outcome-first copy; optimizers need atomic payments and no double resolution; family players need batches to avoid adding simultaneous unfamiliar mechanics; rules lawyers need explicit caps, target ownership, and scenario-over-card priority tests.
