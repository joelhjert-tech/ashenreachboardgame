# Phase 1J — Mixed no-op Heat clause cleanup

## Outcome and reconciliation

Phase 1J removes 34 deliberate no-op Heat effects from branches that retain independently enforced typed effects. No replacement mechanic is added. Surviving effects keep their authored order, values, targets, branch conditions, identity, and resolution behavior.

Current content is authoritative. The older estimate of 39 mixed IDs does not reconcile to current branch arrays: 34 exact branch-level candidates exist. Five estimate-only records have no current same-branch candidate and are stale population estimates, not content changes. The requested `legacy-heat-content-migration-batches.md` is absent from this worktree; current content, Phase 1D evidence, and the compatibility validator provide the reproducible population.

Phase 1D also classified `anomaly-red-suture-field` as Heat-only. Current content pairs its Heat no-op with an enforced `gain_note` in the same sequence. It is therefore corrected into this mixed batch. The semantic Heat-only baseline is 29 IDs / 32 branches rather than 30 / 33; this pass leaves that corrected population unchanged.

## Counts

| Measure | Phase 1I report | Corrected preflight | After |
|---|---:|---:|---:|
| Heat-only IDs | 30 | 29 | 29 |
| Heat-only branches | 33 | 32 | 32 |
| Mixed branch-level IDs | ~39 | 34 | 0 |
| Heat-effect occurrences | 75 | 75 | 41 |
| Compatibility allowlist IDs | 99 | 99 | 71 |
| `gain_heat` | 59 | 59 | 27 |
| `gain_heat_all` | 4 | 4 | 3 |
| `lose_heat` | 12 | 12 | 11 |
| `lose_salvage` | 7 | 7 | 7 |
| Production `encounter_payment` | 1 | 1 | 1 |
| Player-facing Heat / Risk routes | 0 / 0 | 0 / 0 | 0 / 0 |
| Active `character.heat` reads / writes | 0 / 0 | 0 / 0 | 0 / 0 |

The two remaining production reads only copy the compatibility value into immutable resource snapshots; they do not validate, calculate payment, or mutate Heat.

## Classification matrix

`A` is safe sibling removal. `B` is safe removal plus narrow text correction.

