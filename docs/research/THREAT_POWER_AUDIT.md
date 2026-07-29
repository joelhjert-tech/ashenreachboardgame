# Threat Power Audit

Status: historical report-only snapshot with implementation resolution recorded on 2026-07-29.

Generated from the active canonical sector graph, authored Threat JSON, production operative base statistics, and the current server resolution paths. This report changes no cards, mechanics, probabilities, rewards, or production code.

## Implementation resolution (2026-07-29)

The original measurements below are retained as the evidence snapshot that prompted the review. The identified semantic ambiguities are now resolved in the authoritative implementation:

- Static Larva Swarm, Moth-Carrier Husk, and Signal-Rotted Engineer no longer repeat an already-authored loss through a second effect key. Pale Marshal no longer advertises an unsupported reveal lock.
- Enemy Trophy rewards are awarded exactly once. An explicit authored `gain_trophy` reward represents the award; the reducer supplies `trophyValue` only when no explicit Trophy reward exists. The content schema rejects mismatched explicit and declared values.
- Reroll blocking is enforced in both the projected adaptation controls and the server intent handler. Salvage and Escalation keys emit typed state-changing effects. Retired lock/drop compatibility keys return explanatory summaries rather than pretending a note mutates state.
- A live encounter derives its region from the canonical sector first and uses the card region only as a fallback. Cross-region cards therefore resolve against where the encounter actually occurred.
- The lifecycle matrix was regenerated with all four new faction hazards: Broodglass Hatchfall, Courtline Fold, Grinning Ledger Seizure, and Violet Thorn Toll. The matrix now contains 120 Threats and 405 total records.

## Executive summary

- **109 authored Threat records exist; 108 are active in canonical sector decks.** `rift-whispers` is not drawable and is excluded because its behavior migrated to the recurring tile challenge system.
- The active set contains **67 enemies** and **41 hazards** across 49 canonical sectors.
- Lane population is **red 26**, **blue 34**, and **yellow 48**.
- The strongest modeled combinations are concentrated in inner enemies, but two authored-inner cards—**Specimen Null Arrives** and **Starless Taxation**—are also reachable in outer sectors.
- **Static Larva Swarm applies two Scar choices on loss**: one in `woundOnLoss` and another from `threat_fail_gain_scar`. This is a real stacked consequence, not merely duplicated copy.
- 8 enemies combine the automatic enemy `trophyValue` award with an additional authored `gain_trophy` reward. The total reward is therefore additive.
- Five active effect-key behaviors that sound mechanical are currently note-only in the resolver: reroll blocking, space locking, defeat Salvage, failure escalation, and drop-gear exposure. They should not be treated as enforced denial or state change in balance calculations.
- **26 cards appear outside their authored region metadata.** Cross-region placement is common enough to materially affect player experience, solo combat ease, and regional comparisons.

## Scope and source of truth

Included:

- Every unique Threat ID referenced by `createCanonicalSectorGraph()`.
- Authored values and typed effects from `content/cards/threats/*.json`.
- Enforced effect-key behavior from `src/game/cards/threatEffects.ts`.
- Enemy and hazard roll formulas, co-op assistance, escalation, and solo tuning from the server/rules modules.
- The 17 non-QA canonical operatives for counterplay accessibility.

Excluded:

- `rift-whispers`, because it has zero canonical Threat-deck placements and now supplies presentation art for a recurring tile challenge.
- QA-only operative Master Alpha.
- Equipment, Trophy advancement, temporary modifiers, scenario modifiers, Affliction reactions, Scar adaptations, and player skill at timing choices from the baseline probability model. Those systems can materially improve or worsen a live result but are not properties of a Threat card.
- Soft-exile draw history from the exposure index. Exposure is a fresh-deck structural comparison, not a prediction of a specific session.

## Explainable Threat Power Index

The model is intentionally auditable rather than pretending to be a complete simulation.

### Baseline failure probability

- For a hazard: exact probability that `2d6 + operative base stat < target difficulty`.
- For an enemy: exact probability that `operative 2d6 + base stat < enemy 2d6 + combat value`; ties succeed.
- The baseline averages that probability across all 17 production operatives using their authored base value for the tested stat.
- Deterministic enforced combat modifiers are included: enemy +2, enemy advantage represented as +1, player disadvantage represented as −1, first-success resistance represented as +2 difficulty, and inner-region +2.
- Conditional Scar pressure is shown as a score range but is not assumed in the baseline.
- Universal Global Escalation is held at 0. Every two Escalation levels add +1 difficulty to all current Threat resolutions.

### Loss Burden weights

| Consequence | LB points | Rationale |
|---|---:|---|
| Wound | 8 each | Immediate recall pressure; multiplayer threshold is only 3 |
| Scar choice | 12 each | Lasting typed condition |
| Affliction draw | 12 each | Lasting condition with possible chained resolution |
| Lose/required-pay Salvage | 3 each | Currency loss, capped by holdings |
| Global Escalation +1 | 5 | Table-wide future pressure |
| Forced displacement | 4 per sector | Position and tempo loss |
| Owner-selected displacement | 3 per sector | Same disruption with agency |
| Equipment suppression | 6 | Removes a future equipment window |
| Next non-battle test −1 | 3 | Persistent future check pressure |
| Next movement −1 | 2 | Persistent route pressure |
| Threat returns to sector | 5 | Recurrence and sector obstruction |
| Memory Tax choice | 3 | Best-of-two loss: 1 Salvage or next-test −1 |

### Formula

`TPI = 60 × average failure probability + average failure probability × Loss Burden + guaranteed enforced control burden`

Enforced weapon/armor suppression contributes 4 control points. Note-only effect keys contribute zero. Rewards are deliberately **not subtracted** from power: a dangerous enemy with a good prize is still dangerous. Reward Value is reported separately:

- Trophy 1 each; Salvage 2 each; Gear 6; local Artifact 8; Follower 6; healing 5 per Wound; scenario progress 4 each.
- Enemy `trophyValue` is always included because the reducer awards it automatically on victory.
- Reward Value is a comparison aid, not an economic valuation or recommendation.

Interpretation:

- **0–24:** low pressure
- **25–44:** moderate
- **45–64:** high
- **65–84:** severe
- **85+:** extreme

## Active lane and stat composition

| Lane | Active cards | Tested stat counts |
|---|---:|---|
| red — Hostile Contact | 26 | command 1, grit 22, signal 0, guile 0, forge 3 |
| blue — Void Anomaly | 34 | command 2, grit 0, signal 23, guile 6, forge 3 |
| yellow — Rogue Salvage | 48 | command 14, grit 0, signal 1, guile 16, forge 17 |

The lanes retain their intended center of gravity, but they are not stat-exclusive. Red contains non-Grit tests, blue contains Guile/Forge tests, and yellow includes Command and Signal. That diversity is healthy for roster composition, but it means lane color alone cannot communicate the required counter-stat.

## Region-and-lane comparison

| Authored region / lane | Cards | Mean TPI | Range | Mean failure | Mean Reward Value |
|---|---:|---:|---:|---:|---:|
| inner/blue | 5 | 60.6 | 32.1–74.4 | 84% | 6.4 |
| inner/red | 2 | 79.6 | 73.0–86.3 | 97% | 16.0 |
| inner/yellow | 5 | 65.3 | 18.1–84.1 | 84% | 9.6 |
| middle/blue | 13 | 45.4 | 16.3–75.4 | 62% | 3.2 |
| middle/red | 7 | 41.0 | 12.1–70.6 | 57% | 2.7 |
| middle/yellow | 13 | 49.5 | 9.2–76.3 | 71% | 3.7 |
| outer/blue | 16 | 15.2 | 0.4–47.1 | 22% | 1.6 |
| outer/red | 17 | 25.6 | 0.2–55.6 | 37% | 2.0 |
| outer/yellow | 30 | 33.5 | 1.6–65.5 | 50% | 4.4 |

