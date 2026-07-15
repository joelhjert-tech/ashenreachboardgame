# Ashen Reach Threat Deck Rebuild Manifest

## Current inventory

Canonical runtime content is `content/cards/threats/*.json`: 109 cards, 67 enemies and 42 hazards.

| Lane | Current | Enemy | Hazard | Low | Standard | High | Elite |
|---|---:|---:|---:|---:|---:|---:|---:|
| Red | 26 | 16 | 10 | 6 | 12 | 6 | 2 |
| Blue | 35 | 15 | 20 | 3 | 17 | 8 | 7 |
| Yellow | 48 | 36 | 12 | 7 | 26 | 10 | 5 |
| **Total** | **109** | **67** | **42** | **16** | **55** | **24** | **14** |

Stats are Grit 22, Forge 23, Guile 22, Signal 25, Command 17. The lanes are mechanically recognizable but numerically inverted from the target: yellow dominates and red is thin.

## Target manifest

| Lane | Target total | Enemy target | Challenge/hazard target | Event-role target | Asset/opportunity target | New total needed |
|---|---:|---:|---:|---:|---:|---:|
| Red | 75 | 48 | 11 | 6 | 10 | 49 |
| Blue | 72 | 45 | 11 | 6 | 10 | 37 |
| Yellow | 74 | 48 | 10 | 6 | 10 | 26 |

These role totals mirror Relic structurally. They cannot be enforced in the current `enemy | hazard` schema. A later role decision must either add narrow event/opportunity card types or map them explicitly to anomalies and item acquisition without prose parsing.

## Classification of all 109 current IDs

No card is deleted in Phase A.

### Replace/revise duplicate mechanical patterns (12)

`beacon-cable-snare`, `breach-halberd`, `glass-tick-cloud`, `furnace-ditch-collapse`, `mudglass-sinkhole`, `glass-chime-swarm`, `spindle-static-squall`, `locked-vault`, `shattered-barricade`, `slag-drone`, `shardwind-front`, `suture-storm`.

These form five exact type/stat/difficulty/effect clusters. Preserve stable IDs and themes; revise only one member per cluster in a contained approval so the cluster gains route, information, choice, or temporary-item identity.

### Mechanically revise after Heat replacement approval (17 additional IDs)

`ashen-doppelganger`, `choir-static-burst`, `cinder-gate-backlash`, `crown-bell-baron`, `false-route-procession`, `gateblind-pulse`, `hymn-scarred-zealot`, `lantern-moth-swarm`, `marrow-tax-auditors`, `memory-tax-gate`, `mirror-rot-interference`, `pale-contract-collector`, `relay-husk`, `signal-rotted-engineer`, `siren-relay-echo`, `soot-stained-cutpurse`, `webglass-snarefield`.

Fifteen IDs are approved: fourteen are implemented through H6B, and H7A approves `gateblind-pulse` for a later conditional Global Escalation implementation that stops one step before collapse. H1 removal-only covers `cinder-gate-backlash`, `mirror-rot-interference`, and `webglass-snarefield`; H2 normal Wound pressure covers `choir-static-burst` and `lantern-moth-swarm`; H3 bounded floor-zero Salvage pressure covers `crown-bell-baron`, `pale-contract-collector`, and `soot-stained-cutpurse`; H4B exact-instance Equipment suppression covers `relay-husk` and `signal-rotted-engineer`; H4C covers `siren-relay-echo`; H5B covers `ashen-doppelganger` and `hymn-scarred-zealot`; H6B covers `false-route-procession`. Two IDs remain blocked: `marrow-tax-auditors` and `memory-tax-gate`.

`glass-chime-swarm` and `spindle-static-squall` are already in the duplicate group. Both now implement their approved typed delayed modifiers and no longer carry player-facing legacy Heat failures.

### Retain with clarity/parity review (80)

All remaining IDs retain stable identity and mechanics unless their card-specific review proves a runtime/text mismatch. This group includes the completed Wound, Salvage, payment, item, and encounter migrations. It is intentionally “clarity review,” not blanket balance authorization.

## Lane design requirements

### Red

Fill +49 over several batches. Priority roles: route guardians, pursuers, formations, armour/defence enemies, capped reinforcement, one-stage mini-bosses, and physical hazards that do more than repeat a Wound. Primary stats remain Grit/Forge; off-lane tests are rare.

### Blue

Fill +37 while reducing the current hazard/elite skew. Priority roles: information/reveal, conditional difficulty, delayed interference, public-state scaling, persistent tile anomalies, and controller enemies. Signal/Command remain primary. Scars stay rare and explicit.

### Yellow

Fill only +26. Priority roles: bargain, repair, temporary exact-instance disable, route manipulation, bounded Salvage loss/gain, ambush, and opportunity cards. Yellow should receive no broad volume batch until red and blue catch up.

## New original archetype allocation

