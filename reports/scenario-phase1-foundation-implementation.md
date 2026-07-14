# Scenario Phase 1 Foundation Implementation

## Outcome

Phase 1 separates scenario preparation, final-confrontation progress, and the authoritative scenario result. Side play can prepare a finale, but only an explicitly sourced final-confrontation or approved scenario action can own victory.

## Shared state

- `scenarioPreparation.resources` holds scenario-specific preparation values.
- `scenarioPreparation.completedObjectiveIds` records public preparation objectives.
- `scenarioConfrontation` holds the active confrontation ID, stage, and confrontation-only progress.
- `scenarioResult` records unresolved/victory/loss plus the condition, source type, source ID, winning seat, sharing rule, and authoritative sequence.
- Source-event ledgers reject duplicate preparation, spend, confrontation-progress, and victory processing.

The legacy `scenarioProgress` object remains available while the other five scenarios migrate, but Broken Seal no longer uses it for Seal Integrity or final restoration marks.

## Typed actions and validation

The engine now owns typed preparation gain/spend, confrontation start/progress, and sourced victory actions. Reducer validation enforces the active scenario, positive amounts, known Broken Seal keys, non-overlapping preparation/confrontation keys, sufficient preparation before spend, exact confrontation context, center-tile/phase/seat eligibility at start, and one victory source.

Phone clients do not submit these internal counter actions. Existing signed intents trigger server-authored actions with server-selected keys, values, and source IDs.

## Spending

`SCENARIO_PREPARATION_SPENT` is atomic: it rejects insufficient or replayed spends, subtracts the exact amount, and cannot advance confrontation progress implicitly. Broken Seal's currently enforced final gate is a possession/threshold gate, not a spend rule. The sheet's shrine payment and Artifact-charge conversion remain descriptive-only pending a focused typed-action phase; they were not silently treated as possession or implemented here.

## Ambient Wounds

Broken Seal confrontation backlash continues through the existing typed `take_wound` resolver. Existing Ker and Fandiablos prevention adapters are applied before the generic resolver, and recall/Scar/delta behavior remains owned by the normal Wound pipeline. No scenario-specific direct Wound mutation was added.

## Center tile and scenario art

All six scenarios use the canonical `center_cinder_gate` confrontation space. The TV renders the selected scenario's canonical `sheetArtPath` over that tile while retaining the tile node, sector ID, topology, overlays, and movement behavior. The phone uses the same projected scenario ID and art path. Missing scenario art falls back to the normal center-tile art and emits the established non-failing diagnostic. The art is derived from authoritative selected-scenario state, so reconnect and phase changes cannot retain a previous scenario's local artwork.

## Projections

Phone and TV receive the same public scenario ownership projection:

- Preparation: resources and completed objectives.
- Final confrontation: locked/unlocked, location, active state, progress, and stage.
- Scenario result: unresolved, victory, or loss.

Processed source-event IDs are never projected. The phone adds a scenario-art summary and distinct Preparation / Final Confrontation / Scenario Result rows. The TV adds the same three concise statuses and a center-tile final-confrontation marker; no new focus mode was introduced.

## Snapshot and reconnect compatibility

The save version remains v2. Existing v0 -> v1 -> v2 behavior is unchanged. A compatibility normalization maps an older Broken Seal `scenarioProgress.sealTokens` value into `scenarioPreparation.resources.sealIntegrity` when the new field is absent. It does not run during ordinary reconnect, recalculate current rooms, or alter historical Heat metadata.

## Remaining scenario migration plan

| Scenario | Preparation | Finale progress | Victory owner | Main gap | Risk / next phase |
|---|---|---|---|---|---|
| Devourer Beneath | Doom control, trophy/Artifact/Maw Spike gate | Nemesis damage | Killing confrontation | Spend promises and damage ownership need classification | Medium; migrate next because runtime is closest |
| Mirror of False Heroes | Reflection control and Mirror Break setup | Final reflection confrontation result | Eligible Mirror confrontation | Preparation and threshold semantics still overlap in presentation | High; dedicated privacy/pressure phase |
| Throne of Ash | Crown claims | Throne finale progress | Throne confrontation | Rivalry ownership and claim spending are under-enforced | High; rivalry-specific phase |
| Labyrinth Engine | Engine alignment/shutdown setup | Final shutdown stages | Engine confrontation | Movement/gate promises and progress share legacy counters | High; movement-safe phase |
| Dying Star | Starfire stabilization | Final ignition confrontation | Star confrontation | Artifact-charge and Wound promises need typed payment/consequence paths | Medium-high; payment/Wound phase |

## Verification record

Focused ownership, snapshot, scenario rule, server confrontation, projection, and center-art tests cover the new separation. Content validation and typecheck passed. The engine suite passed 454 tests, the client suite passed 252 tests, and the complete suite passed 932 tests across 87 files. The production build passed, the asset audit found all 404 assets present with zero release blockers, and both staged and unstaged diff checks passed. Existing non-failing missing-map-art diagnostics remained; the deliberate missing-scenario-art test also emitted its expected fallback diagnostic.