Comparisons use authored region because that value participates in card logic. The placement audit below separately records where the card can actually be drawn.

### Like-for-like enemy and hazard comparison

| Authored region / lane / kind | Cards | Mean TPI | Range | Mean failure | Mean Reward Value |
|---|---:|---:|---:|---:|---:|
| inner/blue/enemy | 3 | 71.5 | 67.2–74.4 | 99% | 9.3 |
| inner/blue/hazard | 2 | 44.2 | 32.1–56.3 | 62% | 2.0 |
| inner/red/enemy | 2 | 79.6 | 73.0–86.3 | 97% | 16.0 |
| inner/yellow/enemy | 4 | 77.1 | 74.0–84.1 | 98% | 12.0 |
| inner/yellow/hazard | 1 | 18.1 | 18.1–18.1 | 25% | 0.0 |
| middle/blue/enemy | 7 | 62.9 | 52.9–75.4 | 86% | 4.6 |
| middle/blue/hazard | 6 | 25.0 | 16.3–37.5 | 35% | 1.7 |
| middle/red/enemy | 4 | 62.5 | 53.8–70.6 | 87% | 4.8 |
| middle/red/hazard | 3 | 12.3 | 12.1–12.8 | 18% | 0.0 |
| middle/yellow/enemy | 10 | 60.8 | 53.8–76.3 | 87% | 4.2 |
| middle/yellow/hazard | 3 | 11.6 | 9.2–16.0 | 18% | 2.0 |
| outer/blue/enemy | 5 | 38.5 | 24.6–47.1 | 57% | 1.6 |
| outer/blue/hazard | 11 | 4.6 | 0.4–10.5 | 7% | 1.5 |
| outer/red/enemy | 10 | 40.8 | 22.7–55.6 | 60% | 2.8 |
| outer/red/hazard | 7 | 3.8 | 0.2–13.5 | 5% | 0.9 |
| outer/yellow/enemy | 22 | 44.1 | 19.4–65.5 | 65% | 4.5 |
| outer/yellow/hazard | 8 | 4.3 | 1.6–9.7 | 7% | 4.1 |

This second cut controls for resolution type. Enemy opposed rolls and hazard fixed-target tests should not be judged as one statistical population even when they share a region and lane.

## Strongest modeled Threats and highest exposure

### Highest TPI

| Threat | Authored group | TPI | Mean failure | Loss | Live access |
|---|---|---:|---:|---|---|
| Specimen Null Arrives | inner/red/enemy | 86.3 | 98% | 2 Wounds; 1 Scar choice (LB 28) | O1/M3/I5; 9 sectors; EI 1.17 |
| Grave-Lattice Reclaimer | inner/yellow/enemy | 84.1 | 99% | 1 Wound; 1 Scar choice; Threat returns to sector (LB 25) | O0/M2/I4; 6 sectors; EI 0.89 |
| Iron Synod Chirurgeon | middle/yellow/enemy | 76.3 | 95% | 2 Wounds (LB 16) | O1/M3/I0; 4 sectors; EI 0.44 |
| Veil-Rift Judicator | middle/blue/enemy | 75.4 | 94% | 1 Wound; 1 Scar choice (LB 20) | O0/M1/I3; 4 sectors; EI 0.60 |
| Last Lock Warden | inner/yellow/enemy | 75.2 | 99% | 2 Wounds (LB 16) | O0/M0/I4; 4 sectors; EI 0.57 |
| Grothak, the Gorged King | inner/yellow/enemy | 75.1 | 99% | 2 Wounds (LB 16) | O0/M0/I3; 3 sectors; EI 0.47 |
| Ashen Doppelganger | inner/blue/enemy | 74.4 | 98% | 2 Wounds (LB 16) | O0/M0/I3; 3 sectors; EI 0.39 |
| Gate Choir Executioner | inner/yellow/enemy | 74.0 | 97% | 2 Wounds (LB 16) | O0/M0/I5; 5 sectors; EI 0.73 |
| Tomb-Gate Colossus | inner/red/enemy | 73.0 | 96% | 2 Wounds (LB 16) | O0/M0/I4; 4 sectors; EI 0.57 |
| The Pale Marshal | inner/blue/enemy | 72.9 | 100% | 1 Wound; Threat returns to sector (LB 13) | O0/M0/I3; 3 sectors; EI 0.43 |
| Ash Choir Crusader | middle/blue/enemy | 72.2 | 90% | 1 Wound; 1 Scar choice (LB 20) | O0/M5/I0; 5 sectors; EI 0.74 |
| Bone-Rivet Brute | middle/red/enemy | 70.6 | 93% | 2 Wounds (LB 16) | O0/M7/I0; 7 sectors; EI 1.09 |

### Highest fresh-deck exposure

| Threat | Authored group | Exposure index | Sector placements | TPI |
|---|---|---:|---|---:|
| Red March Cannoneer | middle/red/enemy | 1.54 | O1/M8/I0; 9 sectors; EI 1.54 | 67.0 |
| Specimen Null Arrives | inner/red/enemy | 1.17 | O1/M3/I5; 9 sectors; EI 1.17 | 86.3 |
| Bone-Rivet Brute | middle/red/enemy | 1.09 | O0/M7/I0; 7 sectors; EI 1.09 | 70.6 |
| Iron Lung Grenadier | middle/yellow/enemy | 1.07 | O1/M5/I0; 6 sectors; EI 1.07 | 53.8 |
| Starless Taxation | inner/yellow/hazard | 1.00 | O3/M2/I3; 8 sectors; EI 1.00 | 18.1 |
| Suture Storm | middle/red/hazard | 0.94 | O2/M4/I0; 6 sectors; EI 0.94 | 12.8 |
| Grave-Lattice Reclaimer | inner/yellow/enemy | 0.89 | O0/M2/I4; 6 sectors; EI 0.89 | 84.1 |
| Gate-Tax Collectors | outer/yellow/enemy | 0.78 | O3/M2/I0; 5 sectors; EI 0.78 | 44.8 |
| Reliquary Judge | middle/blue/enemy | 0.75 | O0/M3/I2; 5 sectors; EI 0.75 | 61.7 |
| Ash Choir Crusader | middle/blue/enemy | 0.74 | O0/M5/I0; 5 sectors; EI 0.74 | 72.2 |
| Gate Choir Executioner | inner/yellow/enemy | 0.73 | O0/M0/I5; 5 sectors; EI 0.73 | 74.0 |
| Saint of Ashes Echo | middle/blue/hazard | 0.71 | O0/M0/I5; 5 sectors; EI 0.71 | 35.5 |

## Statistical outliers within the same authored region, lane, and resolution kind

Outliers are cards at least 1.5 standard deviations from their region/lane/kind mean, with groups smaller than four excluded.

