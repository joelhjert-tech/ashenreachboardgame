# Ashen Reach Map Topology Audit

## Direct answers

- **Outer to Middle:** seven bidirectional links; see the generated transition manifest.
- **Middle to Outer:** the exact reverse of all seven links.
- **Middle to Inner:** four bidirectional links. Only `middle_guardian_span -> inner_veil_rift` requires `guardian-span-clearance` in the standard mode.
- **Inner to Middle:** the exact reverse of all four links; outward travel is not clearance-gated.
- **Inner to Center:** `inner_gate_of_cinders` or `inner_blackstar_shortcut` to `center_cinder_gate`, both requiring `gate-of-cinders-breached`.
- **Center to Inner:** both reverse links are open; leaving the Core does not consume or require the breach note.
- **One-way routes:** none in the canonical graph.
- **Exact movement:** all cross-ring transitions require authoritative movement value 1 and end movement.
- **Transition tests:** tests happen as named board text or arrival challenges, never as an untyped client-side edge test.
- **Scenario preparation:** does not unlock topology. It modifies or qualifies the confrontation after legal arrival at the Core.
- **Nemesis Relay:** entering Inner or Center additionally requires the operative's Crown-Key Fragment.

## Clockwise canonical ring map

- **outer:** `north-dock-bastion` → `outer_waymarket` → `coldwind-wharf` → `outer_broken_causeway` → `emberwatch-step` → `cinder-fields` → `glassmere-spindle` → `outer_ember_sanctum` → `mirecoil-beacon` → `outer_oathpost` → `colony-outskirts` → `deadwater-marsh` → `votive-engine-room` → `ashwake-crossing` → `outer_surgery_tent` → `outer_salt_flats` → `rustveil-yard` → `sunken-pier` → `shattered-causeway` → `kettleward-foundry` → `flooded-locks` → `transit-gate` → `outer_relay_camp` → `hollow-veil-yard`
- **middle:** `middle_red_march_outpost` → `middle_anomaly_well` → `middle_shard_sprawl` → `middle_rivalry_pit` → `black-relay-spire` → `middle_relic_cache` → `the-salt-archive` → `middle_webglass_breach` → `middle_scar_surgery` → `weeping-ammunition-shrine` → `middle_guardian_span` → `red-lantern-trenches` → `scorched-road` → `blastworks` → `ashen-chapel` → `reavers-den`
- **inner:** `inner_gate_of_cinders` → `inner_choir_shrine` → `inner_cinder_lattice` → `choir-execution-court` → `inner_veil_rift` → `inner_tomb_gate` → `inner_blackstar_shortcut` → `the-bone-meridian`
- **center:** `center_cinder_gate`

## Reachability lower bounds from every Outer sector

Distances are graph-step lower bounds, not predicted turns: normal Outer/Middle movement is exact-distance, and a cross-ring crossing is selectable only when the movement value is 1.

| Start | Middle, no notes | Inner, no notes | Inner with Guardian clearance | Center with both clearances |
|---|---:|---:|---:|---:|
| `north-dock-bastion` | 3 | 4 | 4 | 8 |
| `outer_waymarket` | 2 | 3 | 3 | 7 |
| `coldwind-wharf` | 3 | 4 | 4 | 8 |
| `outer_broken_causeway` | 4 | 5 | 5 | 9 |
| `emberwatch-step` | 3 | 5 | 5 | 9 |
| `cinder-fields` | 2 | 4 | 4 | 8 |
| `glassmere-spindle` | 1 | 3 | 3 | 7 |
| `outer_ember_sanctum` | 1 | 2 | 2 | 6 |
| `mirecoil-beacon` | 1 | 3 | 3 | 7 |
| `outer_oathpost` | 1 | 4 | 4 | 8 |
| `colony-outskirts` | 2 | 5 | 5 | 8 |
| `deadwater-marsh` | 2 | 5 | 4 | 7 |
| `votive-engine-room` | 1 | 4 | 3 | 6 |
| `ashwake-crossing` | 2 | 3 | 3 | 7 |
| `outer_surgery_tent` | 3 | 4 | 4 | 8 |
| `outer_salt_flats` | 4 | 5 | 5 | 9 |
| `rustveil-yard` | 4 | 6 | 6 | 9 |
| `sunken-pier` | 3 | 5 | 5 | 8 |
| `shattered-causeway` | 2 | 4 | 4 | 7 |
| `kettleward-foundry` | 1 | 3 | 3 | 6 |
| `flooded-locks` | 2 | 4 | 3 | 6 |
| `transit-gate` | 1 | 5 | 2 | 5 |
| `outer_relay_camp` | 2 | 6 | 3 | 6 |
| `hollow-veil-yard` | 3 | 5 | 4 | 7 |

All 24 Outer starts reach Middle without notes. All starts reach Inner through the three ungated entrances; Guardian Span is the protected default breach, not the sole Inner entrance. Every start reaches the Core after the Gate breach note. No sector is disconnected and no forced displacement crosses rings.

## Gate proof

- **Guardian Span / Customs Gate:** Command 9 (seal alignment) or Signal 9 (ghost marker) grants owner-private `guardian-span-clearance`. Failure grants nothing and has no retired Heat consequence. The note is not consumed.
- **Cinder Lattice / Crownless Observatory:** Signal 10 or Guile 10 grants descriptive approach notes only. These notes are preparation/lore, not topology keys.
- **Gate of Cinders / Last Signal Well:** Grit, Signal, or Guile 12 grants owner-private `gate-of-cinders-breached`. Failure grants nothing. The note is not consumed.
- **Core:** exact stable ID `center_cinder_gate`; only the two authored Inner origins are accepted. Scenario art replaces presentation only.

## Mismatches found and resolved

1. Guardian Span text advertised Salvage and Guile paths that its resolver did not implement. It now names the existing Command and Signal choices.
2. Locked-route messages used lore names rather than the named clearance. They now state the exact lock reason.
3. Cross-ring links existed in topology but had no persistent TV treatment. The TV now draws all 13 canonical links, with gated links visually distinct.
4. The phone exposed only a generic Gate tag. Server projection now identifies inward/outward ring transitions and tells the player that exact movement 1 ends movement.

No visual-only route was proven. Map art is presentation and is not treated as an authority. Browser QA is used to confirm that the newly drawn canonical links remain understandable.
