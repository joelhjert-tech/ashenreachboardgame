# Heat retirement inventory

Audit baseline: `0c68c99` (2026-07-12). This inventory treats repeated fixture literals as one logical reference family; raw occurrence counts are recorded separately. Every logical entry has one primary classification.

## Counts and method

- Case-insensitive tracked `heat` matches: **978 lines in 241 files**.
- Files under `content/` containing `heat`: **120**.
- Content files containing a mechanical Heat-shaped key or value (`gain_heat`, `gain_heat_all`, `lose_heat`, `heatCost`, or a `heat` property): **90**.
- Heat-bearing test/fixture files: **25**.
- Persisted canonical Heat keys: **2** (`character.heat`, `session.heatThreshold`).
- Broad semantic matches such as *burning* and *strain* were reviewed separately; atmosphere alone is not a Heat mechanic.

Classifications: A Required compatibility; B Safe to rename; C Requires mechanical redesign; D Removable after migration; E Safe to remove now; F Unable to verify.

## Schema and persisted state

| ID | Path / symbol | Reference | Player-facing | Runtime-active | Persisted | Tested | Class | Evidence | Recommended action |
|---|---|---|---|---|---|---|---|---|---|
| HI-001 | `src/game/schema/character.schema.ts:65` `character.heat` | Per-operative integer | Indirect | Yes as stored value | Yes | Extensive | A | Session players serialize complete characters; reconnect clones them | Retain behind a versioned compatibility adapter until legacy-load tests exist |
| HI-002 | `src/game/schema/session.schema.ts:188` `heatThreshold` | Session threshold | No | Used as a Mirror scenario threshold alias | Yes | Yes | C | `roomServer.ts:5988-5992` compares mirror pressure to it | Split Mirror pressure threshold from legacy Heat before field retirement |
| HI-003 | `src/game/schema/session.schema.ts:165` optional projected character heat | Summary/payload compatibility | Potential | Yes | Network/session-shaped | Fixture-heavy | A | Shared payload types retain `heat` | Deprecate, suppress publicly, then version payload |
| HI-004 | `src/game/schema/card.schema.ts:51-66,158-170` | `gain_heat`, `gain_heat_all`, `lose_heat` effect variants | Through authored copy | Parser-active; mutation is no-op | Content persisted | Yes | D | Reducer explicitly ignores these effects | Migrate authored cards, then remove variants after old-content adapter |
| HI-005 | `src/game/schema/card.schema.ts:37` | `lossCondition: "heat"` | Potential | Parser-active | Content | Sparse | F | No complete current resolver path was proven | Trace each card before replacing condition |
| HI-006 | `src/game/schema/gear.schema.ts:73` | `heatCost` | Displayed as Risk | Yes for metadata | Content/instance projection | Yes | C | Black Route Fuse and UI consume it | Redesign cost; do not rename to Scar or Wound automatically |

## Engine, reducer, and rules

| ID | Path / symbol | Reference | Player-facing | Runtime-active | Persisted | Tested | Class | Evidence | Recommended action |
|---|---|---|---|---|---|---|---|---|---|
| HI-007 | `src/game/engine/reducer.ts:251-255,296-299,354,579-582` | Generic Heat effects | Log says legacy pressure ignored | Yes as accepted no-op | No mutation | Yes | D | `applyEffectToPlayer` leaves heat unchanged | Add explicit legacy adapter tests, migrate callers, remove |
| HI-008 | `src/game/engine/actions.ts:156`; `reducer.ts:1945` | `HEAT_THRESHOLD_REACHED` | Outcome/log possible | Reducer reachable if dispatched | Yes | Yes | D | Server trigger is disabled | Remove only after action compatibility and replay audit |
| HI-009 | `src/server/roomServer.ts:5372` | `shouldTriggerHeatThreshold` | No | Returns `false` | No | Indirect | D | Deliberate retirement gate | Keep until legacy threshold action is quarantined, then delete |
| HI-010 | `src/game/cards/threatEffects.ts:37-39` | Heat helpers return `gain_note` | Compatibility text visible | Yes | No | Yes | B | Explicit no-op summaries mention legacy pressure | Replace visible compatibility prose after content migration |
| HI-011 | `src/game/cards/threatEffects.ts:96-98` | old “has heat” key now checks Scars | No Heat label in result | Yes | No | Yes | D | Stable legacy effect key, Scar semantics | Rename only with key compatibility mapping |
| HI-012 | `src/game/data/boardTextEffects.ts` (24 typed calls) | Board-authored Heat effects | May surface in logs | Accepted no-op | Content | Yes | D | Resolves through HI-007 | Replace individually with explicit intended outcomes |
| HI-013 | `src/game/data/scenarios.ts:522` | Mirror-pressure branch emits `gain_heat` | Compatibility outcome | Yes as no-op | Scenario state | Yes | C | Mechanic mixes mirror pressure and Heat-shaped effect | Author a real consequence separately |

