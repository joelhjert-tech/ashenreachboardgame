# Phase 1L — Authored Character Heat Default Quarantine

Date: 2026-07-13

Implementation revision base: `955e30d phase-1j-remove-mixed-heat-noops` plus later report/item commits through `bb925f6`.

## Outcome

Phase 1L separates the legacy Heat compatibility boundary into three validation-only approval classes. It retains all 17 required character `heat: 0` members unchanged, permits them only at their canonical character paths and IDs, and rejects new or nonzero authored defaults. No runtime, schema, content, save, projection, or reconnection behavior changes.

## Preflight population

Current character content contains exactly 17 records. Every record exists, has a unique ID, is accepted by the current character loader, and authors integer `heat: 0`. There are no missing, nonzero, unapproved, duplicate, or stale default-bearing character records.

| Character ID | File | Heat | Schema required | Construction | Active read | Active write | Approved |
| --- | --- | ---: | --- | --- | ---: | ---: | --- |
| `black-ledger-agent` | `content/characters/black-ledger-agent.json` | 0 | yes | copied | 0 | 0 | yes |
| `char_bjornis` | `content/characters/char_bjornis.json` | 0 | yes | copied | 0 | 0 | yes |
| `char_deepdale` | `content/characters/char_deepdale.json` | 0 | yes | copied | 0 | 0 | yes |
| `char_ker_von_ker` | `content/characters/char_ker_von_ker.json` | 0 | yes | copied | 0 | 0 | yes |
| `char_kira_dog` | `content/characters/char_kira_dog.json` | 0 | yes | copied | 0 | 0 | yes |
| `char_master_alpha` | `content/characters/char_master_alpha.json` | 0 | yes | copied when QA-selected | 0 | 0 | yes |
| `char_popelord` | `content/characters/char_popelord.json` | 0 | yes | copied | 0 | 0 | yes |
| `char_rumi` | `content/characters/char_rumi.json` | 0 | yes | copied | 0 | 0 | yes |
| `cinder-monk` | `content/characters/cinder-monk.json` | 0 | yes | copied | 0 | 0 | yes |
| `fleet-elder` | `content/characters/fleet-elder.json` | 0 | yes | copied | 0 | 0 | yes |
| `grave-engineer` | `content/characters/grave-engineer.json` | 0 | yes | copied | 0 | 0 | yes |
| `oathbroken-prince` | `content/characters/oathbroken-prince.json` | 0 | yes | copied | 0 | 0 | yes |
| `rift-cartographer` | `content/characters/rift-cartographer.json` | 0 | yes | copied | 0 | 0 | yes |
| `salvage-warden` | `content/characters/salvage-warden.json` | 0 | yes | copied | 0 | 0 | yes |
| `siege-medic` | `content/characters/siege-medic.json` | 0 | yes | copied | 0 | 0 | yes |
| `signal-witch` | `content/characters/signal-witch.json` | 0 | yes | copied | 0 | 0 | yes |
| `void-marshal` | `content/characters/void-marshal.json` | 0 | yes | copied | 0 | 0 | yes |

`characterSchema` remains required and supplies no default. Missing remains distinct from zero and continues to fail parsing. Construction and replacement paths remain unchanged.

## Approval structure

Previously, `APPROVED_LEGACY_HEAT_CONTENT_IDS` was a single 71-ID permission set. Any blocked Heat-shaped construct on a listed ID passed, so a character-default approval could implicitly authorize effects, text, costs, deltas, or thresholds.

The validator now uses these authoritative validation manifests:

| Approval class | IDs | Authority |
| --- | ---: | --- |
| `LEGACY_HEAT_EFFECT_APPROVALS` | 40 | Exact per-ID constructs such as `gain_heat`, `gain_heat_all`, `lose_heat`, or specifically retained player-facing legacy text |
| `LEGACY_CHARACTER_HEAT_DEFAULT_APPROVALS` | 17 | Exact canonical character path, field `heat`, integer value `0` |
| `OTHER_LEGACY_HEAT_COMPATIBILITY_APPROVALS` | 14 | Stable IDs, follower loss-condition values, resource tags, and Heat-shaped threat keys; grants no field/effect permission |
| Overlap | 0 | Approval classes are disjoint |
| Combined unique compatibility IDs | 71 | Compatibility support unchanged |

The old combined export remains as a compatibility view for existing count and inclusion tests. It is no longer consulted as authoring authority.

## Validation behavior

### Existing approved defaults

An existing default passes only when the record is at its approved `content/characters/*.json` path, the ID matches, the canonical field is exactly `heat`, and its value is integer zero.

### New or copied characters

A new, copied, renamed, or QA-only character with `heat: 0` fails. The error identifies file, ID, content type, field, actual value, missing approval class, compatibility purpose, and developer action. Representative message:

> `content/characters/new-operative.json (new-operative, character) authors compatibility-only field character.heat with value 0. The ID is not approved in LEGACY_CHARACTER_HEAT_DEFAULT_APPROVALS. New characters must not introduce Heat defaults; request a field-specific compatibility decision instead.`

### Nonzero defaults