| Card | Group | TPI | Group mean | Z-score | Why |
|---|---|---:|---:|---:|---|
| Broken Mast Collapse | outer/red/hazard | 13.5 | 3.8 | 2.33 | grit TN8; 2 Wounds (LB 16); — |
| Iron Synod Chirurgeon | middle/yellow/enemy | 76.3 | 60.8 | 2.29 | forge CV10; 2 Wounds (LB 16); disable armor bonus |
| False-Route Procession | outer/yellow/hazard | 9.7 | 4.3 | 2.23 | command TN7; owner-selected displacement 1 (LB 3); position changes |
| Toll-Scrip Urchins | outer/yellow/enemy | 19.4 | 44.1 | -1.91 | guile CV2; lose 1 Salvage (LB 3); — |
| Hushed Chapel | outer/blue/hazard | 10.5 | 4.6 | 1.91 | signal TN7; 1 Scar choice (LB 12); — |
| Ash-Cinder Runt | outer/red/enemy | 22.7 | 40.8 | -1.74 | grit CV2; 1 Wound (LB 8); — |
| Grave-Lattice Reclaimer | inner/yellow/enemy | 84.1 | 77.1 | 1.72 | forge CV10+2; 1 Wound; 1 Scar choice; Threat returns to sector (LB 25); Threat remains/returns |
| Emberwatch Sparkfall | outer/blue/hazard | 9.9 | 4.6 | 1.72 | signal TN7; 1 Wound (LB 8); — |
| Veil-Rift Judicator | middle/blue/enemy | 75.4 | 62.9 | 1.68 | signal CV9; 1 Wound; 1 Scar choice (LB 20); — |
| Iron Synod Hunter | outer/yellow/enemy | 65.5 | 44.1 | 1.65 | forge CV8; 2 Wounds (LB 16); — |
| Gutter-Bell Mite | outer/blue/enemy | 24.6 | 38.5 | -1.62 | signal CV2; lose 1 Salvage (LB 3); — |
| Rust-Mote Drone | outer/yellow/enemy | 24.6 | 44.1 | -1.51 | forge CV3; lose 1 Salvage (LB 3); — |

## Suspicious combinations requiring design review

These are findings, not change recommendations.

1. **Static Larva Swarm stacks two Scar choices on one loss.** Its explicit loss sequence already grants 1 Wound and 1 Scar choice; `threat_fail_gain_scar` adds a second Scar choice. The model scores both because both are enforced.
2. **Automatic Trophy value plus bonus Trophy effects stack on 8 enemies:** Ash-Court Duelist (2 automatic + +2 bonus Trophies); Ashen Doppelganger (3 automatic + +3 bonus Trophies); Bone-Rivet Brute (3 automatic + +3 bonus Trophies); Copperjaw Vermin (1 automatic + +1 bonus Trophy); Iron Synod Chirurgeon (3 automatic + +3 bonus Trophies); Mourning Engine Pup (1 automatic + +1 bonus Trophy); Pale Contract Collector (2 automatic + +2 bonus Trophies); Redglass Stray (1 automatic + +1 bonus Trophy).
3. **The Pale Marshal advertises two denial mechanics that are not separately enforced.** `threat_lock_space_until_defeated` and `threat_block_rerolls` resolve to notes. Its +2 inner combat pressure and return-to-sector loss are enforced, so it remains extreme without counting the note-only denial.
4. **Signal-Rotted Engineer combines immediate weapon-bonus cancellation with future Equipment suppression.** Its `threat_fail_drop_gear` key is note-only, but the two other layers are enforced.
5. **Moth-Carrier Husk has both typed Global Escalation +1 and a `threat_fail_escalate` key.** Only the typed effect changes Escalation; the key records a note. This is not double Escalation, but the two representations are easy to misread.
6. **Coffin-Frame Automaton and Choir Bulwark use “ignore first success” as +2 difficulty.** The runtime does not literally discard a successful roll; the score uses the enforced +2.
7. **Grave-Lattice Reclaimer combines +2 enemy pressure, Wound, Scar, and return-to-sector persistence.** It is also placed in middle sectors despite inner metadata.
8. **Specimen Null Arrives has extreme loss burden, high combat value, and the broadest elite reach.** It appears in 9 sectors spanning outer, middle, and inner regions.
9. **Four hazards intentionally have no typed success reward:** Cinder Gate Backlash, Lantern Moth Swarm, Mirror-Rot Interference, and Webglass Snarefield. Their schema exemptions are explicit, but their risk/reward profile is lower-reward than same-lane peers.
10. **No active card uses the authored escalation-scaling effect keys.** Current escalation scaling is universal through the server rather than card-specific.

## Authored-region versus live-placement mismatches

| Card | Authored region | Live placement regions | Sector count |
|---|---|---|---:|
| Bell-Mask Pilgrim | outer | outer, middle | 2 |
| Chain-Maul Salvager | outer | outer, middle | 3 |
| Cinder Lattice Maw | middle | inner | 4 |
| Cracked-Censer Novice | outer | outer, middle | 3 |
| False-Route Procession | outer | middle | 5 |
| Gate-Tax Collectors | outer | outer, middle | 5 |
| Grave-Lattice Reclaimer | inner | middle, inner | 6 |
| Guardian Bridge Duelist | outer | middle | 3 |
| Iron Lung Grenadier | middle | outer, middle | 6 |
| Iron Synod Chirurgeon | middle | outer, middle | 4 |
| Iron Synod Hunter | outer | middle | 5 |
| Marrow-Tax Auditors | outer | middle | 4 |
| Moth-Carrier Husk | outer | outer, middle | 3 |
| Pale Toll Enforcer | outer | outer, middle | 2 |
| Red March Cannoneer | middle | outer, middle | 9 |
| Reliquary Judge | middle | middle, inner | 5 |
| Saint of Ashes Echo | middle | inner | 5 |
| Shardvine Ambushers | outer | middle | 4 |
| Shiv-Market Crew | middle | outer | 1 |
| Siren Relay Echo | outer | outer, middle | 3 |
| Specimen Null Arrives | inner | outer, middle, inner | 9 |
| Spindle Static Squall | outer | outer, middle | 3 |
| Starless Taxation | inner | outer, middle, inner | 8 |
| Suture Storm | middle | outer, middle | 6 |
| Veil-Rift Judicator | middle | middle, inner | 4 |
| Yard-Rivet Brute | middle | outer | 1 |

Important exposure cases:

- **Specimen Null Arrives:** inner metadata; outer, middle, and inner placement.
- **Starless Taxation:** inner metadata; outer, middle, and inner placement.
- **Iron-Synod Chirurgeon, Red-March Cannoneer, Iron-Lung Grenadier, and Suture Storm:** middle metadata with at least one outer placement.
- **Shiv Market Crew and Yard-Rivet Brute:** middle metadata but outer-only placement.
- **Cinder Lattice Maw and Saint of Ashes Echo:** middle metadata but inner-only placement.

Because solo enemy easing uses the operative's actual board tier rather than card metadata, the same cross-region enemy can have different solo opposition values. The card's own region-dependent effect context, however, prefers authored card region.

## Note-only effect-key audit

| Card | Note-only key behavior | Enforced adjacent behavior |
|---|---|---|
| Chain-Maul Salvager | defeat gain salvage | 1 Wound |
| Coffin-Frame Automaton | defeat gain salvage | 1 Wound |
| Moth-Carrier Husk | fail escalate | 1 Wound; Global Escalation +1 |
| Signal-Rotted Engineer | fail drop gear | Equipment suppression; disable weapon bonus |
| The Pale Marshal | reroll block; lock space until defeated | 1 Wound; Threat returns to sector |
| Velvet Knife Confessor | reroll block | 1 Wound; 1 Scar choice |

“Note-only” means the resolver returns `gain_note` instead of changing the named state. This audit does not infer the mechanic from card wording or effect-key name.

## Multiplayer scaling findings

- No active Threat has a direct player-count multiplier on difficulty, damage, reward, or draw count.
- Standard co-op multiplayer can add up to two consenting helpers' intrinsic tested-stat values to any Threat battle or hazard check. Solo, Rivalry, and Nemesis Relay do not receive this assistance.
- Solo enemy combat is eased by 2 in outer sectors and 1 in middle sectors; inner enemies receive no solo ease. Hazards receive no equivalent solo test reduction.
- Wound recall occurs at 4 Wounds in solo and 3 in multiplayer. Therefore every Wound-bearing Threat has higher marginal elimination pressure in multiplayer even though the card's Wound amount is unchanged.
- Global Escalation collapses at 8 solo and 6 multiplayer, while its difficulty modifier is the same `floor(level / 2)`. Threats encountered at the same Escalation level have the same universal modifier, but multiplayer reaches its collapse boundary sooner.
- Most card consequences affect only the resolving operative. The active authored Threat effects contain no table-wide Wound or all-player Salvage loss.
- Co-op assistance can overpower low and middle targets when high-stat helpers are available. This is a system-level roster effect, not a card-specific scalar, and is therefore excluded from TPI.

