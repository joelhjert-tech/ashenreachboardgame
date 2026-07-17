# Heat compatibility C6C schema and type narrowing

Date: 2026-07-16

Checkpoint: `66bcd3e refactor: remove dead heat compatibility residue`

Phase: C6C

## Result

**CONDITIONAL PASS**

C6C separates current canonical authoring/runtime models from legacy Heat-compatible input models without changing save version 2 or gameplay. Current authored content, actions, state effects, shop payloads, result deltas, gear, followers, contracts, tile challenges, Threats, and client projections cannot represent Heat mechanics. Dedicated legacy schemas still accept supported v0/v1/v2 Heat fields, effects, actions, shop shapes, follower metadata, Threat metadata, and event-log entries.

No legacy Heat input becomes a Wound, Scar, recall, defeat, Global Escalation, Loss Pressure, Salvage change, movement, modifier, note, or reward.

## Model boundary

```text
Legacy v0/v1/v2 serialized input or event log
        |
        v
Legacy-compatible schemas and action/effect unions
        |
        v
Exhaustive compatibility normalization
  - Heat effects -> legacy_compatibility_noop
  - HEAT_THRESHOLD_REACHED -> inert compatibility event record
  - legacy costs/results/metadata -> stripped or archived
        |
        v
Canonical current GameState / GameAction / ResultDelta
        |
        v
Current server resolution and Heat-free phone/TV projections
```

Compatibility modules may import canonical models. Canonical content loaders and current client/server payload types do not import legacy effect or action unions.

## Implementation manifest

| Surface | Current model | Legacy model / adapter | Result |
|---|---|---|---|
| Encounter effects | `AuthoredEncounterEffect`; runtime `EncounterEffect` adds only `legacy_compatibility_noop` | `LegacyCompatibleEncounterEffect`; `normalizeLegacyEncounterEffect` | Heat effect discriminants are legacy-only |
| Threats | authored Threat schemas for content; runtime Threat schema for normalized state | legacy-compatible Threat schema; exact frozen metadata loader; `normalizeLegacyThreatCard` | current authoring excludes Heat tags/effects; stable C6D metadata remains parseable |
| Followers | strict canonical follower schema excludes Heat loss/tag values | legacy follower schema and `normalizeLegacyFollowerMetadata` | runtime follower objects omit deprecated Heat metadata; source records remain unchanged for C6D |
| Gear | strict canonical gear schema excludes `heatCost` | legacy gear schema and `normalizeLegacyGearItem` | current gear cannot carry Heat costs |
| Contracts | authored contract schema; runtime contract schema | legacy contract schema; reward normalization | old embedded rewards normalize without changing contract identity |
| Tile challenges/sectors | authored challenge schema; runtime challenge/sector schema | legacy challenge/sector schemas; state normalization | old board effects normalize while current content remains structurally Heat-free |
| Actions | `GameAction` excludes `HEAT_THRESHOLD_REACHED`; current Stabilize excludes Heat | `LegacyCompatibleGameAction`; `normalizeLegacyGameAction` | current commands cannot create threshold Heat actions |
| Event logs | current reducer receives only `GameAction` | legacy threshold/Stabilize records become `LEGACY_COMPATIBILITY_EVENT` | no gameplay reducer branch remains |
| State/saves | canonical v2 `GameState` and snapshot schema | v0/v1/v2 compatibility schemas; `parseAndMigrateSessionSnapshot` | save version remains 2; old Heat input loads |
| Results/shop/client | current result delta, shop cost/result, and client types exclude Heat | stale payload stripping remains in `stripLegacyHeatProjection` | no current phone/TV type can render Heat |

## Effect normalization

- Heat leaves normalize to `{ type: "legacy_compatibility_noop" }`.
- Sequences retain the relative order and shape of all surviving effects.
- Compatibility no-ops are removed from mixed sequences.
- An all-Heat sequence becomes one compatibility no-op.
- Embedded legacy gear and followers normalize through their dedicated adapters.
- The no-op returns the same gameplay state and emits no result delta.

## Actions and event replay

`HEAT_THRESHOLD_REACHED` is no longer part of `GameAction` and has no reducer case. Historical events remain accepted by `LegacyCompatibleGameAction` and normalize deterministically to an inert `LEGACY_COMPATIBILITY_EVENT` record containing only the historical type, seat, and timestamp.

