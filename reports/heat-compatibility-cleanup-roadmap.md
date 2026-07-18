# Heat compatibility cleanup roadmap

> C6C status (2026-07-16): implemented. Canonical authoring/runtime/client models are Heat-free; legacy v0/v1/v2 inputs normalize through dedicated compatibility schemas and adapters. Remaining phases are C6D metadata migration, C6E documentation cleanup, and C6F compatibility deletion/version decision.

Date: 2026-07-16

Based on: `reports/final-heat-compatibility-boundary-rerun.md`

Current verdict: **PASS** (C6G closure, 2026-07-17)

This is a planning document. No compatibility removal occurred in C6A.

## Cleanup principles

- Preserve supported v0/v1/v2 saves until a release decision changes that support boundary.
- Never map Heat into Wounds, Scars, recall, Global Escalation, or another consequence.
- Separate current canonical authoring types from migration-only legacy types before deleting parsers.
- Preserve stable serialized IDs until an explicit ID migration exists.
- Keep phone and TV projections Heat-free throughout every phase.
- Use exact-file or exact-symbol compatibility allowlists, never broad directories.

## Dependency overview

```text
safe dead residue
  -> focused reference and projection tests
  -> C6B deletion

shared current Heat types
  -> migration-only effect/action schemas
  -> stale payload fixtures
  -> C6C current schema/type narrowing

follower/Threat metadata
  -> exact old-state fixtures
  -> canonical metadata decision
  -> C6D migration

misleading docs and prompt assets
  -> historical/current classification
  -> C6E cleanup

legacy snapshot fields and protocol support
  -> supported-save release decision
  -> versioned importer/migration
  -> C6F deletion decision
```

## C6B — Safe dead-code cleanup — implemented

Result: 28 Category F references removed without changing the 299 required compatibility references.

### Exact candidates

| File/symbol | Proposed action | Save risk | Reconnect risk | Required proof |
|---|---|---:|---:|---|
| `src/game/rules/shopCategories.ts` consumable regex | Implemented: obsolete lexical alternative removed | None | None | Shop category/catalog tests passed |
| `src/game/rules/nemesisRelay.ts#getGlobalHeatLevel` | Implemented: renamed `getNemesisPressureLevel` without behavior change | None | None | Nemesis pressure/movement tests passed |
| `src/server/roomServer.ts` unused helper import | Implemented: removed | None | None | Typecheck and Nemesis integration passed |
| `src/client/phone/PortraitControllerView.tsx` defensive reward label | Deferred to C6C | Old client payload only | Low | Narrow shared current payload type first |
| `src/client/tv/TvApp.tsx` defensive reward label | Deferred to C6C | Old client payload only | Low | Narrow shared current payload type first |
| `src/client/tv/HostShopOverlay.tsx` defensive legacy cost inference | Deferred to C6C | Old client payload only | Low | Narrow shared current payload type first |
| retired card/template/icon prompt entries and four legacy PNGs | Implemented: deleted after exact reference and asset audit | None | None | Runtime boundary and asset audit passed |

The stable `heat_on_threat_defeat` Nemesis rule ID must not be renamed in C6B unless serialization inventory proves it is not persisted. A behavior-preserving display/helper rename is safe; stable ID migration belongs in C6D or C6F.

The stable `heat_on_threat_defeat` ID remains deferred to C6D/C6F. No browser-facing branch changed in C6B, so focused automated projection coverage was sufficient.

Recommended commit: `chore: remove safe heat residue`

## C6C — Current schema and type narrowing

Goal: remove Heat from canonical authoring and current client/server models while retaining dedicated legacy import types.

### Exact surfaces

- `src/game/schema/card.schema.ts`
  - split `gain_heat`, `gain_heat_all`, and `lose_heat` from current `EncounterEffect`;
  - retain a legacy effect schema/type in a migration/compatibility module;
  - remove current `heat` resource tags after Threat/follower metadata migration.
- `src/game/schema/follower.schema.ts`
  - remove `heat` from the current loss-condition enum after C6D migration;
  - retain a legacy follower schema for old saves.
