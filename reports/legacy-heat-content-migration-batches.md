# Legacy Heat Content Migration Batches

Date: 2026-07-12
Allowlist baseline: 120 IDs, all found

## Batch summary

| Batch | Entries | Current role | Proposed treatment | Balance risk | Required review |
|---|---:|---|---|---|---|
| 0. Stale allowlist entries | 10 | No blocked construct remains | Remove IDs from allowlist after validator proves clean | None | Mechanical scan only |
| 1. Authored Heat defaults | 17 | Character/follower JSON stores a Heat-shaped initial field | Remove authored field after session compatibility owns the default | Save/fixture only | Migration fixture review |
| 2. Text-only Heat | 3 | Player-facing or compatibility prose only | Rewrite to exact current consequence; no mechanic conversion | Low | Copy review |
| 3. No-op beside active effect | 39 | Heat clause does nothing; another typed effect resolves | Delete no-op clause and rewrite summary while preserving active effect/value | Low–medium | Per-card semantic review |
| 4. Heat-only consequence/reward | 50 | Removing Heat leaves no meaningful typed outcome | Individual redesign or retirement; no bulk Wound/Scar mapping | High | Individual approval required |
| 5. Black Route Fuse cost | 1 | Display-only `heatCost` | Remove metadata; preserve discard and escalation | Low | Item regression |

Entries requiring individual redesign: **50**. Entries eligible for mechanical-preserving cleanup after review: **70**.

## Batch 0 — stale allowlist entries (10)

`artifact-fandiablos`, `artifact-heat-sink-prayer`, `black-lantern-broker`, `choir-defector`, `fandiablos`, `gate-saint-acolyte`, `grave-lattice-reclaimer`, `heat-sink-prayer`, `lucy-hell-puppy`, `pale-marshal`.

These currently match none of the validator's blocked constructs. Remove them from the allowlist first so future Heat-shaped changes to these IDs fail normally. Preserve stable IDs and current player-facing names.

## Batch 1 — authored Heat defaults (17)

`black-ledger-agent`, `char_bjornis`, `char_deepdale`, `char_ker_von_ker`, `char_kira_dog`, `char_master_alpha`, `char_popelord`, `char_rumi`, `cinder-monk`, `fleet-elder`, `grave-engineer`, `oathbroken-prince`, `rift-cartographer`, `salvage-warden`, `siege-medic`, `signal-witch`, `void-marshal`.

These records contain a Heat-shaped field rather than an effect. Future treatment: remove the content-level default only after character/session loaders provide versioned compatibility. No replacement stat is added.

## Batch 2 — text-only references (3)

`anomaly-cinder-mirage-lane`, `artifact-cinder-suture-kit`, `yard-rivet-brute`.

Rewrite only reachable rules copy. Historical flavor may keep non-mechanical words such as warmth only when it cannot be mistaken for a resource.

## Batch 3 — no-op Heat beside an active typed effect (39)

### Gain Heat plus active effect (33)

`anomaly-saint-static-aperture`, `anomaly-saltglass-fata-morgana`, `anomaly-scar-tide-lattice`, `anomaly-throne-shadow-jury`, `anomaly-webglass-stutter`, `artifact-ember-burden-idol`, `artifact-red-march-warbell`, `artifact-throne-crown-fragment`, `ashen-doppelganger`, `bellwire-snare`, `breach-lens-overload`, `choir-static-burst`, `cinder-veil-stalker`, `emberwatch-sparkfall`, `gate-choir-executioner`, `gateblind-pulse`, `glass-mire-stalker`, `iron-lung-grenadier`, `iron-synod-chirurgeon`, `lalla-bubu-crownling`, `mirror-lord-envoy`, `pale-cartel-shakedown`, `pale-contract-collector`, `relay-husk`, `reliquary-judge`, `saint-of-ashes-echo`, `shardvine-ambushers`, `shardwind-front`, `starless-taxation`, `static-censer-acolyte`, `suture-storm`, `webglass-echo-trap`, `cinder-surgeon`.

### Gain Heat for all plus active effect (1)

`anomaly-cinder-gate-echo`.

### Lose Heat plus active effect (3)

`cartel-ledger-skim`, `cinder-gate-backlash`, `latchspire-raider`.

### Both gain/lose Heat plus active effect (2)

`mirror-rot-interference`, `webglass-snarefield`.

Default treatment: remove only the no-op Heat member, preserve the other typed effect and all numbers, then revalidate card readability and relative difficulty. If the Heat clause clearly carried essential authored weight, move that ID to Batch 4 rather than silently strengthening or weakening it.

## Batch 4 — Heat-only outcomes requiring individual design (50)

### `lose_heat` reward/recovery only (16)

`anomaly-ashfall-murmur`, `anomaly-bellrain-inversion`, `anomaly-glassmere`, `cartel-crossing-thread`, `choir-echo-triangulation`, `choir-hush-census`, `choir-well-canticle`, `clan-salt-burial`, `compact-equipment-requisition`, `contract-beacon`, `warden-span-vigil`, `escalation-ashfall-curfew`, `escalation-ridge-suture`, `escalation-webglass-afterimage`, `crownless-advocate`, `saltflat-bone-reader`.

Preferred review rule: contracts receive an objective-appropriate reward, followers receive a bounded typed benefit, and anomaly/escalation recovery is either rewritten or removed. Do not default to Scar removal.

### `gain_heat` penalty/trade-off only (28)

`anomaly-red-suture-field`, `escalation-crownfall-writ`, `escalation-marrow-surgery-debt`, `ash-cinder-runt`, `ash-rat-skitter`, `bell-mask-pilgrim`, `bridge-toll-runt`, `cracked-censer-novice`, `crown-bell-baron`, `false-route-procession`, `gate-tax-collectors`, `glass-chime-swarm`, `glasswing-midge-cloud`, `grave-silt-press`, `gutter-bell-mite`, `hymn-scarred-zealot`, `marrow-tax-auditors`, `memory-tax-gate`, `mirror-mite-bloom`, `pale-toll-enforcer`, `relay-pilgrim-riot`, `roadside-bone-oracle`, `rust-choir-peddlers`, `rust-mote-drone`, `signal-rotted-engineer`, `soot-stained-cutpurse`, `spindle-static-squall`, `toll-scrip-urchins`.

Preferred review rule: use a Wound only for explicit bodily danger, Loss Pressure only for scenario collapse, Salvage loss only for economic extortion, and a typed note/status only when it has real future consumption. Otherwise rewrite or retire the card.

### `gain_heat_all` only (3)

`escalation-blackstar-hunger`, `escalation-choir-feedback`, `escalation-saltwind-lockdown`.

These are the strongest candidates for Loss Pressure or scenario-specific escalation, but each needs scenario-frequency analysis before values are selected.

### Both gain/lose Heat only (3)

`lantern-moth-swarm`, `siren-relay-echo`, `void-salt-sickness`.

These cards depend on a vanished resource polarity and require complete rule rewrites or retirement.

## Batch 5 — Black Route Fuse (1)

`black-route-fuse`: remove only `heatCost`; preserve the stable ID, price 3, discard, +3 Grit, matching battle timing, and +1 escalation.

## Migration order

1. Remove Batch 0 exemptions.
2. Clean Batch 2 text.
3. Migrate Fuse and active shop paths so Risk can disappear.
4. Remove Batch 3 no-op members in small content-type commits with golden behavior tests.
5. Design Batch 4 by content family: contracts/followers, threats, anomalies, escalations.
6. Remove Batch 1 authored defaults only at the persistence migration boundary.
7. Delete effect discriminators and remaining allowlist only after all content and legacy saves migrate.
