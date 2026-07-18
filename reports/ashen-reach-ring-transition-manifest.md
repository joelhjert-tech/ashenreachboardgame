# Ashen Reach Ring Transition Manifest

Generated from the canonical graph and board-space requirements. Movement authority remains in `movementPlanner.ts`.

## Exact Outer to Middle transitions

| Source | Destination | Direction | Movement | Notes or clearance | Lock text |
|---|---|---|---|---|---|
| `glassmere-spindle` | `black-relay-spire` | inward | 1 exactly | None | Open |
| `outer_ember_sanctum` | `middle_red_march_outpost` | inward | 1 exactly | None | Open |
| `mirecoil-beacon` | `middle_webglass_breach` | inward | 1 exactly | None | Open |
| `outer_oathpost` | `the-salt-archive` | inward | 1 exactly | None | Open |
| `votive-engine-room` | `weeping-ammunition-shrine` | inward | 1 exactly | None | Open |
| `kettleward-foundry` | `middle_shard_sprawl` | inward | 1 exactly | None | Open |
| `transit-gate` | `middle_guardian_span` | inward | 1 exactly | None | Open |

## Exact Middle to Outer transitions

| Source | Destination | Direction | Movement | Notes or clearance | Lock text |
|---|---|---|---|---|---|
| `middle_red_march_outpost` | `outer_ember_sanctum` | outward | 1 exactly | None | Open |
| `middle_shard_sprawl` | `kettleward-foundry` | outward | 1 exactly | None | Open |
| `black-relay-spire` | `glassmere-spindle` | outward | 1 exactly | None | Open |
| `the-salt-archive` | `outer_oathpost` | outward | 1 exactly | None | Open |
| `middle_webglass_breach` | `mirecoil-beacon` | outward | 1 exactly | None | Open |
| `weeping-ammunition-shrine` | `votive-engine-room` | outward | 1 exactly | None | Open |
| `middle_guardian_span` | `transit-gate` | outward | 1 exactly | None | Open |

## Exact Middle to Inner transitions

| Source | Destination | Direction | Movement | Notes or clearance | Lock text |
|---|---|---|---|---|---|
| `middle_red_march_outpost` | `choir-execution-court` | inward | 1 exactly | None | Open |
| `middle_anomaly_well` | `inner_cinder_lattice` | inward | 1 exactly | None | Open |
| `middle_rivalry_pit` | `choir-execution-court` | inward | 1 exactly | None | Open |
| `middle_guardian_span` | `inner_veil_rift` | inward | 1 exactly | guardian-span-clearance | Requires Guardian Span Clearance |

## Exact Inner to Middle transitions

| Source | Destination | Direction | Movement | Notes or clearance | Lock text |
|---|---|---|---|---|---|
| `inner_cinder_lattice` | `middle_anomaly_well` | outward | 1 exactly | None | Open |
| `choir-execution-court` | `middle_red_march_outpost` | outward | 1 exactly | None | Open |
| `choir-execution-court` | `middle_rivalry_pit` | outward | 1 exactly | None | Open |
| `inner_veil_rift` | `middle_guardian_span` | outward | 1 exactly | None | Open |

## Exact final center entries

| Source | Destination | Direction | Movement | Notes or clearance | Lock text |
|---|---|---|---|---|---|
| `inner_gate_of_cinders` | `center_cinder_gate` | inward | 1 exactly | gate-of-cinders-breached | Enter the Core from the Last Signal Well or Dead Star Reliquary |
| `inner_blackstar_shortcut` | `center_cinder_gate` | inward | 1 exactly | gate-of-cinders-breached | Enter the Core from the Last Signal Well or Dead Star Reliquary |

## Center return routes

| Source | Destination | Direction | Movement | Notes or clearance | Lock text |
|---|---|---|---|---|---|
| `center_cinder_gate` | `inner_gate_of_cinders` | outward | 1 exactly | None | Open |
| `center_cinder_gate` | `inner_blackstar_shortcut` | outward | 1 exactly | None | Open |

All 13 physical cross-ring links are bidirectional. Requirements are evaluated on the destination, so the Guardian Span and Core clearances gate inward travel only. A cross-ring move is offered only at authoritative movement value 1 and ends movement.