| ID | Branch | Removed | Surviving active effects | Class / text |
|---|---|---|---|---|
| anomaly-cinder-gate-echo | `resolveEffect.effects` | `gain_heat_all 1` | scenario `gateEchoesPinned +1` | A |
| anomaly-red-suture-field | `resolveEffect.effects` | `gain_heat 1` | route note | A; corrects old Heat-only classification |
| anomaly-saint-static-aperture | `resolveEffect.effects` | `gain_heat 1` | scenario `sealRestorationMarks +1` | B; summary states seal progress only |
| anomaly-saltglass-fata-morgana | `resolveEffect.effects` | `gain_heat 1` | gear `blackstar-ampoule` | A |
| anomaly-scar-tide-lattice | `resolveEffect.effects` | `gain_heat 1` | heal 1 Wound, route note | A |
| anomaly-throne-shadow-jury | `resolveEffect.effects` | `gain_heat 1` | scenario `throneVerdicts +1` | A |
| anomaly-webglass-stutter | `resolveEffect.effects` | `gain_heat 1` | follower `red-march-guide` | A |
| artifact-ember-burden-idol | `resolveEffect.effects` | `gain_heat 1` | trophy 1, note | B; truthful summary |
| artifact-red-march-warbell | `resolveEffect.effects` | `gain_heat 1` | gear `red-march-warbell` | B; truthful summary |
| artifact-throne-crown-fragment | `resolveEffect.effects` | `gain_heat 1` | scenario progress +1, note | B; truthful summary |
| cartel-ledger-skim | `reward.effects` | `lose_heat 1` | trophy 1 | A |
| bellwire-snare | `failEffect.effects` | `gain_heat 1` | Wound 1 | A; Heat tag removed |
| breach-lens-overload | `failEffect.effects` | `gain_heat 2` | Wound 1 | A; Heat tag removed |
| cinder-veil-stalker | `woundOnLoss.effects` | `gain_heat 1` | Wound 1 | B; mechanical Heat wording/tag removed |
| emberwatch-sparkfall | `failEffect.effects` | `gain_heat 1` | Wound 1 | A; Heat tag removed |
| gate-choir-executioner | `woundOnLoss.effects` | `gain_heat 1` | Wounds 2 | A; Heat tag removed |
| glass-mire-stalker | `woundOnLoss.effects` | `gain_heat 1` | Wound 1 | A; Heat tag removed |
| hymn-scarred-zealot | `defeatReward.effects` | `gain_heat 1` | defeat note | A; separate Heat-only loss retained |
| iron-lung-grenadier | `woundOnLoss.effects` | `gain_heat 1` | Wound 1 | A; stable Heat-shaped reveal key retained |
| iron-synod-chirurgeon | `woundOnLoss.effects` | `gain_heat 1` | Wounds 2 | A; Heat tag removed |
| lalla-bubu-crownling | `woundOnLoss.effects` | `gain_heat 1` | Wound 1 | A; Heat tag removed |
| mirror-lord-envoy | `woundOnLoss.effects` | `gain_heat 1` | Wound 1 | A; stable Heat-shaped combat key retained |
| mirror-rot-interference | `failEffect.effects` | `gain_heat 2` | Wound 1 | A; separate Heat-only success retained |
| pale-cartel-shakedown | `woundOnLoss.effects` | `gain_heat 1` | Wound 1 | A; Heat tag removed |
| reliquary-judge | `woundOnLoss.effects` | `gain_heat 1` | Wound 1 | A; stable Heat-shaped reveal key retained |
| saint-of-ashes-echo | `failEffect.effects` | `gain_heat 2` | Scar `scar-wound-1` | A; Heat tag removed |
| shardvine-ambushers | `woundOnLoss.effects` | `gain_heat 1` | Wound 1 | A; Heat tag removed |
| shardwind-front | `failEffect.effects` | `gain_heat 1` | Wound 1 | A; Heat tag removed |
| starless-taxation | `failEffect.effects` | `gain_heat 2` | Scar `scar-wound-3` | A; Heat tag removed |
| static-censer-acolyte | `woundOnLoss.effects` | `gain_heat 1` | Wound 1 | A; Heat tag removed |
| suture-storm | `failEffect.effects` | `gain_heat 2` | Wound 1 | A; Heat tag removed |
| webglass-echo-trap | `failEffect.effects` | `gain_heat 1` | Wound 1 | A; Heat tag removed |
| webglass-snarefield | `failEffect.effects` | `gain_heat 1` | Wound 1 | A; separate Heat-only success retained |
| cinder-surgeon | `activeEffect.effects` | `gain_heat 1` | heal 1 Wound; existing discard limit | B; rule states heal then discard |

Totals: 28 A, 6 B, 0 ambiguous, 0 current Heat-only misclassifications, 0 defaults/metadata candidates, and five stale estimate-only records. One historical Heat-only classification is corrected above.

## Compatibility, tests, and critique

The allowlist falls from 99 to 71. Twenty-eight IDs leave it. Six targets remain: `hymn-scarred-zealot`, `mirror-rot-interference`, and `webglass-snarefield` retain separate Heat-only branches; `iron-lung-grenadier`, `mirror-lord-envoy`, and `reliquary-judge` retain stable Heat-shaped effect keys. Rust Choir Peddlers remains unchanged and allowlisted. Generic Heat discriminators still parse as deliberate no-ops.

The 34-ID manifest asserts exact surviving effect arrays, values, and order; retained/removed approvals; Rust Choir preservation; and rejection of new Heat. Focused verification passed 51 tests.

- **New Player:** outcomes describe only real effects; no branch is blank.
- **Optimizer:** no voluntary payment/trade branch entered the batch; current enforced balance is unchanged.
- **Family Player:** no new prompt or bookkeeping appears.
- **Rules Lawyer:** surviving order, values, targets, IDs, and compatibility keys remain deterministic.

No Salvage, Wound, Scar, Loss Pressure, Global Escalation, Equipment, test, movement, condition, payment, note, or resource effect was added. Existing siblings are preserved, not newly introduced. No schema, resolver, save field, session state, or global projection behavior changed.

Remaining: 29 Heat-only IDs / 32 branches; zero ambiguous mixed branches; 17 authored Heat defaults and other compatibility metadata; Rust Choir Peddlers; three higher-severity Salvage recommendations; two Equipment recommendations; six tests/challenges; three Wound recommendations after the Red Suture correction; one Scar; two Loss Pressure; two Global Escalation; eight bespoke rewrites; one retirement; save/schema cleanup; and Mirror-key migration.
