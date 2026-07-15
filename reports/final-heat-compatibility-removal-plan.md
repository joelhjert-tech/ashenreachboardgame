# Final Heat compatibility removal plan

Date: 2026-07-15

Based on checkpoint: `3a7f232 feat: retire memory tax gate heat effect`

Status: planning only; **no removal occurred in this pass**

## Objective

Reach a boundary where canonical content cannot author Heat, runtime compatibility can load supported old saves without mechanical behavior, no client schema or projection admits Heat, and obsolete identifiers/assets can be removed or deliberately retained with documented save-version ownership.

The work must not reinterpret Heat as Scars. Each still-authored effect needs its own retirement approval or an explicit remove-without-replacement decision.

## Dependency graph

```text
canonical Heat effects (39)
  -> content-specific retirement approvals
  -> board/scenario/follower/escalation replacements
  -> empty active-effect validation allowlist
  -> schema can stop accepting Heat effects for current content

legacy threshold action
  -> event-stream/save replay inventory
  -> reject/no-op compatibility test
  -> reducer branch removal or migration-only adapter

legacy snapshot fields
  -> supported save-version policy
  -> v0/v1 fixture coverage
  -> explicit v3 migration/version boundary (if removed)
  -> characterHeat metadata retention or archival deletion

projection compatibility fields
  -> deep projection tests in all lifecycle states
  -> server-side stripping/typed removal
  -> client filter/type cleanup

stable IDs and assets
  -> save/content reference inventory
  -> ID/asset migration map
  -> runtime catalog update
  -> optional old asset deletion

documentation and generated prompts
  -> mark historical documents
  -> update current rules spine derivatives
  -> regenerate prompt catalogs
```

## Remaining fields, actions, and dependencies

| Compatibility surface | Dependents | Save/version dependency | Risk if removed now | Classification |
|---|---|---|---|---|
| v0 `character.heat` parser | `legacyCharacterSchemaV0`, v0 snapshot parser, migration tests | unversioned v0 saves | old saves fail strict parsing | Safe after migration/version policy |
| `legacyCompatibility.characterHeat` | v1/v2 snapshot schemas, migration, ownership validation, tests | nonzero v0 Heat preservation | discards faithfully preserved legacy metadata | Retain indefinitely or remove at major save boundary |
| v0/v1 `heatThreshold` | legacy game-state schemas, v1-to-v2 migration, tests | v0/v1 saves | old Mirror-era saves fail/migrate incorrectly | Retain until v0/v1 support ends |
| `gain_heat`, `gain_heat_all`, `lose_heat` effect union/schema | 39 authored definitions, reducer no-op, tests/fixtures | old serialized card/effect states | current board/scenario/follower/escalation content fails validation/parse | Safe after content retirement and legacy adapter tests |
| six JSON effect approvals | legacy validation and count tests | no save requirement by themselves | canonical content validation fails | Safe after content retirement |
| two lexical text approvals | legacy validation | none | validation fails for benign prose | Safe now if validator distinguishes resource language; otherwise after text decision |
| Heat-shaped Threat keys/tags | five Threat definitions, `threatEffects.ts`, validation approvals | stable card/effect identity may appear in saves/logs | stale/pending Threat resolution may fail | Safe after retired-state migration tests |
| `HEAT_THRESHOLD_REACHED` action | action union, reducer, event log compatibility | possible old event/replay records | behavior changes from recall; removing may break replay parse | **Must harden after event inventory/tests** |
| `shouldTriggerHeatThreshold()` | room server only | none; no call sites | none | Safe now |
| `heatCost` | gear schema/client types/validation | possible old item shapes | old content parse/type compatibility | Safe after legacy item fixture |
| shop `cost.heat` / `heatDelta` | action result, server public shop types, client shop types/overlay | possible old shop outcome shapes | old outcome projection changes | Safe after projection and legacy-outcome tests |
| `ResultDelta` type `heat` and filters | server/client result types, result helpers/components | stale patches/reconnect payloads | old patches may fail client parsing; filters currently suppress display | Retain until protocol/version boundary, then remove |
| follower `lossCondition: "heat"` | four follower records, schemas/client types | stable follower state | strict parse failure; loss behavior is already semantically stale | Safe after follower retirement/migration |
| `heat-sink-prayer` / `artifact-heat-sink-prayer` IDs | content, runtime art catalog, board graph, server/client Scar reaction, saves | equipped item/card IDs in saves | breaks Scar-Sink Prayer inventory and reaction | Retain indefinitely unless explicit ID migration |
| `getGlobalHeatLevel` name | Nemesis movement and tests | none; behavior is Scar/escalation pressure | careless removal changes Nemesis movement | Safe rename after tests; do not change behavior |
| old Heat art/prompt paths | design catalogs, generated prompts, asset audits | no gameplay save requirement found | audit/generation drift | Safe after asset-reference audit |