## Server, networking, persistence

| ID | Path / symbol | Reference | Player-facing | Runtime-active | Persisted | Tested | Class | Evidence | Recommended action |
|---|---|---|---|---|---|---|---|---|---|
| HI-014 | `src/server/sessionState.ts:141` | initializes `heatThreshold` | No | Yes | Yes | Yes | A | New sessions require schema field | Replace only with versioned session schema |
| HI-015 | `src/server/roomServer.ts:947,2907,8104,9106` | initializes/resets heat to zero | No | Yes | Yes | Yes | A | Character/session construction requires field | Centralize in legacy adapter |
| HI-016 | `src/server/roomServer.ts:6471` | directly reduces character Heat | Possibly outcome | Yes | Yes | Yes | C | Bypasses generic no-op effect path | Identify owning action/content and redesign explicitly |
| HI-017 | `src/server/roomServer.ts:2299,8148` | `heatDelta` result metadata | Result chip capable | Yes | Payload/log | Yes | A | Delta still emitted as `-1` | Stop producing after consumer audit; version payload later |
| HI-018 | `src/server/roomServer.ts:8036` | shop/service cost `{ heat: 1 }` | Displayed as Risk | Yes | Projection | Yes | C | Host/phone render cost | Decide cost currency and rebalance service |
| HI-019 | reconnect/session serialization | whole state carries Heat | Hidden/indirect | Yes | Yes | Reconnect fixtures | A | No formal migration layer found | Add legacy-state load and reconnect tests before deletion |

## Content and IDs

| ID | Path / symbol | Reference | Player-facing | Runtime-active | Persisted | Tested | Class | Evidence | Recommended action |
|---|---|---|---|---|---|---|---|---|---|
| HI-020 | 7 anomaly JSON files with `gain_heat*` | Failure consequences | Card text may still say Heat | No-op consequence | Catalog | Validation/tests | C | Typed effects remain authored | Decide per anomaly: Scar, Wound, pressure, escalation, or removal |
| HI-021 | 3 Artifact JSON files with `gain_heat` | Artifact drawback | Card text | No-op drawback | Catalog | Validation | C | Balance cost currently inert | Rebalance individually before migration |
| HI-022 | 5 escalation JSON files with `gain_heat*` | Table consequence | Public | No-op | Catalog | Tests | C | Intended global pressure is currently lost | Prefer Loss Pressure/Global Escalation only after scenario review |
| HI-023 | 50+ Threat JSON files with Heat effects/keys | Reveal/fail/defeat consequences | Often visible | Mostly no-op or legacy key adapters | Catalog | Extensive | C | Mechanical severity differs by card | Content-by-content decision; no mass conversion |
| HI-024 | `content/followers/cinder-surgeon.json` | follower drawback | Phone inventory | No-op | Catalog | Tests | C | Cost affects balance identity | Redesign cost explicitly |
| HI-025 | `content/gear/black-route-fuse.json:21` | `heatCost: 1` | UI says Risk | Active metadata | Catalog | Yes | C | Only explicit gear heatCost found | Decide Salvage/Wound/charge/cooldown or removal |
| HI-026 | `content/gear/heat-sink-prayer.json` and stable ID | Legacy compatibility ID | Name can leak via paths/fallbacks | Active catalog identity | Saves/instances | Yes | A | Player-facing successor is Scar-Sink Prayer | Keep ID; enforce display-name boundary |
| HI-027 | contract/follower files containing a `heat` objective/cost property | Legacy matching data | Potential | Some engine tests mutate values | Catalog | Yes | C | Exact semantics vary | Audit per objective before removal |
| HI-028 | generated art prompts/manifests containing atmospheric heat | Prompt language | Not normally | Build-time only | Generated | Audit | F | Often means temperature/light, not resource | Do not lint generic word without field/context awareness |

