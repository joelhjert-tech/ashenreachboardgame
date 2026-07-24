# P23 Card Category Completion Report

## Result

P23 classifies 398 card-like records: 361 in ten gameplay families and 37 appendix records. The generated matrix reports 373 complete records, 12 development-only records, 12 compatibility-only legacy Missions, and one superseded presentation-only Threat record. No record is silently omitted, partial, unreachable, or ambiguously unused.

## Implemented gaps

### Afflictions

- Added typed `draw_affliction` authored effects.
- Added four controlled Threat failure sources without introducing other balance changes.
- Added a persisted, per-operative, without-replacement draw queue.
- Added interruption-safe Runaway Growth choice, Oath to the Breach chaining, and Condemned Echoes replacement draws.
- Added persisted Blood Fury, Future Sickness, and Bile Spit reactions.
- Rewrote five unsupported concepts into existing test/battle modifiers.
- Added owner-only phone actions and a public required-action summary.

### Equipment

- Converted all sixteen deferred normal passives to `effectModel: permanent`.
- Required the exact item to be equipped.
- Replaced situational mechanical copy with explicit "While equipped" +1 text.
- Removed the canonical passive deferral allowlist.
- Corrected Ashen Route Compass copy to describe only its movement-roll adjustment.

### Artifacts

- Removed four unused eligibility booleans from all 30 canonical records.
- Kept a legacy-compatible Artifact parser for old metadata.
- Added `sourceArtifactCardId` to Artifact-granted owned gear.
- Distinguished 26 sector-pool presentations from four relic-dealer-only presentations.
- Preserved the existing eight focused direct-acquisition regressions and added source/path coverage.

### Remaining families

The generated individual matrix records each Threat, Anomaly, Escalation, Contract, Scar, Follower, and Tile Challenge's real trigger, resolver, outcome, cleanup, visibility, reconnect behavior, and tests. Rift Whispers is explicitly superseded as a drawable Threat and retained as the recurring challenge's presentation source. QA Equipment, Followers, and the QA character are development-only. Legacy Missions are compatibility-only.

## State and protocol

- Save version remains 2.
- New state is optional and defaults safely: `pendingAfflictionResolution` and `pendingAfflictionReaction`.
- Owner intents contain only server-issued pending IDs, a legal stat, an accept/decline flag, and an optional die index.
- Random selection and replacement dice remain server-only.
- Existing WebSocket transport and public/private projection boundaries remain intact.

## Changed implementation areas

- Card, Gear, Affliction, and Session schemas.
- Core actions and reducer.
- Server resolution, projection, and reconnect-safe queue handling.
- Phone action presentation.
- Threat, Affliction, Equipment, and Artifact content metadata.
- Lifecycle generator, machine matrix, tests, rulebook, and quick reference.

## Explicit non-changes

- No artwork or audio was added, removed, or modified.
- No save-version bump.
- No movement, battle, economy, progression, scenario, Contract, or privacy rule outside the approved card lifecycle changes.
- No client-side randomness.
- No commit or push.

## Final verification

- The generated lifecycle matrix contains exactly 398 individually classified records with no duplicate family/ID keys and no silent omissions.
- Content validation and TypeScript checking pass.
- Focused P23 coverage passes, including queue persistence, without-replacement draws, Blood Fury server rerolls, privacy, Equipment suppression, Artifact source links, and legacy parsing.
- The complete engine/rules, rules-only, server integration, and client suites pass.
- The production build and 501-file asset audit pass.
- Save version remains 2; no art or audio path changed; no file is staged.
