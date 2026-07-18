# Ashen Reach Encounter Composition Audit

## Root cause

Before this pass, the 109 canonical Threats were mechanically 67 enemy battles and 42 fixed-difficulty tests. Presentation was 67 Enemy, 33 Hazard, 3 Event, 3 Encounter, and 3 asset/discovery. The three asset-labelled cards still resolved as ordinary tests and their rewards did not provide canonical normal Equipment. Consequently 91.7% of visible Threat draws read as Enemy or Hazard and the opportunity rhythm was effectively absent.

The draw pools, queue, projection, and deterministic random source were working. The defect was content composition plus presentation taxonomy—not a client-side randomizer or a resolver silently discarding categories.

## Before and after

| Lane | Total | Enemy | Hazard | Event | Encounter | Equipment discovery | Follower discovery |
|---|---:|---:|---:|---:|---:|---:|---:|
| Red | 26 | 16 | 6 | 1 | 2 | 1 | 0 |
| Blue | 35 | 15 | 12 | 3 | 2 | 1 | 2 |
| Yellow | 48 | 36 | 2 | 2 | 2 | 4 | 2 |
| **After** | **109** | **67** | **20** | **6** | **6** | **6** | **4** |

Percentages after: Enemy 61.5%, Hazard 18.3%, Event 5.5%, Encounter 5.5%, Equipment discovery 5.5%, Follower discovery 3.7%. Non-enemy discovery/event/test presentation is 38.5%, closely matching the 36.2% non-enemy share of Relic’s three ordinary decks. Mechanical lifecycle remains 67 battles and 42 tests; the taxonomy describes what the encounter is, not a second resolver.

Lane totals remain Red 26, Blue 35, Yellow 48, total 109. No card from the unapproved +116 expansion was activated.

## Converted or reclassified cards

| Stable ID | Lane | Final category | Authoritative success |
|---|---|---|---|
| `breach-halberd` | Red | Equipment discovery | Bridge Spike |
| `breach-lens-overload` | Yellow | Equipment discovery | Field Lens |
| `relay-husk` | Yellow | Equipment discovery | Surveyor Chalk |
| `sanctifier-beads` | Blue | Equipment discovery | Signal Lantern |
| `slag-drone` | Yellow | Equipment discovery | Cinder Suture Kit |
| `wireghost-key` | Yellow | Equipment discovery | Lockjaw Kit |
| `roadside-bone-oracle` | Blue | Follower discovery | Saltflat Bone-Reader |
| `saint-of-ashes-echo` | Blue | Follower discovery | Gate-Saint Acolyte |
| `false-route-procession` | Yellow | Follower discovery | Webglass Runner |
| `marrow-tax-auditors` | Yellow | Follower discovery | Pale Cartel Fixer |
| `cinder-gate-backlash`, `mirror-rot-interference`, `starless-taxation` | mixed | Event | Existing authored effects unchanged |
| `mudglass-sinkhole`, `void-salt-sickness`, `glass-tick-cloud` | mixed | Encounter | Existing authored effects unchanged |

The original failure consequences remain authoritative. The six Equipment rewards are normal canonical Equipment; no Artifact, QA item, random client amount, or shop transaction is involved. The four Follower sources were added to the canonical acquisition manifest.

## Balance interpretation

Combat is not reduced below the primary benchmark merely to hit a suggested range. Instead the combined Enemy/Hazard presentation falls from 91.7% to 79.8%, almost the same as Relic’s ordinary-deck Enemy plus encounter/hazard share (78.3%). Real-session draw telemetry remains the correct next evidence for further redistribution.