## Normalized active-threat table

Abbreviations:

- **CV:** enemy combat value added to the enemy's 2d6.
- **TN:** hazard target number.
- **LB:** modeled Loss Burden.
- **RV:** comparison Reward Value, including automatic enemy Trophy value.
- **EI:** fresh-deck exposure index, the sum of `1 / local Threat deck size` across placements.
- **Access:** median base-stat success probability and number of production operatives with at least 50% unassisted baseline success.
- **W/Scar/Aff/Salv:** Wounds, Scar choices, Affliction draws, and Salvage loss/payment.

| Region | Lane | ID | Threat | Kind | Combat/test | Failure consequence | Persistent effect / action denial | Wound, Scar, Salvage risk | Victory/success reward | Live exposure | Counterplay accessibility | Multiplayer scaling | TPI |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---:|
| inner | blue | `ashen-doppelganger` | Ashen Doppelganger | enemy | guile CV11 | 2 Wounds (LB 16) | — | W2 | Trophy 3; +3 bonus Trophies (RV 6) | O0/M0/I3; 3 sectors; EI 0.39 | 1% median; 0/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 74 |
| inner | blue | `cinder-gate-backlash` | Cinder Gate Backlash | hazard | signal TN12 | 2 Wounds (LB 16) | — | W2 | — (RV 0) | O0/M0/I3; 3 sectors; EI 0.39 | 17% median; 3/17 ≥50% | none per-card; co-op ≤2 helpers; no solo test ease; recall W4 solo/W3 multi | 56 |
| inner | blue | `gateblind-pulse` | Gateblind Pulse | hazard | signal TN10 | guarded Global Escalation +1 (LB 5) | — | No W/Scar/Salv | scenario progress +1 (RV 4) | O0/M0/I3; 3 sectors; EI 0.39 | 42% median; 8/17 ≥50% | none per-card; co-op ≤2 helpers; no solo test ease | 32 |
| inner | blue | `mirror-lord-envoy` | Mirror-Lord Envoy | enemy | command CV10+1 (+1 if Scarred) | 1 Wound (LB 8) | — | W1 | Trophy 6; narrative note (RV 6) | O0/M0/I2; 2 sectors; EI 0.29 | 0% median; 0/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 67 |
| inner | blue | `pale-marshal` | The Pale Marshal | enemy | signal CV12+2 | 1 Wound; Threat returns to sector (LB 13) | Threat remains/returns; note-only: reroll block; note-only: lock space until defeated | W1 | Trophy 8; local Artifact draw (RV 16) | O0/M0/I3; 3 sectors; EI 0.43 | 0% median; 0/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 73 |
| inner | red | `specimen-null-arrives` | Specimen Null Arrives | enemy | grit CV11 | 2 Wounds; 1 Scar choice (LB 28) | — | W2 Scar1 | Trophy 10; Gear: tuning-spines (RV 16) | O1/M3/I5; 9 sectors; EI 1.17 | 1% median; 0/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 86 |
| inner | red | `tomb-gate-colossus` | Tomb-Gate Colossus | enemy | grit CV10 | 2 Wounds (LB 16) | — | W2 | Trophy 10; Gear: coffin-rig (RV 16) | O0/M0/I4; 4 sectors; EI 0.57 | 3% median; 0/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 73 |
| inner | yellow | `gate-choir-executioner` | Gate Choir Executioner | enemy | command CV10 | 2 Wounds (LB 16) | — | W2 | Trophy 9; Gear: veil-hook (RV 15) | O0/M0/I5; 5 sectors; EI 0.73 | 1% median; 0/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 74 |
| inner | yellow | `grave-lattice-reclaimer` | Grave-Lattice Reclaimer | enemy | forge CV10+2 | 1 Wound; 1 Scar choice; Threat returns to sector (LB 25) | Threat remains/returns | W1 Scar1 | Trophy 2; local Artifact draw (RV 10) | O0/M2/I4; 6 sectors; EI 0.89 | 0% median; 0/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 84 |
| inner | yellow | `grothak-gorged-king` | Grothak, the Gorged King | enemy | command CV11 | 2 Wounds (LB 16) | — | W2 | Trophy 7; +2 Salvage (RV 11) | O0/M0/I3; 3 sectors; EI 0.47 | 0% median; 0/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 75 |
| inner | yellow | `last-lock-warden` | Last Lock Warden | enemy | forge CV12 | 2 Wounds (LB 16) | — | W2 | Trophy 4; scenario progress +2 (RV 12) | O0/M0/I4; 4 sectors; EI 0.57 | 0% median; 0/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 75 |
| inner | yellow | `starless-taxation` | Starless Taxation | hazard | guile TN9 | 1 Scar choice (LB 12) | — | Scar1 | narrative note (RV 0) | O3/M2/I3; 8 sectors; EI 1.00 | 72% median; 17/17 ≥50% | none per-card; co-op ≤2 helpers; no solo test ease | 18 |
| middle | blue | `ash-choir-crusader` | Ash Choir Crusader | enemy | signal CV8 | 1 Wound; 1 Scar choice (LB 20) | — | W1 Scar1 | Trophy 8; narrative note (RV 8) | O0/M5/I0; 5 sectors; EI 0.74 | 5% median; 0/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 72 |
| middle | blue | `choir-wraith` | Choir Wraith | enemy | signal CV7 | 1 Scar choice (LB 12) | — | Scar1 | Trophy 4; narrative note (RV 4) | O0/M1/I0; 1 sectors; EI 0.17 | 10% median; 0/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I | 61 |
| middle | blue | `choir-static-burst` | Choir-Static Burst | hazard | signal TN9 | 1 Wound (LB 8) | — | W1 | scenario progress +1 (RV 4) | O0/M4/I0; 4 sectors; EI 0.59 | 58% median; 11/17 ≥50% | none per-card; co-op ≤2 helpers; no solo test ease; recall W4 solo/W3 multi | 25 |
| middle | blue | `cinder-lattice-maw` | Cinder Lattice Maw | hazard | forge TN9 | 1 Wound; 1 Affliction draw (LB 20) | — | W1 Aff1 | narrative note (RV 0) | O0/M0/I4; 4 sectors; EI 0.51 | 72% median; 17/17 ≥50% | none per-card; co-op ≤2 helpers; no solo test ease; recall W4 solo/W3 multi | 19 |
| middle | blue | `glass-mire-stalker` | Glass-Mire Stalker | enemy | guile CV8 | 1 Wound (LB 8) | — | W1 | Trophy 2; narrative note (RV 2) | O0/M1/I0; 1 sectors; EI 0.10 | 10% median; 0/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 59 |
| middle | blue | `mirror-rot-interference` | Mirror-Rot Interference | hazard | guile TN11 | 1 Affliction draw (LB 12) | — | Aff1 | — (RV 0) | O0/M2/I0; 2 sectors; EI 0.22 | 42% median; 8/17 ≥50% | none per-card; co-op ≤2 helpers; no solo test ease | 38 |
| middle | blue | `reliquary-judge` | Reliquary Judge | enemy | signal CV7 | 1 Wound (LB 8) | disable weapon bonus | W1 | Trophy 4; narrative note (RV 4) | O0/M3/I2; 5 sectors; EI 0.75 | 10% median; 0/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 62 |
| middle | blue | `saint-of-ashes-echo` | Saint of Ashes Echo | hazard | signal TN10 | 1 Scar choice (LB 12) | — | Scar1 | Follower: gate-saint-acolyte (RV 6) | O0/M0/I5; 5 sectors; EI 0.71 | 42% median; 8/17 ≥50% | none per-card; co-op ≤2 helpers; no solo test ease | 36 |
| middle | blue | `static-censer-acolyte` | Static-Censer Acolyte | enemy | signal CV6 | 1 Wound (LB 8) | — | W1 | Trophy 2; narrative note (RV 2) | O0/M1/I0; 1 sectors; EI 0.11 | 16% median; 0/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 53 |
| middle | blue | `veil-censor` | Veil Censor | enemy | guile CV7 | 1 Scar choice (LB 12) | — | Scar1 | Trophy 4; narrative note (RV 4) | O0/M1/I0; 1 sectors; EI 0.17 | 16% median; 0/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I | 58 |
| middle | blue | `veil-rift-judicator` | Veil-Rift Judicator | enemy | signal CV9 | 1 Wound; 1 Scar choice (LB 20) | — | W1 Scar1 | Trophy 8; narrative note (RV 8) | O0/M1/I3; 4 sectors; EI 0.60 | 3% median; 0/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 75 |
| middle | blue | `webglass-echo-trap` | Webglass Echo Trap | hazard | signal TN8 | 1 Wound (LB 8) | — | W1 | narrative note (RV 0) | O0/M2/I0; 2 sectors; EI 0.22 | 72% median; 17/17 ≥50% | none per-card; co-op ≤2 helpers; no solo test ease; recall W4 solo/W3 multi | 16 |
| middle | blue | `webglass-snarefield` | Webglass Snarefield | hazard | guile TN9 | 1 Wound (LB 8) | — | W1 | — (RV 0) | O0/M3/I0; 3 sectors; EI 0.35 | 72% median; 17/17 ≥50% | none per-card; co-op ≤2 helpers; no solo test ease; recall W4 solo/W3 multi | 17 |
| middle | red | `bone-rivet-brute` | Bone-Rivet Brute | enemy | grit CV9 | 2 Wounds (LB 16) | — | W2 | Trophy 3; +3 bonus Trophies (RV 6) | O0/M7/I0; 7 sectors; EI 1.09 | 5% median; 0/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 71 |
| middle | red | `red-march-cannoneer` | Red March Cannoneer | enemy | grit CV8 | 2 Wounds (LB 16) | — | W2 | Trophy 7; narrative note (RV 7) | O1/M8/I0; 9 sectors; EI 1.54 | 10% median; 0/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 67 |
| middle | red | `red-maw-raiders` | Red-Maw Raiders | enemy | command CV7 | 1 Wound (LB 8) | — | W1 | Trophy 4; narrative note (RV 4) | O0/M1/I0; 1 sectors; EI 0.14 | 10% median; 0/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 59 |
| middle | red | `rust-plate-strider` | Rust-Plate Strider | enemy | forge CV7 | 1 Wound (LB 8) | — | W1 | Trophy 2; narrative note (RV 2) | O0/M1/I0; 1 sectors; EI 0.10 | 16% median; 0/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 54 |
| middle | red | `shardwind-front` | Shardwind Front | hazard | grit TN8 | 1 Wound (LB 8) | — | W1 | narrative note (RV 0) | O0/M1/I0; 1 sectors; EI 0.10 | 83% median; 17/17 ≥50% | none per-card; co-op ≤2 helpers; no solo test ease; recall W4 solo/W3 multi | 12 |
| middle | red | `suture-storm` | Suture Storm | hazard | grit TN8 | 1 Wound; forced displacement 1 (LB 12) | position changes | W1 | narrative note (RV 0) | O2/M4/I0; 6 sectors; EI 0.94 | 83% median; 17/17 ≥50% | none per-card; co-op ≤2 helpers; no solo test ease; recall W4 solo/W3 multi | 13 |
| middle | red | `trench-blast` | Trench Blast | hazard | grit TN8 | 1 Wound (LB 8) | — | W1 | narrative note (RV 0) | O0/M1/I0; 1 sectors; EI 0.14 | 83% median; 17/17 ≥50% | none per-card; co-op ≤2 helpers; no solo test ease; recall W4 solo/W3 multi | 12 |
| middle | yellow | `ash-court-duelist` | Ash-Court Duelist | enemy | command CV9 | 1 Wound (LB 8) | — | W1 | Trophy 2; +2 bonus Trophies (RV 4) | O0/M3/I0; 3 sectors; EI 0.34 | 3% median; 0/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 65 |
| middle | yellow | `breach-lens-overload` | Breach-Lens Overload | hazard | forge TN8 | 1 Wound (LB 8) | — | W1 | Gear: field-lens (RV 6) | O0/M3/I0; 3 sectors; EI 0.32 | 83% median; 17/17 ≥50% | none per-card; co-op ≤2 helpers; no solo test ease; recall W4 solo/W3 multi | 9 |
| middle | yellow | `coffin-frame-automaton` | Coffin-Frame Automaton | enemy | forge CV8+2 | 1 Wound (LB 8) | note-only: defeat gain salvage | W1 | Trophy 5; narrative note (RV 5) | O0/M3/I0; 3 sectors; EI 0.46 | 3% median; 0/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 65 |
| middle | yellow | `crown-bell-baron` | Crown-Bell Baron | enemy | command CV7 | lose 1 Salvage (LB 3) | — | Salv−1 | Trophy 2; narrative note (RV 2) | O0/M1/I0; 1 sectors; EI 0.17 | 10% median; 0/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I | 54 |
| middle | yellow | `iron-lung-grenadier` | Iron Lung Grenadier | enemy | forge CV6+1 | 1 Wound (LB 8) | — | W1 | Trophy 4; narrative note (RV 4) | O1/M5/I0; 6 sectors; EI 1.07 | 16% median; 0/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 54 |
| middle | yellow | `iron-synod-chirurgeon` | Iron Synod Chirurgeon | enemy | forge CV10 | 2 Wounds (LB 16) | disable armor bonus | W2 | Trophy 3; +3 bonus Trophies; Gear: cinder-suture-kit (RV 12) | O1/M3/I0; 4 sectors; EI 0.44 | 3% median; 0/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 76 |
| middle | yellow | `lalla-bubu-crownling` | Lalla-Bubu Crownling | enemy | guile CV7 | 1 Wound (LB 8) | — | W1 | Trophy 2; narrative note (RV 2) | O0/M1/I0; 1 sectors; EI 0.13 | 16% median; 0/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 55 |
| middle | yellow | `memory-tax-gate` | Memory Tax Gate | hazard | command TN8 | choose: lose 1 Salvage or -1 next non-battle test (LB 3) | possible next-test penalty | Salv−1 | narrative note (RV 0) | O0/M3/I0; 3 sectors; EI 0.38 | 72% median; 17/17 ≥50% | none per-card; co-op ≤2 helpers; no solo test ease | 16 |
| middle | yellow | `mourning-engine-pup` | Mourning Engine Pup | enemy | forge CV9 | 1 Wound (LB 8) | — | W1 | Trophy 1; +1 bonus Trophy; narrative note (RV 2) | O0/M2/I0; 2 sectors; EI 0.21 | 5% median; 0/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 62 |
| middle | yellow | `route-splice` | Route Splice | hazard | guile TN8 | forced displacement 1 (LB 4) | position changes | No W/Scar/Salv | narrative note (RV 0) | O0/M1/I0; 1 sectors; EI 0.17 | 83% median; 17/17 ≥50% | none per-card; co-op ≤2 helpers; no solo test ease | 10 |
| middle | yellow | `shiv-market-crew` | Shiv-Market Crew | enemy | guile CV7 | 1 Wound (LB 8) | — | W1 | Trophy 4; narrative note (RV 4) | O1/M0/I0; 1 sectors; EI 0.08 | 16% median; 0/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 55 |
| middle | yellow | `velvet-knife-confessor` | Velvet Knife Confessor | enemy | guile CV7 | 1 Wound; 1 Scar choice (LB 20) | note-only: reroll block | W1 Scar1 | Trophy 4; narrative note (RV 4) | O0/M2/I0; 2 sectors; EI 0.23 | 16% median; 0/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 64 |
| middle | yellow | `yard-rivet-brute` | Yard-Rivet Brute | enemy | forge CV8 | 1 Wound (LB 8) | — | W1 | Trophy 3; narrative note (RV 3) | O1/M0/I0; 1 sectors; EI 0.10 | 10% median; 0/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 59 |
| outer | blue | `beacon-cable-snare` | Beacon Cable Snare | hazard | forge TN6 | 1 Wound (LB 8) | — | W1 | narrative note (RV 0) | O3/M0/I0; 3 sectors; EI 0.36 | 97% median; 17/17 ≥50% | none per-card; co-op ≤2 helpers; no solo test ease; recall W4 solo/W3 multi | 2 |
| outer | blue | `bell-mask-pilgrim` | Bell-Mask Pilgrim | enemy | signal CV5 | 1 Wound (LB 8) | — | W1 | Trophy 1; narrative note (RV 1) | O1/M1/I0; 2 sectors; EI 0.24 | 24% median; 3/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 47 |
| outer | blue | `bellwire-snare` | Bellwire Snare | hazard | guile TN7 | 1 Wound (LB 8) | — | W1 | narrative note (RV 0) | O2/M0/I0; 2 sectors; EI 0.20 | 92% median; 17/17 ≥50% | none per-card; co-op ≤2 helpers; no solo test ease; recall W4 solo/W3 multi | 5 |
| outer | blue | `cracked-censer-novice` | Cracked-Censer Novice | enemy | signal CV3 | 1 Wound (LB 8) | — | W1 | Trophy 1; narrative note (RV 1) | O2/M1/I0; 3 sectors; EI 0.35 | 44% median; 8/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 34 |
| outer | blue | `emberwatch-sparkfall` | Emberwatch Sparkfall | hazard | signal TN7 | 1 Wound (LB 8) | — | W1 | narrative note (RV 0) | O2/M0/I0; 2 sectors; EI 0.34 | 83% median; 17/17 ≥50% | none per-card; co-op ≤2 helpers; no solo test ease; recall W4 solo/W3 multi | 10 |
| outer | blue | `glass-chime-swarm` | Glass-Chime Swarm | hazard | signal TN6 | -1 next non-battle test (LB 3) | next eligible non-battle test | No W/Scar/Salv | narrative note (RV 0) | O1/M0/I0; 1 sectors; EI 0.07 | 92% median; 17/17 ≥50% | none per-card; co-op ≤2 helpers; no solo test ease | 5 |
| outer | blue | `glasswing-midge-cloud` | Glasswing Midge Cloud | enemy | signal CV4 | 1 Wound (LB 8) | — | W1 | Trophy 1; narrative note (RV 1) | O2/M0/I0; 2 sectors; EI 0.21 | 34% median; 5/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 40 |
| outer | blue | `grave-silt-press` | Grave-Silt Press | hazard | command TN5 | 1 Wound (LB 8) | — | W1 | narrative note (RV 0) | O2/M0/I0; 2 sectors; EI 0.20 | 97% median; 17/17 ≥50% | none per-card; co-op ≤2 helpers; no solo test ease; recall W4 solo/W3 multi | 2 |
| outer | blue | `gutter-bell-mite` | Gutter-Bell Mite | enemy | signal CV2 | lose 1 Salvage (LB 3) | — | Salv−1 | Trophy 1; narrative note (RV 1) | O3/M0/I0; 3 sectors; EI 0.33 | 56% median; 11/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I | 25 |
| outer | blue | `hushed-chapel` | Hushed Chapel | hazard | signal TN7 | 1 Scar choice (LB 12) | — | Scar1 | narrative note (RV 0) | O1/M0/I0; 1 sectors; EI 0.07 | 83% median; 17/17 ≥50% | none per-card; co-op ≤2 helpers; no solo test ease | 10 |
| outer | blue | `lantern-moth-swarm` | Lantern-Moth Swarm | hazard | signal TN5 | 1 Wound (LB 8) | — | W1 | — (RV 0) | O2/M0/I0; 2 sectors; EI 0.18 | 97% median; 17/17 ≥50% | none per-card; co-op ≤2 helpers; no solo test ease; recall W4 solo/W3 multi | 2 |
| outer | blue | `mirror-mite-bloom` | Mirror-Mite Bloom | enemy | signal CV5 | 1 Wound (LB 8) | — | W1 | Trophy 4; narrative note (RV 4) | O2/M0/I0; 2 sectors; EI 0.21 | 24% median; 3/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 47 |
| outer | blue | `roadside-bone-oracle` | Roadside Bone Oracle | hazard | signal TN5 | 1 Wound (LB 8) | — | W1 | Follower: saltflat-bone-reader (RV 6) | O2/M0/I0; 2 sectors; EI 0.18 | 97% median; 17/17 ≥50% | none per-card; co-op ≤2 helpers; no solo test ease; recall W4 solo/W3 multi | 2 |
| outer | blue | `sanctifier-beads` | Sanctifier Beads | hazard | signal TN6 | 1 Scar choice (LB 12) | — | Scar1 | Gear: signal-lantern (RV 6) | O1/M0/I0; 1 sectors; EI 0.07 | 92% median; 17/17 ≥50% | none per-card; co-op ≤2 helpers; no solo test ease | 6 |
| outer | blue | `spindle-static-squall` | Spindle Static Squall | hazard | signal TN6 | -1 next movement roll (LB 2) | next normal movement roll | No W/Scar/Salv | narrative note (RV 0) | O2/M1/I0; 3 sectors; EI 0.38 | 92% median; 17/17 ≥50% | none per-card; co-op ≤2 helpers; no solo test ease | 5 |
| outer | blue | `void-salt-sickness` | Void-Salt Sickness | hazard | forge TN5 | 1 Affliction draw (LB 12) | — | Aff1 | heal 1 Wound (RV 5) | O2/M0/I0; 2 sectors; EI 0.21 | 100% median; 17/17 ≥50% | none per-card; co-op ≤2 helpers; no solo test ease | 0 |
| outer | red | `ash-cinder-runt` | Ash-Cinder Runt | enemy | grit CV2 | 1 Wound (LB 8) | — | W1 | Trophy 1; narrative note (RV 1) | O2/M0/I0; 2 sectors; EI 0.20 | 66% median; 15/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 23 |
| outer | red | `ash-lane-cutters` | Ash-Lane Cutters | enemy | grit CV4 | 1 Wound (LB 8) | — | W1 | Trophy 1; narrative note (RV 1) | O1/M0/I0; 1 sectors; EI 0.06 | 44% median; 5/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 37 |
| outer | red | `ash-rat-skitter` | Ash-Rat Skitter | hazard | grit TN4 | lose 1 Salvage (LB 3) | — | Salv−1 | narrative note (RV 0) | O1/M0/I0; 1 sectors; EI 0.06 | 100% median; 17/17 ≥50% | none per-card; co-op ≤2 helpers; no solo test ease | 0 |
| outer | red | `breach-halberd` | Breach Halberd | hazard | forge TN6 | forced displacement 1 (LB 4) | position changes | No W/Scar/Salv | Gear: bridge-spike (RV 6) | O1/M0/I0; 1 sectors; EI 0.06 | 97% median; 17/17 ≥50% | none per-card; co-op ≤2 helpers; no solo test ease | 2 |
| outer | red | `broken-mast-collapse` | Broken Mast Collapse | hazard | grit TN8 | 2 Wounds (LB 16) | — | W2 | narrative note (RV 0) | O2/M0/I0; 2 sectors; EI 0.21 | 83% median; 17/17 ≥50% | none per-card; co-op ≤2 helpers; no solo test ease; recall W4 solo/W3 multi | 14 |
| outer | red | `chain-maul-salvager` | Chain-Maul Salvager | enemy | grit CV5 | 1 Wound (LB 8) | note-only: defeat gain salvage | W1 | Trophy 3; narrative note (RV 3) | O2/M1/I0; 3 sectors; EI 0.41 | 34% median; 4/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 44 |
| outer | red | `cinder-hounds` | Cinder Hounds | enemy | grit CV6 | 1 Wound (LB 8) | — | W1 | Trophy 3; narrative note (RV 3) | O1/M0/I0; 1 sectors; EI 0.06 | 24% median; 0/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 50 |
| outer | red | `cinder-bone-marauder` | Cinder-Bone Marauder | enemy | grit CV6 | 1 Wound (LB 8) | — | W1 | Trophy 2; narrative note (RV 2) | O1/M0/I0; 1 sectors; EI 0.07 | 24% median; 0/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 50 |
| outer | red | `cinder-veil-stalker` | Cinder-Veil Stalker | enemy | grit CV6 | 1 Wound (LB 8) | — | W1 | Trophy 6; Gear: tuning-spines (RV 12) | O2/M0/I0; 2 sectors; EI 0.13 | 24% median; 0/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 50 |
| outer | red | `furnace-ditch-collapse` | Furnace-Ditch Collapse | hazard | grit TN6 | 1 Wound (LB 8) | — | W1 | narrative note (RV 0) | O3/M0/I0; 3 sectors; EI 0.34 | 97% median; 17/17 ≥50% | none per-card; co-op ≤2 helpers; no solo test ease; recall W4 solo/W3 multi | 3 |
| outer | red | `hymn-scarred-zealot` | Hymn-Scarred Zealot | enemy | grit CV3 | 1 Wound (LB 8) | — | W1 | Trophy 1; narrative note (RV 1) | O1/M0/I0; 1 sectors; EI 0.06 | 56% median; 12/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 30 |
| outer | red | `lantern-ash-ghoul` | Lantern-Ash Ghoul | enemy | grit CV3 | 1 Wound (LB 8) | — | W1 | Trophy 1; narrative note (RV 1) | O2/M0/I0; 2 sectors; EI 0.20 | 56% median; 12/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 30 |
| outer | red | `moth-carrier-husk` | Moth-Carrier Husk | enemy | grit CV4 | 1 Wound; Global Escalation +1 (LB 13) | note-only: fail escalate | W1 | Trophy 2; narrative note (RV 2) | O1/M2/I0; 3 sectors; EI 0.42 | 44% median; 5/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 39 |
| outer | red | `mudglass-sinkhole` | Mudglass Sinkhole | hazard | grit TN6 | forced displacement 1 (LB 4) | position changes | No W/Scar/Salv | narrative note (RV 0) | O2/M0/I0; 2 sectors; EI 0.24 | 97% median; 17/17 ≥50% | none per-card; co-op ≤2 helpers; no solo test ease | 3 |
| outer | red | `redglass-stray` | Redglass Stray | enemy | grit CV7 | 1 Wound (LB 8) | — | W1 | Trophy 1; +1 bonus Trophy (RV 2) | O2/M0/I0; 2 sectors; EI 0.20 | 16% median; 0/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 56 |
| outer | red | `shattered-barricade` | Shattered Barricade | hazard | forge TN7 | Global Escalation +1 (LB 5) | — | No W/Scar/Salv | narrative note (RV 0) | O1/M0/I0; 1 sectors; EI 0.06 | 92% median; 17/17 ≥50% | none per-card; co-op ≤2 helpers; no solo test ease | 4 |
| outer | red | `smoke-leech-clutch` | Smoke-Leech Clutch | hazard | grit TN5 | 1 Affliction draw (LB 12) | — | Aff1 | narrative note (RV 0) | O2/M0/I0; 2 sectors; EI 0.16 | 100% median; 17/17 ≥50% | none per-card; co-op ≤2 helpers; no solo test ease | 1 |
| outer | yellow | `bridge-toll-runt` | Bridge-Toll Runt | enemy | command CV3 | lose 1 Salvage (LB 3) | — | Salv−1 | Trophy 1; narrative note (RV 1) | O3/M0/I0; 3 sectors; EI 0.28 | 44% median; 8/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I | 32 |
| outer | yellow | `choir-bulwark` | Choir Bulwark | enemy | command CV5+2 | 1 Wound (LB 8) | — | W1 | Trophy 2; narrative note (RV 2) | O1/M0/I0; 1 sectors; EI 0.06 | 10% median; 0/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 59 |
| outer | yellow | `copperjaw-vermin` | Copperjaw Vermin | enemy | forge CV7 | 1 Wound (LB 8) | — | W1 | Trophy 1; +1 bonus Trophy (RV 2) | O2/M0/I0; 2 sectors; EI 0.20 | 16% median; 0/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 54 |
| outer | yellow | `false-route-procession` | False-Route Procession | hazard | command TN7 | owner-selected displacement 1 (LB 3) | position changes | No W/Scar/Salv | Follower: webglass-runner (RV 6) | O0/M5/I0; 5 sectors; EI 0.61 | 83% median; 17/17 ≥50% | none per-card; co-op ≤2 helpers; no solo test ease | 10 |
| outer | yellow | `gate-tax-collectors` | Gate-Tax Collectors | enemy | command CV5 | required payment up to 1 Salvage (LB 3) | — | Salv−1 | Trophy 4; narrative note (RV 4) | O3/M2/I0; 5 sectors; EI 0.78 | 24% median; 2/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I | 45 |
| outer | yellow | `glass-tick-cloud` | Glass Tick Cloud | hazard | forge TN6 | lose 1 Salvage (LB 3) | — | Salv−1 | narrative note (RV 0) | O2/M0/I0; 2 sectors; EI 0.17 | 97% median; 17/17 ≥50% | none per-card; co-op ≤2 helpers; no solo test ease | 2 |
| outer | yellow | `guardian-bridge-duelist` | Guardian Bridge Duelist | enemy | command CV7 | 1 Wound (LB 8) | — | W1 | Trophy 6; narrative note (RV 6) | O0/M3/I0; 3 sectors; EI 0.34 | 10% median; 0/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 59 |
| outer | yellow | `iron-synod-hunter` | Iron Synod Hunter | enemy | forge CV8 | 2 Wounds (LB 16) | — | W2 | Trophy 7; Gear: marshal-seal (RV 13) | O0/M5/I0; 5 sectors; EI 0.70 | 10% median; 0/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 65 |
| outer | yellow | `latchspire-raider` | Latchspire Raider | enemy | guile CV6 | 1 Wound (LB 8) | — | W1 | Trophy 6; +1 Salvage (RV 8) | O1/M0/I0; 1 sectors; EI 0.07 | 24% median; 0/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 49 |
| outer | yellow | `locked-vault` | Locked Vault | hazard | forge TN7 | lose 1 Salvage (LB 3) | — | Salv−1 | narrative note (RV 0) | O1/M0/I0; 1 sectors; EI 0.08 | 92% median; 17/17 ≥50% | none per-card; co-op ≤2 helpers; no solo test ease | 4 |
| outer | yellow | `marrow-tax-auditors` | Marrow-Tax Auditors | hazard | guile TN7 | lose 1 Salvage (LB 3) | — | Salv−1 | Follower: pale-cartel-fixer (RV 6) | O0/M4/I0; 4 sectors; EI 0.49 | 92% median; 17/17 ≥50% | none per-card; co-op ≤2 helpers; no solo test ease | 5 |
| outer | yellow | `null-drone` | Null Drone | enemy | signal CV6 | 1 Wound (LB 8) | — | W1 | Trophy 3; narrative note (RV 3) | O1/M0/I0; 1 sectors; EI 0.08 | 16% median; 0/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 53 |
| outer | yellow | `pale-cartel-shakedown` | Pale Cartel Shakedown | enemy | guile CV6 | 1 Wound (LB 8) | — | W1 | Trophy 5; Gear: marshal-seal (RV 11) | O4/M0/I0; 4 sectors; EI 0.39 | 24% median; 0/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 49 |
| outer | yellow | `pale-contract-collector` | Pale Contract Collector | enemy | command CV8 | lose 1 Salvage (LB 3) | — | Salv−1 | Trophy 2; +2 bonus Trophies (RV 4) | O2/M0/I0; 2 sectors; EI 0.22 | 5% median; 0/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I | 58 |
| outer | yellow | `pale-toll-enforcer` | Pale Toll Enforcer | enemy | command CV6 | lose 1 Salvage (LB 3) | — | Salv−1 | Trophy 1; narrative note (RV 1) | O1/M1/I0; 2 sectors; EI 0.33 | 16% median; 0/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I | 50 |
| outer | yellow | `relay-husk` | Relay Husk | hazard | guile TN6 | Equipment suppression (LB 6) | Equipment suppression window; deny Equipment | No W/Scar/Salv | Gear: surveyor-chalk (RV 6) | O1/M0/I0; 1 sectors; EI 0.07 | 97% median; 17/17 ≥50% | none per-card; co-op ≤2 helpers; no solo test ease | 2 |
| outer | yellow | `relay-pilgrim-riot` | Relay Pilgrim Riot | enemy | command CV6 | 1 Wound (LB 8) | — | W1 | Trophy 5; narrative note (RV 5) | O2/M0/I0; 2 sectors; EI 0.18 | 16% median; 0/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 54 |
| outer | yellow | `rust-choir-peddlers` | Rust Choir Peddlers | enemy | guile CV5 | — (LB 0) | — | No W/Scar/Salv | Trophy 4; narrative note; optional pay 1 Salvage for recovery (RV 6) | O2/M0/I0; 2 sectors; EI 0.18 | 34% median; 3/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I | 37 |
| outer | yellow | `rust-mote-drone` | Rust-Mote Drone | enemy | forge CV3 | lose 1 Salvage (LB 3) | — | Salv−1 | Trophy 1; narrative note (RV 1) | O1/M0/I0; 1 sectors; EI 0.07 | 56% median; 14/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I | 25 |
| outer | yellow | `scrap-toll-gangers` | Scrap-Toll Gangers | enemy | guile CV5 | 1 Wound (LB 8) | — | W1 | Trophy 4; narrative note (RV 4) | O2/M0/I0; 2 sectors; EI 0.13 | 34% median; 3/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 42 |
| outer | yellow | `shardvine-ambushers` | Shardvine Ambushers | enemy | guile CV7 | 1 Wound (LB 8) | — | W1 | Trophy 6; Gear: veil-hook (RV 12) | O0/M4/I0; 4 sectors; EI 0.62 | 16% median; 0/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 55 |
| outer | yellow | `signal-rotted-engineer` | Signal-Rotted Engineer | enemy | forge CV4 | Equipment suppression (LB 6) | Equipment suppression window; deny Equipment; disable weapon bonus; note-only: fail drop gear | No W/Scar/Salv | Trophy 2; narrative note (RV 2) | O2/M0/I0; 2 sectors; EI 0.17 | 44% median; 7/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I | 37 |
| outer | yellow | `siren-relay-echo` | Siren Relay Echo | hazard | command TN6 | -1 next non-battle test (LB 3) | next eligible non-battle test | No W/Scar/Salv | +1 next non-battle test (RV 3) | O2/M1/I0; 3 sectors; EI 0.38 | 92% median; 17/17 ≥50% | none per-card; co-op ≤2 helpers; no solo test ease | 5 |
| outer | yellow | `slag-drone` | Slag Drone | hazard | forge TN7 | 1 Wound (LB 8) | — | W1 | Gear: cinder-suture-kit (RV 6) | O1/M0/I0; 1 sectors; EI 0.07 | 92% median; 17/17 ≥50% | none per-card; co-op ≤2 helpers; no solo test ease; recall W4 solo/W3 multi | 5 |
| outer | yellow | `soot-stained-cutpurse` | Soot-Stained Cutpurse | enemy | guile CV3 | lose 1 Salvage (LB 3) | — | Salv−1 | Trophy 1; narrative note (RV 1) | O2/M0/I0; 2 sectors; EI 0.22 | 56% median; 12/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I | 26 |
| outer | yellow | `static-larva-swarm` | Static Larva Swarm | enemy | guile CV2 | 1 Wound; 1 Scar choice; keyed +1 Scar choice (LB 32) | — | W1 Scar2 | Trophy 1; narrative note (RV 1) | O2/M0/I0; 2 sectors; EI 0.21 | 66% median; 17/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 28 |
| outer | yellow | `toll-scrip-urchins` | Toll-Scrip Urchins | enemy | guile CV2 | lose 1 Salvage (LB 3) | — | Salv−1 | Trophy 1; narrative note (RV 1) | O2/M0/I0; 2 sectors; EI 0.22 | 66% median; 17/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I | 19 |
| outer | yellow | `wire-chewer-pack` | Wire-Chewer Pack | enemy | forge CV3 | 1 Wound (LB 8) | — | W1 | Trophy 1; narrative note (RV 1) | O3/M0/I0; 3 sectors; EI 0.27 | 56% median; 14/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 27 |
| outer | yellow | `wireghost-key` | Wireghost Key | hazard | guile TN6 | 1 Wound (LB 8) | — | W1 | Gear: lockjaw-kit (RV 6) | O1/M0/I0; 1 sectors; EI 0.08 | 97% median; 17/17 ≥50% | none per-card; co-op ≤2 helpers; no solo test ease; recall W4 solo/W3 multi | 2 |
| outer | yellow | `yard-ghoul-welders` | Yard Ghoul Welders | enemy | forge CV6 | 1 Wound (LB 8) | — | W1 | Trophy 5; Gear: coffin-rig (RV 11) | O2/M0/I0; 2 sectors; EI 0.20 | 24% median; 0/17 ≥50% | none per-card; co-op ≤2 helpers; solo enemy −2 O/−1 M/0 I; recall W4 solo/W3 multi | 48 |