Approved IDs changed to `1`, `7`, `-1`, or a fraction fail the quarantine. Schema validation may reject invalid shapes independently; the quarantine directly proves rejection of schema-valid nonzero integers. Historical nonzero values in serialized sessions are not content authoring and remain accepted by runtime schemas.

### Cross-approval isolation

- Default approval does not authorize `gain_heat`, `gain_heat_all`, `lose_heat`, `heatCost`, `cost.heat`, `heatDelta`, `heatThreshold`, player-facing Heat/Risk text, or another Heat-shaped field.
- Effect approval authorizes only its listed construct and never `character.heat`.
- Stable ID/other compatibility approval grants no field or effect authority.
- Mirror's `heatThreshold` remains outside this content-default manifest and is not changed.

### Stale-manifest protection

Full content validation now reconciles the manifests against all canonical JSON records. It fails on a missing or duplicate approved ID, missing approved field, nonzero approved value, wrong canonical path/content type, absent approved effect construct, duplicate approval, or cross-class overlap. Other compatibility approvals must still resolve to exactly one non-character content record and retain an explicit purpose.

No wildcard, folder exception, substring permission, or runtime import was introduced.

## Compatibility counts

| Measure | Result |
| --- | ---: |
| Approved character-default IDs | 17 |
| Approved Heat-effect IDs | 40 |
| Other compatibility approval IDs | 14 |
| Approval overlap | 0 |
| Combined unique compatibility IDs | 71 |
| Approved zero defaults | 17 |
| Nonzero authored defaults | 0 |
| Unapproved default-bearing IDs | 0 |
| Stale default approvals | 0 |
| Heat-only IDs | 29 |
| Heat-only branches | 32 |
| Heat-effect occurrences | 41 |
| `gain_heat` | 27 |
| `gain_heat_all` | 3 |
| `lose_heat` | 11 |
| Player-facing Heat routes | 0 |
| Player-facing Risk routes | 0 |
| Active `character.heat` gameplay reads | 0 |
| Active `character.heat` gameplay writes | 0 |

Raw compatibility-shaped properties and structural copies remain in schemas, projections, action/result types, and two immutable reducer copies. They are not active affordability, reward, threshold, or mutation paths and were not changed.

## Focused coverage

The focused validator suite contains 21 tests covering:

- exact counts, disjoint classes, and the 71-ID union;
- all 17 canonical records and integer-zero values;
- new, copied, and QA character rejection;
- positive, negative, and fractional authored values;
- effect/default/stable-ID isolation;
- construct-specific effect approval;
- costs, deltas, thresholds, text, and arbitrary Heat-shaped fields;
- missing, stale, duplicate, wrong-path/type, and cross-class approvals;
- preservation of current non-Heat consequence systems.

Full content validation additionally runs manifest reconciliation over the live content tree.

## Diff containment and behavior preservation

Changed production files are limited to validation infrastructure under `scripts/`. Tests are limited to the focused validator suite. No `src/` runtime file, schema, character JSON, content mechanic, fixture, generated output, save, projection, reconnect implementation, Mirror data, or asset changed.

Preserved behavior:

- all 17 authored character values remain zero;
- `characterSchema.heat` remains required with no schema default;
- new-session/replacement construction remains unchanged;
- old nonzero saved values deserialize and serialize unchanged;
- reconnect preserves old values unchanged;
- phone and TV compatibility projections remain unchanged;
- generic Heat effects remain deliberate no-ops;
- Heat-only content, Rust Choir Peddlers, Mirror `heatThreshold`, and Phase 1J removals remain unchanged.

## Four-seat critique

**New Player.** There is no player-visible change and no Heat/Risk route returns. The quarantine prevents a future character from accidentally reintroducing an invisible resource.

**Optimizer.** New content cannot seed a spendable nonzero Heat value, copied IDs do not inherit approval, and effect approval cannot be repurposed as field approval. Old nonzero save values remain exact but mechanically inert.

**Family Player.** No meter, prompt, migration step, or bookkeeping appears. Existing rooms and reconnect behavior are untouched.

**Rules Lawyer.** Authority is ID-, path-, field-, construct-, and value-specific. Zero remains different from omission; omission remains invalid today. Content authoring restrictions do not rewrite historical serialized values, and effect/default/threshold/result/stable-ID boundaries remain distinct.

## Remaining prerequisites

1. Approve and implement a named compatibility constructor before removing the 17 JSON members.
2. Keep the runtime/persisted field required until optional-field parsing is separately approved.
3. Add save versioning and dual-read precedence before new-save omission or field removal.
4. Decide the old-nonzero compatibility support window.
5. Retire projection keys, Mirror's semantic key, and generic discriminators only in separate approved phases.
6. Complete the 29 Heat-only IDs/32 branches and Rust Choir Peddlers through their individual design tracks.

## Verification

- Focused legacy Heat validation: 21/21 passed.
- `npm.cmd run validate:content`: passed with all 17 character records unchanged.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run test`: passed; 77 files and 828 tests.
- `npm.cmd run build`: passed.
- `npm.cmd run audit:assets`: passed; 404/404 present, zero missing, invalid, placeholder, release-blocking, or tier-separation issues.
- `git diff --check`: passed.
- `git diff --cached --check`: passed for the isolated Phase 1L staging set.