## Cleanup classification

### Safe now

These appear removable without changing valid current gameplay, subject to the normal focused tests:

- unused `shouldTriggerHeatThreshold()` method;
- stale Heat deck/card art prompt entries and four unreferenced Heat card assets, after a final asset-manifest reference check;
- obsolete comments and generated authoring text that teach Heat as current;
- stale `getGlobalHeatLevel` name, as a behavior-preserving rename;
- clearly historical UI design references such as the Heat result-chip motion instruction;
- the two benign prose allowlist entries if validation is narrowed to distinguish resource-language Heat from ordinary lowercase physical heat.

No item in this section was removed during this audit.

### Safe after tests

- reject or turn `HEAT_THRESHOLD_REACHED` into an explicit compatibility no-op, then remove its reducer mutation only after legacy event replay coverage;
- strip Heat-shaped keys from every server projection before removing client-side defensive filters;
- remove client `heat`, `heatCost`, `heatDelta`, and `ResultDeltaType "heat"` types after deep projection fixtures prove they never arrive;
- remove shop Heat cost/risk branches after legacy shop/outcome fixtures establish the chosen compatibility behavior;
- retire Heat-shaped Threat effect keys/tags after stale pending-Threat/reconnect fixtures exist;
- rename/remove no-op threat resolver helpers after all stable key references are migrated.

### Safe after migration

- remove unversioned v0 `character.heat` parsing;
- remove v0/v1 `heatThreshold` parsing;
- remove or archive `legacyCompatibility.characterHeat`;
- remove `gain_heat`, `gain_heat_all`, and `lose_heat` from the general current content schema;
- remove follower `lossCondition: "heat"`;
- rename `heat-sink-prayer` stable IDs or their active asset path.

These changes require a declared supported-save boundary or a new snapshot version with explicit migration. A v3 boundary is the natural place to stop accepting v0/v1 shapes, but the product’s save-support policy must decide that separately.

### Retain indefinitely

If preserving old saves is inexpensive and no protocol version is planned, retain:

- `legacyCompatibility.characterHeat` as opaque validated metadata;
- v0/v1 migration parsers in a migration-only module;
- `heat-sink-prayer` and `artifact-heat-sink-prayer` stable IDs while showing only Scar-Sink Prayer to players.

Indefinite retention is acceptable only when these surfaces cannot enter current authored models, projections, actions, or mechanics.

## Required content approvals before schema narrowing

The 39 remaining authored effects need separate decisions:

1. **Board-text batch (32):** audit frequency and intended consequence per sector/choice; approve typed replacements or remove without replacement.
2. **Scenario batch (1):** replace the Mirror of False Heroes conditional effect through the existing scenario-pressure/Scar/Wound systems only if separately approved.
3. **Escalation batch (4):** reconcile the legacy effect with each card’s existing `escalationDelta`; avoid double-applying shared escalation.
4. **Follower batch (2 effects, four Heat loss conditions):** approve current follower benefits/loss triggers and preserve private information boundaries.
5. **Threat-key metadata batch (5 keys, four tags):** decide whether stable keys remain migration aliases or are retired in place.