- `src/game/schema/gear.schema.ts`
  - remove current `heatCost`;
  - preserve Scar-Sink Prayer stable-ID validation.
- `src/game/engine/actions.ts`, `src/client/shared/types.ts`, and `src/server/roomServer.ts`
  - move Heat cost/delta/result/action shapes into explicit compatibility input types;
  - remove them from current projected/public interfaces.
- `scripts/legacy-heat-validation.ts`
  - retain the authoring ban;
  - remove the two ordinary-prose approvals by distinguishing retired-resource phrasing from environmental lowercase prose.

Save risk: medium. Old serialized pending effects and stale network payloads may use the removed discriminators.

Reconnect risk: medium until legacy pending-effect fixtures use the compatibility importer.

Tests:

- current schemas reject every Heat construct directly;
- legacy importer accepts old effect/action/card shapes;
- equivalent current state is produced for Heat 0 and Heat N;
- deep phone/TV key scans;
- stale shop/result payload fixtures;
- no-op event replay.

Browser QA: phone/TV reconnect from a migrated fixture and shop/result rendering.

Recommended commit: `refactor: isolate legacy heat types`

## C6D — Legacy follower and Threat metadata migration

Goal: remove Heat-shaped canonical metadata without breaking old follower or pending-Threat state.

### Followers

Migrate or explicitly retain:

- `black-lantern-broker.lossCondition`;
- `choir-defector.lossCondition`;
- `gate-saint-acolyte.lossCondition`;
- `saltflat-bone-reader.lossCondition`;
- `lucy-hell-puppy` `heat` tag.

The replacement must be a metadata decision only. It must not add follower loss, Wounds, Scars, costs, or fallback effects.

### Threats

Provide migration aliases for:

- `threat_force_choose_heat_or_wound`;
- `threat_force_discard_gear_or_gain_heat`;
- `threat_combat_plus_one_if_player_has_heat`;
- `threat_pay_heat_or_enemy_plus_two`;
- `threat_defeat_reduce_heat`.

Then remove deprecated canonical `heat` tags and retire unused sibling handlers only after old pending-Threat fixtures reconnect and finish without a consequence.

Save risk: high for held followers and pending Threat resolution keys.

Reconnect risk: high without exact fixtures.

Tests:

- old follower instance parses with unchanged ownership;
- C5B notes remain exact and once-per-round;
- old pending Threat key resumes as inert and completes once;
- no role fallback;
- no Heat tag/loss condition reaches projections;
- current canonical records are Heat-free.

Browser QA: owner follower activation/reconnect and pending Threat reconnect.

Recommended commit: `refactor: migrate legacy heat metadata`

## C6E — Documentation, test naming, and asset cleanup

Goal: stop current developer/player guidance from teaching Heat while retaining clearly historical reports.

### Current documentation

Update:

- `README.md`;
- `docs/MVP_RULES.md`;
- `docs/MOTION_BIBLE.md`;
- active art-direction/prompt documentation that describes a Heat deck or Heat result icon.

Do not edit historical retirement reports merely to reduce search totals.

### Tests

Rename misleading test descriptions such as “before heat is assigned” only when no fixture semantics depend on the wording. Keep explicit legacy-compatibility test names.

### Assets and prompts

Remove deprecated Heat deck/card-back/icon samples only after `audit:assets`, prompt export, and runtime catalog searches prove they are unreferenced. Retain stable Scar-Sink Prayer art paths unless an ID migration is approved.

Save risk: none for docs; low for asset catalogs.

Reconnect risk: none.

Browser QA: current rules surfaces and visual smoke test for missing asset fallback.

Recommended commit: `docs: remove current heat guidance`

## C6F — Compatibility deletion decision

Goal: decide whether to retain legacy compatibility indefinitely or remove it at a declared save/protocol boundary.

### Decision inputs

- supported lifetime of unversioned v0 and v1 saves;
- whether persisted event logs are replayed or only archived;
- whether older phone/TV clients are supported against the current server;
- whether `legacyCompatibility.characterHeat` has archival product value;
- whether stable IDs can be migrated without invalidating held inventory or art references.

### If deleting

Introduce a new snapshot boundary that:

