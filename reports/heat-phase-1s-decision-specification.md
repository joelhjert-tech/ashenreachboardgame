# Phase 1S decision specification: Mirror threshold semantic migration

All recommendations are **pending approval**. This is the implementation-ready specification for Phase 1T; Phase 1S implements nothing.

## Approved target to request

Use `reflectionPressureThreshold` as the only current runtime/v2 field. Introduce `saveVersion: 2`, freeze strict v1 with `heatThreshold`, add a pure `v1 -> v2` migration, and chain unversioned v0 through the unchanged Phase 1P character-Heat migration before the rename migration.

## Exact implementation contract

### Schemas

1. Preserve strict v0 snapshot parsing, including required legacy character Heat and required old threshold key.
2. Add/freeze a strict v1 state/snapshot schema with Heat-free characters and required `heatThreshold: integer >= 1`.
3. Rename current `gameStateSchema` to require `reflectionPressureThreshold: integer >= 1`; strict parsing rejects `heatThreshold`.
4. Define strict v2 snapshot schema with literal `saveVersion: 2`, current state, and the unchanged optional `legacyCompatibility.characterHeat` envelope.
5. Keep owner validation for archival metadata unchanged.

### Persistence functions

- Keep `migrateSessionSnapshotV0ToV1` behavior unchanged.
- Add `migrateSessionSnapshotV1ToV2` as a pure, deterministic, non-mutating exact rename.
- Update `parseAndMigrateSessionSnapshot`: missing -> v0->v1->v2; 1 -> v1->v2; 2 -> strict clone/validate; all other values reject.
- Update `CURRENT_SAVE_VERSION` to literal 2 and error copy to enumerate unversioned v0, legacy v1, and current v2.
- Replace the current v1 serializer with a current v2 serializer that writes only the canonical key. Do not dual-write.
- Preserve nonzero archival character Heat metadata without reading it into gameplay.

### Runtime

- Rename `GameState.heatThreshold` to `GameState.reflectionPressureThreshold`.
- Rename `SOLO_HEAT_THRESHOLD` and `getHeatThresholdForMode` to semantic equivalents.
- Initialize exactly 8 in single-player and 6 in other modes.
- Update the Mirror confrontation comparison without changing `>=`, timing, fallback pressure, outcome summary, phase transitions, or progression.
- Remove the obsolete threshold accessor from `legacyHeatCompatibility.ts` if no compatibility caller remains; old snapshot parsing belongs to persistence schemas, not gameplay compatibility helpers.
- Forbid old-key reads/writes in current production runtime.

### Content and validation

No scenario content definition currently authors the field. Do not add one. Preserve Mirror's `pressureTrack.max: 8`, scenario ID, copy, confrontation plan, and generated catalogs.

Remove `heatThreshold` from current authored-content compatibility recognition after proving no content record needs it. Snapshot v0/v1 compatibility must be handled by snapshot schemas rather than the content allowlist. Do not expand a general Heat allowlist for migration code.

### Network and reconnect

No projection or protocol change. The threshold is not transmitted. Reconnect attaches to current in-memory state and never invokes migration, renames state, reconstructs the scenario, or resets pressure. Phase 1R's zero projection Heat-key boundary remains enforced.

## Required tests

### Semantic behavior

- Defaults remain exactly 8 solo and 6 for cooperative/rivalry session modes.
- Mirror Pressure below threshold permits normal confrontation.
- Equality blocks immediately.
- Above threshold blocks identically.
- Repeated attempts at/above threshold remain blocked without duplicate progress.
- Threshold never mutates or resets during play.
- Blocking awards no Mirror Break and does not alter Loss Pressure, Global Escalation, or character state.

### Schemas and versions

- Strict v0 accepts old threshold plus required legacy character Heat.
- Strict v1 accepts only old threshold and Heat-free current characters.
- Strict v2 accepts only `reflectionPressureThreshold`.
- v1 rejects canonical key; v2 rejects old key; both-key and missing-key snapshots reject.
- Existing integer >= 1 constraint is identical across schemas.
- Unknown, malformed, negative, fractional, string, and null versions reject.

### Migration

- v1 old key becomes v2 canonical key with exact numeric preservation.
- Old key is absent in output; source input is unchanged.
- Deterministic repeat calls yield equal output.
- Current v2 parse is idempotent/equivalent.
- v0 chains through v1 to v2 without duplicating Phase 1P migration logic.
- Zero and nonzero legacy character Heat migration remains unchanged; archival metadata survives v1->v2 exactly.
- Pending encounter decisions, resolved IDs, battles, shops, contracts, artifacts/charges, scenario progress, Rivalry state, turn/round/phase, and seat identity survive.

### Runtime, content, and boundaries