Until these approvals land, removing the generic Heat effect schema would break current canonical content loading even though the effects are no-ops.

## Test prerequisites

Before removing compatibility code, add:

- a full canonical-content guard asserting zero `gain_heat`, `gain_heat_all`, and `lose_heat` definitions;
- a board-text/scenario import test that rejects legacy Heat effects;
- an empty-active-allowlist assertion for `LEGACY_HEAT_EFFECT_APPROVALS`;
- deep phone/TV projection key scans across lobby, action, movement, battle, shop, scenario, private choice, reconnect, and rivalry;
- legacy v0/v1 snapshot fixtures with nonzero Heat metadata and active retired-Threat states;
- a legacy event-stream fixture containing `HEAT_THRESHOLD_REACHED`;
- reducer proof that every legacy Heat effect/action is either rejected or a no-op and cannot recall;
- paired snapshots proving different legacy Heat values yield identical Wound, Scar, battle, movement, economy, scenario, mission, and reward results;
- client protocol fixtures proving stale Heat deltas are ignored until the protocol field is removed;
- an asset reference test before deleting old Heat images.

## Migration prerequisites

1. Decide how long unversioned v0 and v1 saves remain supported.
2. Inventory whether persisted event logs are replayed or merely stored; this determines treatment of `HEAT_THRESHOLD_REACHED`.
3. If compatibility is removed, introduce a v3 snapshot migration that consumes v0/v1 through a dedicated importer and writes no Heat metadata into v3.
4. Decide whether historical `characterHeat` is discarded, archived outside gameplay state, or retained indefinitely.
5. Preserve stable seat/character ownership validation during any metadata migration.
6. Provide an ID migration table before renaming Scar-Sink Prayer’s stable IDs.
7. Version the client/server patch contract before deleting Heat-shaped result/shop fields if older clients are supported.

## Recommended phases

### Phase C1 — Containment hardening

- Add missing projection, event-replay, and no-mechanical-effect tests.
- Make `HEAT_THRESHOLD_REACHED` reject or no-op through an explicit approval.
- Establish a server-side Heat stripping boundary.
- No content rebalance.

### Phase C2 — Remaining authored content retirement

- Approve and implement board-text, scenario, escalation, follower, and Threat-key batches separately.
- Empty `LEGACY_HEAT_EFFECT_APPROVALS` for active effects.
- Keep save adapters intact.

### Phase C3 — Current-model narrowing

- Remove legacy effect/action/cost variants from current authored schemas and runtime unions.
- Keep old parsers in a migration-only namespace.
- Remove client projection compatibility fields after protocol tests pass.

### Phase C4 — Documentation and asset cleanup

- Correct the rules skeleton, card economy spine, MVP rules, motion bible, README, and art-direction guidance.
- Mark retirement reports historical.
- Regenerate card/image prompt catalogs.
- Delete only unreferenced old Heat assets.

### Phase C5 — Save-version boundary, optional

- If product policy ends v0/v1 support, add the approved migration/version bump and remove old parsers/metadata.
- Otherwise retain the small migration-only compatibility surface indefinitely.

### Phase C6 — Final re-audit

Re-run the full tracked search and require:

- zero authored typed Heat effects;
- zero active resource presentation;
- zero gameplay-mutating Heat action branches;
- zero current projection keys;
- compatibility references confined to migration-only modules, stable IDs, tests, and explicitly historical docs.

## Risk summary

The highest risk is deleting parsers or stable IDs before deciding save support. The second-highest risk is treating the 39 authored no-op effects as harmless compatibility: they keep Heat authorable and obscure missing intended consequences. The safest sequence is tests, content retirement, current-model narrowing, documentation/assets, and only then an optional save-version removal.

**No compatibility field, action, schema, content definition, UI path, asset, or test was removed or modified in this audit pass.**
