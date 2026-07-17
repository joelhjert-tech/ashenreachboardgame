# Ashen Reach Challenge Distribution

## Source mapping

Relic’s wiki has no separate Challenge Cards category. Its 47 `Encounters` are the closest structural source for challenges: non-enemy cards that test, persist, offer choices, or alter a location. The archive does not yet provide verified sub-archetype counts from their image-only rules.

Ashen Reach’s canonical challenge system is narrower and explicit:

- schema: `src/game/schema/tileChallenge.schema.ts`;
- loader: `src/game/content/tileChallenges.ts`;
- lifecycle: `src/game/rules/tileChallenges.ts` and server pending state;
- content: `content/tile-challenges/`;
- current count: 1 (`rift-whispers-ashen-chapel`).

The schema supports `hazard | anomaly`, five stats, four triggers, typed success/failure effects, authored ordering, recurring persistence, tags, sector ownership, and art identity.

## Quantitative target

Long-range challenge target: 47, matching the Relic Encounter count structurally. Current: 1. Net: +46.

This is not authorization to create 46 cards. Exact Relic ratios for single-stat, multi-stat, combat, escalating, choice, group, reward, no-reward, movement-linked, and scenario-linked encounters remain unverified. Until scan transcription is complete, the safe Ashen Reach target bands are design goals rather than exact validation:

| Challenge family | Current | Initial approved pilot | Long-range role |
|---|---:|---:|---|
| Physical hazard | 0 | 2 | industrial/terrain pressure |
| Anomaly | 1 | 2 additional | Signal/reality pressure |
| Movement-linked | 0 | 1 | route interruption through movement authority |
| Choice/payment | 0 | 1 | bounded benefit or free decline |
| Multi-stage | 0 | 1 | two typed stages, no prose parsing |
| Scenario-linked | 0 | 1 | preparation only; never victory progress |
| Group challenge | 0 | 0 initially | blocked pending privacy/scope approval |

Pilot total: 8 challenges including the existing card. The remaining 39 are deferred until the pilot demonstrates pacing, persistence, and UI capacity.

## Required challenge record

Every new challenge must define:

- stable ID, family, sector, hazard/anomaly type;
- test stat and difficulty;
- trigger and authored order;
- typed success and failure effects;
- recurring/persistence behavior and reset/clear condition;
- whether movement is interrupted;
- whether equipment modifiers and Wound prevention apply;
- whether Scars are possible;
- one-player or public group scope;
- art ID, phone copy, TV summary, reconnect behavior, and source-event guard.

The current schema always recurs. Permanent-clear or escalating challenges require a focused lifecycle design; they must not be simulated with notes or removed client-side.

## Pilot concepts

- `challenge-furnace-span-shear`: Forge physical hazard; typed movement interruption; no direct topology changes.
- `challenge-ashglass-undertow`: Grit hazard; preventable Wound on failure; ordinary cleanup.
- `challenge-choir-blindspot`: Signal anomaly; public route information on success; persistent until passed if lifecycle approved.
- `challenge-mirror-frequency-knot`: Command anomaly; conditional difficulty from public scenario state.
- `challenge-scrap-arbitration`: Guile choice; optional Salvage payment with free decline.
- `challenge-relay-step-collapse`: Guile movement test; forced displacement through existing resolver.
- `challenge-engine-index`: Forge then Signal staged challenge; requires typed continuation.
- Existing `rift-whispers-ashen-chapel`: retain as the baseline recurring anomaly.

These are original concepts and not final card rules.

## Difficulty and consequence shape

Use current Ashen Reach bands: outer 5–7, middle 7–9, inner 9–11, with authored exceptions. The pilot should contain 2 low, 4 standard/high, and 2 inner/high challenges. At most two should use Wounds; at least two should use information/movement; only one should touch Salvage. No challenge should grant a trophy.

## Tests required per pilot

Schema validation, sector existence, authored order, trigger timing, modifier context, success/failure delta, Wound prevention, forced displacement legality, payment atomicity, recurrence/clear lifecycle, duplicate source rejection, reconnect restoration, phone owner controls, TV public summary, and contract objective progress exactly once.

## Blockers before strict 47-card completion

1. Relic encounter scan transcription for exact subtype ratios.
2. A typed permanent-clear/reset lifecycle alongside current recurring-only state.
3. Multi-stage continuation ownership.
4. Group-scope privacy and simultaneous-resolution policy.
5. Asset capacity and browser pacing validation.