- New sessions and all modes contain only canonical runtime field.
- Mirror confrontation behavior remains identical.
- Current production source contains zero `heatThreshold` reads/writes outside frozen v0/v1 schemas and migration.
- No content record contains old or new threshold field.
- Validation rejects new authored `heatThreshold` and does not confuse Mirror compatibility with character Heat.
- Reconnect preserves canonical threshold and pending state without calling migration.
- Phone/TV reflection display is unchanged; projection Heat-key count remains zero.
- Character Heat remains confined to v0 migration/archive; Heat-only content, Rust Choir Peddlers, and generic discriminators remain unchanged.

Estimated focused coverage: 20-30 assertions across snapshot migration/schema tests, session construction tests, Mirror confrontation tests, reconnect tests, and static boundary validation. Existing broad suite remains mandatory.

## Likely affected files

- `src/game/schema/session.schema.ts` — frozen v1 and current v2/state schemas.
- `src/game/persistence/sessionSnapshot.ts` — version 2 dispatcher, migration, serializer.
- `src/game/persistence/__tests__/sessionSnapshot.test.ts` — version/migration preservation matrix.
- `src/game/rules/soloTuning.ts` and tests — semantic constant/function names, identical values.
- `src/server/sessionState.ts` and tests — canonical initialization.
- `src/server/roomServer.ts` and Mirror/reconnect tests — canonical read and unchanged behavior.
- `src/game/rules/legacyHeatCompatibility.ts` and containment tests — retire threshold accessor only.
- General GameState fixture files that explicitly author the old key.
- `scripts/legacy-heat-validation.ts` and focused tests — remove current authoring approval for the old threshold while retaining other compatibility classes.
- Relevant rulebook/quick-reference text only if implementation review finds an old player-facing term; current scan found no `heatThreshold`, `Heat Threshold`, `Reflection Pressure`, or `Mirror Pressure` occurrence in the two requested manuals, so no speculative documentation edit is required.
- `reports/heat-phase-1t-mirror-threshold-migration.md` and the decision register.

## Commit plan

Use one coordinated commit. The current runtime type, frozen legacy schemas, migration chain, serializer, construction, and server comparison are compile-coupled; splitting would create an invalid intermediate contract. Suggested subject: `phase-1t-migrate-mirror-reflection-threshold`.

## Entry gates

- Explicit approval of canonical name and v2.
- Clean branch based on Phase 1R/approved Phase 1S evidence.
- Baseline counts reproduced.
- Strict v1 fixtures retained before changing current schema ownership.

## Exit gates

- Current runtime and v2 contain only canonical key.
- v0/v1 compatibility is strict and migration-tested.
- Exact thresholds and `>=` behavior are unchanged.
- No dual-read/dual-write path exists.
- Reconnect and projections are unchanged.
- Full content validation, typecheck, test, build, asset audit, and diff checks pass.
- Old key is isolated to v0/v1 schema/migration/tests, pending explicit legacy-version retirement.

## Compatibility matrix

| Input/state | Required outcome |
|---|---|
| Unversioned v0 | Validate old threshold and legacy character Heat; migrate v0->v1->v2 |
| v1 | Require old threshold; migrate exactly to canonical v2 |
| v2 | Require canonical key; validate without semantic migration |
| Both keys | Reject |
| Missing threshold key | Reject for every corresponding strict version |
| Unknown future version | Fail closed |
| Active current room | Already canonical; no migration |
| Reconnect | Reattach/project only; no migration or reset |

## Four-seat critique

- **New Player:** no visible change, no Heat/Risk wording, and current Mirror progress/join/reconnect behavior stays familiar.
- **Optimizer:** strict version ownership and both-key rejection prevent selecting a favorable threshold; repeated migration cannot duplicate scenario rewards or pressure.
- **Family Player:** migration is automatic at the future snapshot boundary, requires no prompt, and does not interrupt an in-memory family session.
- **Rules Lawyer:** old key is authoritative only in v0/v1, canonical key only in v2/current runtime, equality still triggers, exact numbers are preserved, and old-key deletion waits for explicit v0/v1 support closure.

## Remaining blockers after Phase 1T

None for the semantic rename itself once name and v2 are approved. Separate Heat retirement work remains: archival metadata support-window closure, legacy v0/v1 parser retirement, remaining Heat-only outcomes, Rust Choir Peddlers, and stable discriminator cleanup.

## Phase 1S verification record

- `npm.cmd run validate:content`: passed; 17 characters, 71 gear, 109 threats, 36 contracts, 20 anomalies, 30 artifacts, 24 followers, 15 scars, 16 escalations, and 30 afflictions.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run test`: passed; 81 files and 861 tests. Existing missing-map-art fallback diagnostics were emitted on stderr without failures.
- `git diff --check`: passed.
- `git diff --cached --check`: passed; staging is empty.

Only this specification, the two Phase 1S architecture/inventory reports, and the requested decision-register update differ from the baseline. No runtime, schema, content, UI, test, fixture, validation, projection, generated, snapshot, save-version, or asset file changed.
