# Phase 1M — Character Heat Compatibility Constructor

Date: 2026-07-13

Implementation base: `23b5cb6`, which contains the approved Phase 1L baseline `6901fcd` as an ancestor plus unrelated item-test hardening.

## Outcome

Phase 1M centralizes required Heat initialization for genuinely new runtime character state in `createLegacyCharacterCompatibilityState()`. The helper returns a fresh `{ heat: 0 }` object, accepts no authored or client value, performs no gameplay calculation, and is never applied over loaded or reconnected state.

All four production creation paths now use that boundary:

1. Initial single-player and multiplayer session character cloning.
2. Lobby character selection or reselection.
3. Fresh-character construction used by server replacement/setup flows.
4. The authoritative recalled-character replacement reducer.

The 17 canonical character JSON fields, required character schema, save shape, serialization, reconnection, and phone/TV projection shapes are unchanged.

## Preflight assignment inventory

| Location | Previous behavior | Classification | Phase 1M result |
|---|---|---|---|
| `src/server/sessionState.ts:cloneCharacter` | Implicitly copied authored `character.heat` into each initial player | New runtime construction | Constructor spread after authored character data; authored Heat can no longer seed runtime state |
| `src/server/roomServer.ts:selectSeatCharacter` | Direct `heat: 0` | New runtime construction | Constructor |
| `src/server/roomServer.ts:createFreshCharacter` | Direct `heat: 0` | New runtime construction | Constructor |
| `src/game/engine/reducer.ts:RECRUIT_REPLACEMENT` | Direct `heat: 0` | New runtime construction | Constructor |
| `applyShopCostOnlyToPlayer` | Copies `player.character.heat` | Existing-state preservation | Preserved unchanged |
| `applyShopServiceToPlayer` | Copies `player.character.heat` | Existing-state preservation | Preserved unchanged |
| `buildPublicShopEncounter` | Hardcoded `heat: 0` compatibility key | Projection fallback | Preserved unchanged |
| `createTvProjection` | Hardcoded `heat: 0` compatibility key | Projection fallback | Preserved unchanged |
| Character JSON, schemas, fixtures, assertions | Required authoring/schema/test compatibility | Not runtime construction | Preserved unchanged |

No separate bot, scenario-created operative, or production QA constructor exists. QA selection and all supported single-player, cooperative, and rivalry setup paths converge on the four paths above. Session reset calls `createInitialSessionState` and therefore uses the same boundary.

## Constructor API and ownership

The helper lives in `src/game/rules/legacyHeatCompatibility.ts`:

```ts
createLegacyCharacterCompatibilityState(): { heat: 0 }
```

It owns only new-state compatibility initialization. It does not own parsing, persistence, projection, effect resolution, thresholds, or saved values. Repeated calls return independent objects. The constructor is deliberately not a generic resource factory.

## New state versus preserved state

- New session character: Heat is integer zero from the constructor.
- Character selection: Heat is zero even when an isolated template fixture carries nonzero authored Heat.
- Replacement character: Heat is zero; neither the recalled character's value nor the replacement template's authored value transfers.
- Existing immutable copy: stored Heat is copied exactly.
- Loaded/save-restored character: explicit stored Heat wins and is never passed through the constructor.
- Missing stored Heat: remains invalid because `characterSchema.heat` is still required.

An old value of 7 parses, serializes, restores into `GameRoomServer`, survives unrelated construction for another seat, and serializes again as 7. It remains mechanically inactive and is never converted.

## Projection and reconnect behavior

The two zero-valued compatibility projection keys remain unchanged and still do not expose stored old-save Heat. The constructor is not imported into projection code. Reconnection restores authoritative state rather than constructing a character, so it preserves explicit old values exactly.

## Runtime boundary guard

The focused test parses production TypeScript with the TypeScript AST and records file plus enclosing function. It requires exactly:

- one direct `heat: 0` initializer in the named compatibility constructor;
- four constructor call sites at the approved creation boundaries;
- two hardcoded projection zeros;
- two stored-value property accesses, both immutable shop preservation copies.