The first approved additions should be exemplars, not volume:

- Red: 2 guardians, 2 pursuers, 1 reinforcement, 1 mini-boss, 2 physical route hazards.
- Blue: 2 information hazards, 2 conditional enemies, 1 persistent anomaly, 1 control elite.
- Yellow: 2 bargains, 2 exact-instance equipment interactions, 1 route choice, 1 ambusher.
- Special: 1 group-safe event, 1 persistent place, 1 staged special challenge, 1 elite opportunity.

Every card needs a stable ID, typed effect, owner, timing, target, failure behavior, persistence/reset, reconnect rule, presentation text, and source-event guard.

## Reward and failure guardrails

Do not set exact reward/failure quotas from the current Relic manifest; the source fields are uncertain. Ashen Reach already overuses `take_wound` and `gain_note` (78 occurrences each). New content should first diversify into typed information, route, temporary item, bounded Salvage, persistence, and choices while retaining the Wound pipeline for genuine injury.

No new card may create universal Salvage income, positive buy/sell cycles, duplicate mission progress, direct Wound mutation, client-authored values, unbounded spawn, or a reconnect reset.

## Implementation phases and commits

Phase B1 supersedes the earlier exemplar order below for duplicate-pattern work. The approved contained groups are:

1. `glass-tick-cloud`, `locked-vault` — existing floor-zero Salvage loss; low-medium risk.
2. `breach-halberd`, `mudglass-sinkhole` — existing forced-displacement lifecycle; medium risk.
3. `shattered-barricade`, `suture-storm` — shared escalation and ordered Wound/displacement; medium-high risk.
4. `glass-chime-swarm` — IMPLEMENTED next-test interference with a narrow typed lifecycle.
5. `spindle-static-squall` — IMPLEMENTED next-normal-movement interference with minimum-one handling and a narrow typed lifecycle.

The exact rules, alternatives, tests, and evidence gates are in `reports/ashen-reach-threat-duplicate-pattern-approval.md`. No group changes totals or authorizes the +116-card expansion.

Implementation status: all eight approved duplicate-pattern revisions are complete. Phase B2A covers `glass-tick-cloud`, `locked-vault`, `breach-halberd`, and `mudglass-sinkhole`; B2B covers `shattered-barricade`; B2C covers `suture-storm`; the final isolated duplicate-pattern Heat-retirement slices cover `glass-chime-swarm` and `spindle-static-squall`.

The remaining Heat-retirement sequence is:

1. H1: `cinder-gate-backlash`, `mirror-rot-interference`, `webglass-snarefield` — IMPLEMENTED removal of obsolete success branches without replacement.
2. H2: `choir-static-burst`, `lantern-moth-swarm` — IMPLEMENTED through the existing normal preventable Wound pipeline.
3. H3: `crown-bell-baron`, `pale-contract-collector`, `soot-stained-cutpurse` — IMPLEMENTED existing floor-zero Salvage loss; explicitly excludes Salvage Ledger and shop-transaction hooks.
4. H4B Equipment group: `relay-husk`, `signal-rotted-engineer` — IMPLEMENTED with shared exact-instance choice/suppression infrastructure and typed next-Threat versus next-battle expiry.
5. H4C modifier group: `siren-relay-echo` — IMPLEMENTED as a separate paired next non-battle Command modifier lifecycle.
6. H5B severe Wound group: `ashen-doppelganger`, `hymn-scarred-zealot` — IMPLEMENTED through the existing normal preventable-Wound lifecycle; no direct Scar and no infrastructure extension.
7. H6B: `false-route-procession` — IMPLEMENTED using the exact H6A destination-choice, reaction, entry, and reconnect rules.
8. H7A: `gateblind-pulse` — APPROVED, NOT IMPLEMENTED. Failure conditionally advances Global Escalation by 1 only below the one-before-collapse boundary; it may raise difficulty but cannot itself cause collapse.
9. Keep `marrow-tax-auditors` and `memory-tax-gate` blocked until their separate economy-frequency and private-choice prerequisites are approved.

The +116-card expansion remains unapproved.

### Earlier Phase A long-range sequence

1. Red duplicate-cluster exemplar — one stable-ID revision; low-medium risk.
2. Blue information exemplar — one hazard plus projection tests; medium risk.
3. Yellow bargain exemplar — existing optional payment only; medium risk.
4. New red archetype pack — 6–8 original IDs; medium-high risk.
5. New blue archetype pack — 6–8 original IDs; medium-high risk.
6. Yellow pack only after economy review — 4–6 IDs; high economy sensitivity.
7. Volume completion — repeated small commits until target, never a 112-card dump.

## Required validation when implementation begins

Validate unique IDs, lane, type/role, stat, difficulty band, typed reward/failure, no Heat, source ownership, persistent lifecycle, and asset originality. Target-count validation should be advisory per phase and become strict only when a lane is declared complete.