## Conclusions

1. The basic region curve is visible, but live placement blurs it. Authored region alone is not a reliable statement of when a player can meet a card.
2. Inner enemy power is dominated by combinations of opposed-roll difficulty and durable loss effects rather than Wound count alone.
3. Yellow has the largest and most mechanically diverse pool. Its lower raw-damage profile is offset by Equipment suppression, Salvage pressure, displacement, and choice costs.
4. Blue carries the highest concentration of Scar, Affliction, and signal/identity pressure. Red remains the most direct Wound lane.
5. Counterplay accessibility varies materially by tested stat and roster. Co-op assistance is the largest multiplayer relief valve; the lower multiplayer Wound threshold is the largest opposing pressure.
6. The most urgent audit questions are semantic consistency questions—double Scar, additive Trophy awards, note-only denial keys, and cross-region placement—not proof that a numerical rebalance is required.

## Reproduction notes

- Source snapshot: current working tree at audit time.
- Active-set rule: unique IDs in canonical sector `encounterDecks.threat`.
- Probability enumeration: exact 2d6 distributions, not Monte Carlo simulation.
- All results are rounded only for display; grouping and outlier calculations use full precision.
- This is a static card-power audit. It does not model draw order, soft exile, route frequency, player choices, Equipment loadouts, scenario-specific lane rules, or chained campaign state.
