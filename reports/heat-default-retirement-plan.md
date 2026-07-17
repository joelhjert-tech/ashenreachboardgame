# Heat default retirement plan

All batches are pending approval. The 17 IDs are: `black-ledger-agent`, `char_bjornis`, `char_deepdale`, `char_ker_von_ker`, `char_kira_dog`, `char_master_alpha`, `char_popelord`, `char_rumi`, `cinder-monk`, `fleet-elder`, `grave-engineer`, `oathbroken-prince`, `rift-cartographer`, `salvage-warden`, `siege-medic`, `signal-witch`, and `void-marshal`.

## Batch A — Stale and content-inert defaults

- **Exact defaults:** none. All 17 are mechanically inert but structurally required by the current parser.
- **Entry/exit:** enter only after proving a record is unreachable; no record meets that bar.
- **Risk/rollback:** none because no change is recommended.
- **Commit boundary:** no commit.

## Batch B — Content-authoring quarantine

- **Exact defaults:** all 17, retained as field-level legacy approvals.
- **Files:** `scripts/legacy-heat-validation.ts`, its tests, and a dedicated default manifest if approved.
- **Behavior:** split effect approvals from character-default approvals; allow exactly `heat: 0` on the 17 IDs and reject new IDs, nonzero authored values, or other Heat-shaped defaults.
- **Entry criteria:** current 71-ID manifest reconciled; existing content remains unchanged.
- **Exit criteria:** validation passes; new default/nonzero mutations fail; effects and defaults have separate ownership.
- **Tests:** 17-member manifest, exact-zero constraint, unknown ID rejection, effect allowlist unchanged.
- **Save/reconnect risk:** none. No runtime or schema change.
- **Rollback:** revert validation-only commit.
- **Recommended commit:** `phase-1l-quarantine-authored-heat-defaults`.

## Batch C — New-session write retirement

- **Exact defaults:** all 17 content fields; three explicit zero-writing construction paths are a separate runtime subtask.
- **Files:** character content, character loader/content schema boundary, `sessionState.ts`, selection/recruit paths, content validation/tests.
- **Behavior:** remove Heat from canonical character authoring; a named compatibility constructor supplies zero only while runtime `Character.heat` remains required. Do not yet omit the persisted field.
- **Entry criteria:** Batch B green; adapter design approved; no generated character owner exists.
- **Exit criteria:** all 17 load without authored Heat; new sessions behave identically; old nonzero saves remain exact; no UI change.
- **Tests:** content omission accepted only through loader adapter, direct runtime schema remains strict, all roster/session modes, QA selection, old nonzero round trip, reconnect.
- **Risk:** medium construction risk, low save risk because new runtime states still contain zero.
- **Rollback:** restore 17 JSON members and old loader.
- **Recommended commit:** one content-plus-adapter commit; do not combine with optional fields.

## Batch D — Optional-field migration

- **Exact field:** persisted/runtime `character.heat`, plus compatible client projection shapes in a separately reviewed sub-batch.
- **Files:** character/session/client schemas, construction, projections, fixtures, tests.
- **Behavior:** missing parses successfully; explicit old values win; new sessions may omit only after all ordinary code tolerates absence. Absence remains semantically inert and is not converted to zero for gameplay.
- **Entry criteria:** Batch C stable; dual-read precedence approved.
- **Exit criteria:** missing and nonzero fixtures both round-trip; no mechanic reads the field; reconnect behaves identically.
- **Risk:** high schema/reconnect risk.
- **Rollback:** keep dual writer and restore required writer while reader remains permissive.
- **Commit boundary:** parser/read compatibility first, writer omission second.

## Batch E — Versioned save migration

- **Exact field:** legacy `character.heat` in session snapshots; no content defaults.
- **Files:** snapshot schema, migration dispatcher, persistence/restart boundaries, fixtures.
- **Behavior:** introduce a version; preserve legacy Heat in a legacy extension or unchanged optional field; reject unknown future versions; never convert values.
- **Entry criteria:** approved support window and inventory of persisted room formats.
- **Exit criteria:** version N and N-1 round trips, reconnect/restart tests, rollback reader available.
- **Risk:** high.
- **Rollback:** continue emitting prior version and retain new backward reader.
- **Commit boundary:** infrastructure separate from any field deletion.

## Batch F — Schema and compatibility removal

- **Exact fields:** `character.heat` and hardcoded projection Heat keys only after their support gates; Mirror `heatThreshold` and generic discriminators are separate decisions.
- **Entry criteria:** support window closed, telemetry/fixture decision approved, no readers/writers, migration deployed.
- **Exit criteria:** old supported saves migrate explicitly; unsupported versions fail clearly; no Heat/Risk presentation.
- **Risk:** highest compatibility risk.
- **Rollback:** restore optional legacy field/adapter; never attempt value conversion.
- **Commit boundary:** projection removal, runtime-field removal, and discriminator cleanup remain separate commits.

## Recommended order

Batch B is the safest next implementation. Batch C follows without a save-format change. D must precede writer omission. E must precede final field removal. F cannot include Mirror or effect-discriminator retirement without their own approvals.
