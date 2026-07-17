# Phase 1W decision specification

Status: report-only recommendations pending approval. This specification replaces the unavailable Phase 1D individual-decision, balance, and batching evidence with current repository-grounded analysis.

## Authoritative population

Current canonical content contains 36 effect-bearing IDs, 38 explicit branches, and 38 Heat effects: 25 `gain_heat`, 3 `gain_heat_all`, and 10 `lose_heat`. The former 27/29 estimate is superseded. `lantern-moth-swarm` and `siren-relay-echo` each own two branches; every branch owns one Heat effect. Compatibility approvals remain 52 and no implementation occurs in Phase 1W.

## Preferred decisions

| Primary treatment | Count | IDs |
|---|---:|---|
| Remove without replacement | 4 | `bell-mask-pilgrim`, `cracked-censer-novice`, `glasswing-midge-cloud`, `roadside-bone-oracle` |
| Gain Salvage | 2 | `compact-equipment-requisition`, `latchspire-raider` |
| Automatic Salvage loss | 5 | `escalation-marrow-surgery-debt`, `crown-bell-baron`, `marrow-tax-auditors`, `pale-contract-collector`, `soot-stained-cutpurse` |
| Gain/suffer Wounds | 6 | `ash-cinder-runt`, `ashen-doppelganger`, `choir-static-burst`, `grave-silt-press`, `mirror-mite-bloom`, `relay-pilgrim-riot` |
| Heal Wound | 3 | `cinder-gate-backlash`, `mirror-rot-interference`, `webglass-snarefield` |
| Scar | 1 | `hymn-scarred-zealot` |
| Loss Pressure | 2 | `escalation-choir-feedback`, `escalation-saltwind-lockdown` |
| Global Escalation | 2 | `escalation-blackstar-hunger`, `gateblind-pulse` |
| Equipment effect | 2 | `relay-husk`, `signal-rotted-engineer` |
| Attribute test/challenge | 1 | `anomaly-bellrain-inversion` |
| Temporary modifier | 3 | `glass-chime-swarm`, `siren-relay-echo`, `spindle-static-squall` |
| Movement/gate | 1 | `false-route-procession` |
| Bespoke rewrite | 4 | `lantern-moth-swarm`, `memory-tax-gate`, `crownless-advocate`, `saltflat-bone-reader` |
| Required/optional payment, retirement, compatibility cleanup, blocked | 0 | none |

Total: 36. Exact mechanics, values, timing, targets, fallbacks, wording, and tests are normative in `remaining-heat-only-individual-decisions.md`.

## Highest-impact decisions

1. Ashen Doppelganger: two Wounds can cross recall in one inner encounter.
2. Hymn-Scarred Zealot: persistent Bell-Deafened Scar with Wound duplicate fallback.
3. Blackstar Hunger: Global Escalation directly accelerates shared defeat.
4. Gateblind Pulse: personal failure becomes Global Escalation for the table.
5. Choir Feedback: one shared Loss Pressure step.
6. Saltwind Lockdown: one shared Loss Pressure step in every mode.
7. Relay Husk: private exact-instance utility loss needs a persisted choice.
8. Signal-Rotted Engineer: equipped weapon loss affects build viability.
9. Memory Tax Gate: private note deletion needs a new owner-only choice and fallback.
10. Crownless Advocate: payment discount touches atomic encounter-payment validation and round persistence.

## Approval and infrastructure gates

- Existing-mechanics-ready: Batch 1 removals and Batch 2 economy after direct balance approval; Batch 3A after Wound-frequency approval.
- Focused infrastructure: Batch 4 anomaly test/temporary state and Batch 6 exact-instance Equipment choice.
- Explicit high-risk approval: Batch 3B, Batch 5, and Batch 7.
- Bespoke approval: each Batch 8 ID independently. No combined “rewrite later” approval is valid.
- Current schemas do not provide a generic turn-expiring stat modifier or note/Equipment choice for these content branches. Do not simulate either with notes, client state, or prose parsing.

## Recommended next implementation: Phase 1X

Implement only `bell-mask-pilgrim`, `cracked-censer-novice`, `glasswing-midge-cloud`, and `roadside-bone-oracle` by removing their sole Heat clause without replacement. Preserve identity, severity, art, decks, rewards, enemy persistence, hazard continuation, and cleanup. Remove only their four effect approvals after content is Heat-free. Required tests: exact branch absence, unchanged non-Heat fields/routes, no false delta, normal loss/failure completion, reconnect/replay, approval count 52→48, population 36→32 IDs and 38→34 branches/effects, and unchanged 25/3/10 adjusted by their four `gain_heat` entries to 21/3/10.

Phase 1X needs explicit approval of the four no-replacement outcomes, but no new engine design.

## Compatibility implications

Phase 1W changes reports only. Runtime characters, v2 snapshots, projections, and gameplay remain Heat-free; v0/v1 parsing and archival metadata remain. Future content batches retain stable IDs and snapshot versions, remove approvals only when no Heat construct remains, and never reuse save migration for reconnect.

## Four-seat critique

- New Player: Batch 1 removes blank invisible clauses; later rules state exact visible resource/track effects and costs.
- Optimizer: economy effects are floor-zero losses, not payments; shared tracks cannot be targeted; choices use exact owned instances and replay guards.
- Family Player: the first three batches minimize prompts; persistent and bespoke choices are deferred into isolated phases.
- Rules Lawyer: branch ownership, ordering, fallback, prevention, maxima, expiry, privacy, and reconnect behavior are specified; save compatibility is separate from active content.

## Count reconciliation and acceptance

The five new reports plus two updated registers are the only Phase 1W files. Verification must prove 36/38/38 and 25/3/10, one primary decision per ID, totals summing to 36, approval count 52, zero current Heat reads/writes and projection keys, unchanged v0/v1/v2 behavior, nothing staged, and no commit.