1. imports v0/v1/v2 through a dedicated legacy module;
2. writes a new current snapshot with no Heat metadata;
3. consumes or discards old Heat actions deterministically;
4. validates ownership and pending-state identity;
5. never converts Heat into Scars or another system.

Then consider removing:

- v0 `character.heat`;
- v0/v1 `heatThreshold`;
- `legacyCompatibility.characterHeat`;
- legacy Heat action/effect discriminators;
- Heat result/shop protocol fields and defensive filters;
- legacy follower/Threat aliases already migrated in C6D.

Save risk: highest.

Reconnect risk: highest.

Tests:

- golden v0/v1/v2 fixtures;
- mid-resolution event/pending-state fixtures;
- current snapshot round trip;
- mixed client/server protocol decision;
- identical gameplay between old Heat 0 and Heat N;
- full engine/integration/client/build/asset validation.

Browser QA: migrated reconnect across lobby, movement, Threat, shop, scenario, and follower activation.

Recommended commit: `refactor: retire legacy heat compatibility`

## Recommended next action

Proceed with **C6C current schema/type narrowing** as a separate change. Do not combine it with follower/Threat metadata migration.

Compatibility field deletion remains deferred to C6F and requires an explicit save-version/release decision.

## C6D implementation status

**Implemented.** Canonical content no longer contains the five follower or nine Threat metadata occurrences. Current schemas admit only canonical follower metadata and 33 canonical Threat keys. Legacy v0/v1/v2 schemas retain the historical follower fields/tags and ten exact Threat keys; normalization strips retired metadata, preserves two existing modifier behaviors, preserves the Wound half of the mixed failure key, and omits seven no-effect keys.

Save version remains 2. Follower behavior, Threat distribution and resolution, projections, replay, and reconnect remain unchanged. The stable Nemesis ID `heat_on_threat_defeat` remains deferred to C6F rather than being misclassified as follower/Threat-card metadata.

Next phase: **C6E documentation cleanup**.

## C6E implementation status

**Implemented.** Exactly six current statements were corrected across `README.md`, `docs/MVP_RULES.md`, and `docs/MOTION_BIBLE.md`. The current rules and developer guidance no longer teach Heat as an active resource, consequence, lifecycle, result type, or authoring option. Historical retirement reports and compatibility documentation remain available and unchanged.

Comparable classification after C6E: **4,098 occurrences across 240 files** — A 0, B 13, C 297, D 971, E 2,816, F 1, G 0. The remaining Category F stable identifier and all compatibility deletion/version decisions remain deferred.

Next phase: **C6F compatibility deletion/version decision**.

## C6F release-decision status

**Decision complete; implementation pending.** C6F selects retention through a defined cutoff: v0, v1, and legacy-compatible v2 input remains supported for the lifetime of save version 2. A future v3 boundary must be an explicit product/release decision with migration and reconnect proof.

Retained compatibility is frozen, inert, and permitted to coexist with PASS. No broad schema, parser, adapter, fixture, or projection deletion is approved.

Approved next implementation group:

- rename the current Dying Star `specialRuleId` from `heat_on_threat_defeat` to `no_additional_effect`;
- retain old snapshot acceptance without an alias or new handler;
- rerun the complete boundary and assign PASS if all zero conditions remain proven.

Recommended implementation commit: `refactor: retire final heat-named nemesis id`.

Optional v3 migration remains deferred until a future release decision.

## C6G final-closure status

**Implemented and verified.** The current `nemesis_iron_vicar_orm` Relay template now uses neutral descriptive metadata `specialRuleId: "no_additional_effect"`. The previous Heat-named value remains accepted only when present in historical snapshot input. No alias or handler was added because no behavioral reader exists.

Final comparable classification: **4,099 occurrences across 239 files** — A 0, B 13, C 297, D 973, E 2,816, F 0, G 0. The final zero-boundary matrix passes, and the retirement verdict is **PASS**.

C6B, C6C, C6D, C6E, C6F, and C6G are complete. The only future work is an optional product/release decision to introduce a v3 save boundary. Until then, v0/v1/legacy-compatible-v2 import support remains frozen, inert, tested, and intentional; it is not an open retirement blocker.