Historical Stabilize events with a Heat cost use the same inert record form. Effect-bearing legacy actions normalize every embedded effect before they can reach current runtime types. Legacy shop Heat costs and result deltas are removed while non-Heat fields and event identity are retained.

## Save and serialization findings

- Save version remains **2**.
- Unversioned v0, v1, and historical v2 inputs remain accepted.
- Legacy character Heat is removed from canonical characters and positive values are archived only in `legacyCompatibility.characterHeat`.
- Existing archival metadata and newly imported values merge by seat/character identity.
- Legacy pending effects, current encounters, contracts, sector challenges, pending tile challenges, Static Intercession effects, shop reveal costs, and event logs normalize before `gameStateSchema`.
- Current v2 serialization writes canonical state only.
- Approved `legacyCompatibility.characterHeat` archival metadata remains serializable.
- Round-tripping Heat as an active current field is neither required nor performed.
- Deleting archival metadata or changing the supported save contract remains C6F.

## Compile-time and structural guards

The included typecheck fixture proves:

- Heat effects are not assignable to authored or current runtime effect unions.
- `HEAT_THRESHOLD_REACHED` is not assignable to `GameAction`.
- current gear cannot define `heatCost`.
- current follower metadata cannot define a Heat loss condition.
- current result deltas and shop costs cannot represent Heat.
- legacy-compatible effect and action types still accept historical shapes.

Runtime schema coverage proves canonical effect, gear, follower, Threat, contract, board/tile, scenario, and escalation paths reject new Heat mechanics. Ordinary lowercase environmental prose such as “furnace heat” remains valid.

## Projection boundary

Current shared client types no longer include `heatCost`, follower Heat loss conditions, Heat result deltas, shop Heat costs, or shop `heatDelta`. The obsolete phone/TV Heat reward formatters and shop-risk inference were removed. Server projection sanitization remains in place for stale saves and payloads. Owner phone, other phones, and TV remain mechanically Heat-free with no empty result rows.

## Classification

The comparable C6C corpus excludes this report and the three reports updated by C6C so their self-description cannot alter the result. It contains **4,102 Heat substrings across 253 files**.

| Category | Occurrences | Finding |
|---|---:|---|
| A — Active authored gameplay | 0 | Canonical schemas and content contain no active Heat mechanics |
| B — Environmental/art presentation | 13 | Mechanical player-facing Heat remains 0 |
| C — Required compatibility | 320 | Legacy schemas, adapters, validation guards, frozen metadata, stable IDs, and projection stripping |
| D — Tests and fixtures | 946 | Type, schema, migration, replay, reconnect, projection, and historical guards |
| E — Documentation/history | 2,822 | Includes current documentation statements still assigned to C6E |
| F — Dead/obsolete residue | 1 | Stable `heat_on_threat_defeat` Nemesis ID, deferred to C6D/C6F |
| G — Ambiguous | 0 | No unclassified production reference |

Counts are mutually exclusive and sum to 4,102. Category C increased as explicit legacy-only adapters and schemas replaced ambiguous shared shapes; isolation, not arbitrary count reduction, is the C6C objective. The three deferred client Category F branches were removed, reducing F from 4 to 1.

## Verification

- content validation: passed;
- typecheck and compile-time guards: passed;
- focused C6C schema/normalization tests: 5 passed;
- focused Heat containment tests: 14 passed;
- engine constituent: 54 files / 677 tests passed;
- rules constituent: 6 files / 35 tests passed;
- integration and reconnect: 27 files / 234 tests passed;
- client: 26 files / 260 tests passed;
- aggregate wrapper: timed out; every constituent suite listed above passed independently, including the focused schema suite;
- asset audit: 418 / 418 present, zero missing, invalid, placeholder, or release-blocking assets;
- production build: passed;
- working-tree and staged diff whitespace checks: passed.

The initial combined engine wrapper and the aggregate wrapper exceeded their time budgets. The engine, rules, integration, client, and focused schema constituents were run independently and passed. No retry, arbitrary delay, or weakened assertion was added.

## Deferred conditions

- **C6D:** migrate or explicitly retain frozen follower/Threat Heat metadata and the stable Nemesis compatibility ID without breaking old saves.
- **C6E:** correct the six misleading current documentation statements while retaining historical reports.
- **C6F:** decide the supported save/version boundary before deleting archival fields, legacy schemas, event adapters, or projection stripping.

No gameplay or authored content definition changed in C6C.