Any new direct runtime zero initializer, construction call site drift, or `character.heat` gameplay access fails with a precise file/function difference. Tests, content, schema declarations, serialization shapes, and projections are classified separately instead of using a fragile whole-repository substring ban.

## Counts

| Measure | Before | After |
|---|---:|---:|
| Production new-character paths | 4 | 4 |
| Compatibility-constructor call sites | 0 | 4 |
| Direct new-state `heat: 0` assignments outside boundary | 3 | 0 |
| Authored character defaults | 17 | 17 |
| Character-default approvals | 17 | 17 |
| Active Heat gameplay reads | 0 | 0 |
| Active Heat gameplay writes | 0 | 0 |
| Required serialized Heat fields | 1 | 1 |
| Projection compatibility keys | 2 | 2 |
| Heat-only IDs / branches | 29 / 32 | 29 / 32 |
| Heat-effect occurrences | 41 | 41 |
| Combined compatibility approval IDs | 71 | 71 |
| Runtime files changed | 0 | 4 |
| Schema files changed | 0 | 0 |
| Character files changed | 0 | 0 |
| Projection behavior/shape files changed | 0 | 0 |

The production files changed are construction ownership files; no save or projection branch changed.

## Tests

The nine focused Phase 1M tests cover:

- exact helper shape, integer zero, no extra fields, and independent objects;
- initial single-player, cooperative, and rivalry construction;
- authored-template independence during character selection;
- recalled-character replacement and non-transfer;
- old nonzero parse, serialization, server restoration, reconnect-equivalent state retention, and unrelated construction isolation;
- missing-field rejection;
- the AST boundary inventory.

The unchanged Phase 1L validator suite protects all 17 zero defaults, approval isolation, and the 71-ID combined boundary.

## Four-seat critique

**New Player.** No visible behavior changes. Heat and Risk remain absent; selection and replacement produce the same player-facing state.

**Optimizer.** Authored values cannot seed new runtime Heat. Old nonzero state remains inert, reconnect cannot reset it, and replacement cannot transfer it.

**Family Player.** No meter, prompt, migration step, or bookkeeping is introduced. Existing sessions continue to restore normally.

**Rules Lawyer.** New-state initialization and old-state preservation are separate rules. Copying, serialization, and reconnect are not construction. Missing remains invalid, zero is not omission, and explicit historical values remain exact.

## Files changed

- `src/game/rules/legacyHeatCompatibility.ts` — named compatibility constructor.
- `src/server/sessionState.ts` — initial session construction call site.
- `src/server/roomServer.ts` — selection and fresh-character call sites.
- `src/game/engine/reducer.ts` — replacement-character call site.
- `src/game/engine/__tests__/legacyHeatConstruction.test.ts` — construction, persistence, and boundary coverage.
- `reports/heat-phase-1m-compatibility-constructor.md` — implementation record.
- `reports/heat-retirement-decision-register.md` — Phase 1M decision status only.

## Next-phase prerequisites

Still separate and unimplemented: parser support for omitting the 17 authored defaults; removal of those JSON fields; optional runtime/persisted `character.heat`; new-save omission; versioned migration; projection-key retirement; old-value support-window policy; Mirror-key migration; remaining Heat-only outcomes; Rust Choir Peddlers; and stable discriminator cleanup.

## Verification

- Focused Phase 1M construction/persistence/boundary tests: 9/9 passed.
- Unchanged Phase 1L quarantine tests: 21/21 passed.
- `npm.cmd run validate:content`: passed (17 characters and unchanged compatibility manifests).
- `npm.cmd run typecheck`: passed.
- `npm.cmd run test`: 848/848 passed across 79 files. The first run exceeded its command allowance without reporting a failure; the required rerun completed green with a ten-minute allowance.
- `npm.cmd run build`: passed.
- `npm.cmd run audit:assets`: passed (404/404 present; zero missing, invalid, placeholder, release-blocking, or tier-separation findings).
- Runtime AST boundary scan: passed with one constructor, four call sites, two projection zeros, and two preservation copies.
- `git diff --check`: passed.
- `git diff --cached --check`: passed before staging and is rerun on the final staged set.
