# Ashen Reach Scenario Content Alignment

## Relic structural evidence

The Fandom `Scenarios` category contains 12 scenario sheets. Existing research and the official scenario anatomy establish a compact structure: setup/global rules, a center-space confrontation, and a victory condition. The archive does not contain a scenario-sheet manifest with exact per-sheet counts of objectives, enemies, hazards, stages, or escalation effects.

Ashen Reach retains exactly six scenarios. It deliberately does **not** match Relic’s scenario identity count of 12. The approved translation is structural density and clarity, not twelve Ashen Reach scenarios.

## Current six-scenario inventory

| Stable ID | Special rules | Confrontation steps | Rewards | Pressure track | Alignment risk |
|---|---:|---:|---:|---|---|
| `scenario_broken_seal` | 5 | 5 | 4 | Seal Integrity | Low; reference implementation |
| `scenario_throne_of_ash` | 6 | 6 | 4 | Crown Hunger | High; Rivalry ownership/spend |
| `scenario_mirror_of_false_heroes` | 5 | 5 | 4 | Mirror Pressure | High; pressure and preparation clarity |
| `scenario_devourer_beneath` | 6 | 5 | 4 | Doom | Medium; closest remaining runtime alignment |
| `scenario_labyrinth_engine` | 7 | 5 | 4 | Engine Instability | High; movement/gate ownership |
| `scenario_dying_star` | 6 | 6 | 4 | Starfire | Medium-high; charge/payment/Wound promises |

Every scenario remains selectable. All final confrontations use the canonical center sector; scenario art replaces only its image layer and does not change sector identity, topology, overlays, or movement.

## Approved package template

Because Relic per-sheet sub-counts are not archived, Phase A adopts the existing Ashen Reach median rather than inventing Relic numbers:

- 1 setup block;
- 5–7 global/special rules;
- 2–4 preparation objective families;
- 2–4 side challenge hooks;
- 1 public pressure/loss track;
- 1 center-tile unlock gate;
- 3–5 confrontation actions/stages;
- 1 canonical victory condition;
- 1 canonical loss condition;
- 4 scenario reward/result definitions;
- 0–4 scenario-specific cards initially, added only when typed ownership exists.

This template is a consistency envelope, not identical scenario mechanics.

## Six content manifests

### Broken Seal

- Reuse: Blue Threat and Contract preparation triggers, Seal Integrity, three center checks, current rewards/art.
- Preparation: restore Seal Integrity; side play never creates restoration marks.
- Side challenges: shrine repair and Artifact-charge restoration remain authored gaps.
- Confrontation: three checks; attempt-local restoration marks; 2 successes win.
- Ownership: canonical sourced shared victory at center.
- New package need: up to 2 shrine/ward challenges after typed spend and exact-charge approval.

### Devourer Beneath

- Reuse: Doom, trophy/Artifact/Maw Spike gate, existing Nemesis and center confrontation.
- Preparation: trophy leverage, Maw Spike, route/sector control.
- Side challenges: Maw approach and lure setup.
- Confrontation: damage/strike progress owned only at center.
- Ownership: killing confrontation action.
- New package need: 1 approach hazard, 1 guardian enemy, 1 Doom escalation card. Recommended next scenario phase.

### Mirror of False Heroes

- Reuse: Mirror Pressure, reflection-pressure threshold, existing confrontation checks/art.
- Preparation: Mirror Break setup and public pressure control; archival Heat never participates.
- Side challenges: reflection tests may prepare or reduce difficulty only.
- Confrontation: final reflection progress at center.
- Ownership: eligible final confrontation action.
- New package need: 2 reflection anomalies and 1 conditional elite after privacy review.

#### C3A Heat-retirement approval

The conditional high-pressure `gain_heat 1` leaf in `scenario_mirror_of_false_heroes.buildConfrontationPlan` is **APPROVED for removal without replacement**. It is inert compatibility residue, is counter-mismatched with the live shared-pressure admission check, and does not own preparation, confrontation progress, victory, loss, center access, or scenario art.

Implementation must change only that plan effect to `null`. Mirror Pressure, the mode-sensitive cutoff, final gate, three checks, backlash, `mirrorBreaks`, victory/loss handling, rewards, `center_cinder_gate`, and `/assets/scenarios/mirror-of-false-heroes.png` remain unchanged. This narrow approval does not resolve the separate P0 work for shared pressure ownership, non-center objective completion, preparation/confrontation separation, or False Hero threshold behavior.

### Throne of Ash

- Reuse: Crown Hunger, Crown claims, Rivalry presentation, current rewards/art.
- Preparation: public claims/offerings; any spend must consume exact resources.
- Side challenges: claimant and court pressure outside center.
- Confrontation: throne stages at center; claims provide leverage, never victory progress.
- Ownership: shared/personal/Rivalry source must be explicit.
- New package need: 1 court challenge, 1 claimant guardian, 1 Rivalry-safe event. High risk.

### Labyrinth Engine

- Reuse: Engine Instability, movement authority, current center confrontation/art.
- Preparation: keys, alignments, anchors, route knowledge.
- Side challenges: typed movement/gate tests; no topology mutation from card prose.
- Confrontation: shutdown stages at center.
- Ownership: final engine action.
- New package need: 2 route challenges, 1 persistent engine hazard, 1 guardian. Highest movement risk.

### Dying Star

- Reuse: Starfire, current finale checks/rewards/art.
- Preparation: ignition resources, charge/payment leverage, stabilization.
- Side challenges: reactor hazards and salvage work outside center.
- Confrontation: ignition marks only from center actions.
- Ownership: final ignition action.
- New package need: 1 reactor hazard, 1 recovery challenge, 1 Starfire escalation. Medium-high risk.

## Three-part state ownership

All six migrations must preserve:

1. **Preparation** — ordinary play and side objectives; unlocks, weakens, pays, or enables.
2. **Confrontation** — only center-finale actions produce boss damage, ritual stages, or final progress.
3. **Victory** — one canonical sourced action records condition ID, source ID/type, winning seat, sharing rule, and sequence.

Side objectives, Contracts, shops, ambient events, and preparation gains cannot call victory unless an explicitly approved non-confrontation ending exists.

## Center-tile and art contract

- Canonical end sector: `center_cinder_gate` for every scenario.
- Selection never teleports an operative.
- Scenario art is resolved from the selected stable scenario and projected to phone/TV.
- The center node retains ID, position, connections, legality, markers, threats, and overlays.
- Missing art uses the normal center fallback and non-failing diagnostic.
- Reconnect reprojects; reset clears selection and restores normal center art.

Broken Seal already implements this reference behavior. Remaining scenarios need regression coverage, not a new presentation architecture.

## Implementation order

1. Devourer state ownership and one approach package.
2. Dying Star typed preparation/payment classification.
3. Mirror preparation versus confrontation audit.
4. Throne Rivalry ownership and exact spend.
5. Labyrinth movement-safe package.

Each phase is one scenario and its specifically approved cards. Tests must cover preparation isolation, center gate, confrontation progress, sourced victory, duplicate rejection, ambient Wound pipeline, reconnect, art persistence, phone/TV separation, and unchanged mission/item systems.

## Remaining evidence gap

A separate Relic scenario archive is required before claiming exact Relic per-scenario package ratios. Until then, the current Ashen Reach 5–7 rule / 5–6 step / 4 reward envelope is the only evidence-backed numerical package. No scenario content is changed by this report.