## Phone, TV, and shared UI

| ID | Path / symbol | Reference | Player-facing | Runtime-active | Persisted | Tested | Class | Evidence | Recommended action |
|---|---|---|---|---|---|---|---|---|---|
| HI-029 | `src/client/shared/types.ts:90,249,560` | `heat` payload fields | Components may receive | Yes | Network | Many | A | Projection contract remains | Mark legacy/private and remove in versioned payload phase |
| HI-030 | `src/client/shared/types.ts:145` | `heatCost` | Used | Yes | Projection | Yes | C | Mirrors gear schema | Redesign with server field |
| HI-031 | `src/client/shared/types.ts:618` | `heatDelta` | Result delta | Yes | Payload | Yes | A | Consumer-compatible shape | Suppress display first; retire with payload version |
| HI-032 | `PhoneActionPanel.tsx:229` | Heat cost displayed as “Risk” | Yes | Yes | No | Yes | B | Conceals Heat term but not mechanic | Keep until cost redesign; clarify exact currency |
| HI-033 | `HostShopOverlay.tsx:63,97,220` | Heat cost displayed as Risk and risk styling | Yes | Yes | No | Yes | C | Cost affects shop affordance/tone | Redesign service and projection together |
| HI-034 | player-card/board stat types and fixtures | heat value supplied but main display removed | Normally no | Yes as data | No | Many | A | Commit `b9120ea` removed status display | Add explicit no-public-leak tests |
| HI-035 | result/log compatibility prose | “legacy pressure” text | Yes under old effect | Yes | Log | Yes | B | Reducer summaries are player-readable | Replace with canonical outcome after content decisions |

## Tests, documentation, assets, scripts

| ID | Path / symbol | Reference | Player-facing | Runtime-active | Persisted | Tested | Class | Evidence | Recommended action |
|---|---|---|---|---|---|---|---|---|---|
| HI-036 | 25 Heat-bearing test/fixture files | defaults, compatibility and real mechanics | No | Test-active | Fixture-shaped | Yes | A | Many protect zero/no-op compatibility and shop costs | Separate compatibility tests from obsolete names before editing |
| HI-037 | `engine.test.ts` Heat assertions | direct values and no-op behavior | No | Test-active | Sometimes | Yes | A | Some tests deliberately seed nonzero Heat | Preserve until each flow has a replacement decision |
| HI-038 | historical docs/reports | prior Heat rules and audits | Readers | No | Git history | N/A | D | Not runtime authority | Label historical; do not rewrite evidence reports |
| HI-039 | current player-facing docs using Heat as active | Rules leakage | Yes | No | Docs | N/A | B | Contradicts current intended terminology | Correct after canonical decisions; retain migration notes separately |
| HI-040 | asset filenames containing `heat-sink-prayer` | stable asset/catalog linkage | Only via fallback/debug | Yes | Manifest/path | Asset audit | A | ID and asset path stability | Keep filename or add alias; never expose raw filename |
| HI-041 | `scripts/validate-content.ts` Heat-aware compatibility | catalog validation | No | Build-time | No | Validation | A | Needed while legacy content parses | Add “no new player-facing Heat” guard before narrowing legacy allowlist |
| HI-042 | unused standalone Heat modules | none proven | No | Unknown | Unknown | No | F | No safely unimported module was established | Do not delete without import/reachability proof |

## Classification totals

Logical entries: **42**.

| Classification | Count |
|---|---:|
| A Required compatibility | 14 |
| B Safe to rename | 4 |
| C Requires mechanical redesign | 14 |
| D Removable after migration | 7 |
| E Safe to remove now | 0 |
| F Unable to verify | 3 |

No entry qualifies as safe to remove now. The repository has too many schema, payload, fixture, and content dependencies for destructive cleanup without a compatibility phase.
