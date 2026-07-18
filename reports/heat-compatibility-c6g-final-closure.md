# Heat Compatibility C6G — Final Closure

Date: 2026-07-17

Functional commit: `3856d50 refactor: rename obsolete nemesis heat rule`

Starting checkpoint: `93636df docs: decide legacy heat compatibility policy`

Final verdict: **PASS**

## Exact canonical change

The first Nemesis Relay template, stable template ID `nemesis_iron_vicar_orm`, now uses:

```ts
specialRuleId: "no_additional_effect"
```

The previous canonical value was `heat_on_threat_defeat`. No rule ID, template ID, trigger, reward, difficulty, target, Rivalry ownership, event identity, projection shape, reconnect behavior, or serialization version changed.

No handler, reducer branch, server branch, formatter, result row, migration rule, compatibility action, or replacement effect was added. The neutral identifier remains descriptive metadata only.

## Reader and behavior proof

The complete `specialRuleId` inventory found:

- definition: `src/game/rules/nemesisRelay.ts`;
- schema: `src/game/schema/session.schema.ts`, accepting any nonempty string;
- gameplay reader: `src/server/roomServer.ts`, which branches only on `specialRuleId === "cleave"`;
- public projection copy: `src/server/roomServer.ts`;
- client projection type: `src/client/shared/types.ts`.

Searches for direct property access, bracket access, dynamic string access, switches, selectors, handlers, and action/result dispatch found no reader for either the historical or neutral identifier. The spawn event may carry the metadata, but no later event or result is generated from it.

The focused Nemesis test resolves Iron Vicar Orm with the neutral identifier and proves:

- Wounds and Scars do not change;
- Salvage and Global Escalation do not change;
- no pending decision opens;
- no post-spawn event or outcome text is generated from `no_additional_effect`;
- normal Nemesis defeat, Crown-Key reward, and victory flow continue.

No Heat, Wound, Scar, recall, defeat, Global Escalation, Loss Pressure, Salvage, movement, duplicated reward, pending choice, or result-row consequence is attached to the identifier.

## Historical parsing and save policy

A dedicated snapshot test writes a version-2 snapshot containing the historical `heat_on_threat_defeat` string, parses it through `parseAndMigrateSessionSnapshot`, preserves the stable Nemesis identity, and reserializes at save version 2. The historical value remains accepted as inert free-form metadata.

The C6F policy remains authoritative:

- unversioned v0, v1, and legacy-compatible v2 imports are supported for the lifetime of save version 2;
- clean new v2 state uses the neutral canonical identifier and emits no retired Heat gameplay field or metadata;
- migrated saves may retain only approved archival compatibility data and inert normalized history;
- compatibility removal or material narrowing requires an explicit future v3 release boundary with migration, reconnect, replay, projection, malformed-input, and release-note coverage.

Retained Category C compatibility is isolated, intentional, documented, and tested. It is not current gameplay and does not prevent PASS.

## Final classification

The established comparable corpus excludes phase reports and the living audit reports they update. C6F recorded 4,098 occurrences across 240 files. C6G removes the one Category F source occurrence and adds two historical-identifier assertions to existing Category D test files.

| Category | Before | After | Final finding |
|---|---:|---:|---|
| A — Active authored gameplay | 0 | 0 | No canonical Heat mechanic |
| B — Environmental/art presentation | 13 | 13 | Mechanical presentation remains 0 |
| C — Required compatibility | 297 | 297 | Frozen v0–v2 import boundary |
| D — Tests and fixtures | 971 | 973 | Two narrow historical identifier assertions added |
| E — Documentation/history | 2,816 | 2,816 | Current misleading guidance remains 0 |
| F — Dead/obsolete residue | 1 | 0 | Final obsolete canonical identifier removed |
| G — Ambiguous | 0 | 0 | Every occurrence classified |
| **Total** | **4,098** | **4,099** | **239 files after C6G** |

The literal tracked search before adding this closure report found 4,866 Heat substrings across 247 files. Literal totals include historical reports and therefore are not the PASS criterion.

## Final zero-boundary matrix

| Boundary | Expected | Actual | Evidence | Status |
|---|---:|---:|---|---|
| Authored typed Heat effects | 0 | 0 | canonical content validation/search | PASS |
| Authored Heat IDs | 0 | 0 | canonical content classification | PASS |
| Canonical follower/Threat Heat metadata | 0 | 0 | C6D schemas and content guards | PASS |
| Runtime mechanical Heat reads | 0 | 0 | runtime trace and current-model types | PASS |
| Runtime mechanical Heat writes | 0 | 0 | runtime trace and effect normalization | PASS |
| Heat threshold gameplay mutations | 0 | 0 | legacy action adapter/no-op tests | PASS |
| Heat-to-Scar paths | 0 | 0 | Wound/Scar and migration searches/tests | PASS |
| Phone mechanical Heat fields/results | 0 | 0 | projection/privacy tests | PASS |
| TV mechanical Heat fields/results | 0 | 0 | projection/privacy tests | PASS |
| Current-rulebook Heat mechanics | 0 | 0 | C6E current-documentation audit | PASS |
| Legacy save parsing failures | 0 | 0 | v0/v1/v2 migration tests | PASS |
| Reconnect Heat replays | 0 | 0 | integration/reconnect tests | PASS |
| Dead/obsolete Heat references | 0 | 0 | Category F rerun | PASS |
| Ambiguous references | 0 | 0 | complete A–G classification | PASS |

## Verification

Passed:

- canonical and historical identifier searches;
- focused Nemesis and versioned snapshot tests: 2 files / 22 tests;
- `npm.cmd run validate:content`;
- `npm.cmd run typecheck`;
- `npm.cmd run test:engine`: 60 files / 712 tests, including rules;
- `npm.cmd run test:integration`: 27 files / 242 tests;
- `npm.cmd run test:client`: 26 files / 273 tests;
- `npm.cmd run test`: 113 files / 1,227 tests;
- reconnect timing regression in both integration and aggregate runs without retry;
- `npm.cmd run audit:assets`: 418 / 418 present, zero missing, invalid, placeholder, or release-blocking assets;
- `npm.cmd run build`;
- `git diff --check` and `git diff --cached --check`.

`npm.cmd run test:rules` is not a defined package script. Its rules directory is included in the passing `test:engine` and aggregate commands. Existing test-only missing-art fallback diagnostics remained non-failing; the authoritative asset audit passed.

## Closure

C6B through C6G are complete. Every PASS criterion is independently satisfied. Required v0–v2 compatibility remains behind the declared save-version-2 boundary, while current authored content, runtime models, actions, results, metadata, projections, and documentation are Heat-free.

**Final verdict: PASS.**

No gameplay rule or consequence changed. The +116 Threat expansion remains unapproved.
