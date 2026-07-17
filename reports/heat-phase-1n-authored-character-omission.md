# Phase 1N — Authored Character Heat Omission

Date: 2026-07-13

Implementation base: `f71599eaec64faebbb252f44d3626771726aeea0 phase-1m-centralize-character-heat-construction`.

## Outcome

Canonical character authoring and persisted runtime character state now have separate schemas. The strict `authoredCharacterSchema` omits and rejects `heat`; the existing `characterSchema` remains unchanged and still requires a non-negative integer `heat` for sessions, saves, and reconnect. All 17 canonical JSON definitions lost only their top-level `heat: 0` member. The four Phase 1M construction boundaries continue adding `{ heat: 0 }` through `createLegacyCharacterCompatibilityState()`.

No Heat mechanic, save format, session schema, phone/TV state projection, Mirror threshold, compatibility effect, or content outcome changed.

## Baseline and migrated population

| Character ID | Canonical file | Before | Authored parser | Runtime construction |
| --- | --- | ---: | --- | --- |
| `black-ledger-agent` | `content/characters/black-ledger-agent.json` | 0 | strict omission | initial/selection/replacement constructor |
| `char_bjornis` | `content/characters/char_bjornis.json` | 0 | strict omission | initial/selection/replacement constructor |
| `char_deepdale` | `content/characters/char_deepdale.json` | 0 | strict omission | initial/selection/replacement constructor |
| `char_ker_von_ker` | `content/characters/char_ker_von_ker.json` | 0 | strict omission | initial/selection/replacement constructor |
| `char_kira_dog` | `content/characters/char_kira_dog.json` | 0 | strict omission | initial/selection/replacement constructor |
| `char_master_alpha` | `content/characters/char_master_alpha.json` | 0 | strict omission | QA selection through the same boundaries |
| `char_popelord` | `content/characters/char_popelord.json` | 0 | strict omission | initial/selection/replacement constructor |
| `char_rumi` | `content/characters/char_rumi.json` | 0 | strict omission | initial/selection/replacement constructor |
| `cinder-monk` | `content/characters/cinder-monk.json` | 0 | strict omission | initial/selection/replacement constructor |
| `fleet-elder` | `content/characters/fleet-elder.json` | 0 | strict omission | initial/selection/replacement constructor |
| `grave-engineer` | `content/characters/grave-engineer.json` | 0 | strict omission | initial/selection/replacement constructor |
| `oathbroken-prince` | `content/characters/oathbroken-prince.json` | 0 | strict omission | initial/selection/replacement constructor |
| `rift-cartographer` | `content/characters/rift-cartographer.json` | 0 | strict omission | initial/selection/replacement constructor |
| `salvage-warden` | `content/characters/salvage-warden.json` | 0 | strict omission | initial/selection/replacement constructor |
| `siege-medic` | `content/characters/siege-medic.json` | 0 | strict omission | initial/selection/replacement constructor |
| `signal-witch` | `content/characters/signal-witch.json` | 0 | strict omission | initial/selection/replacement constructor |
| `void-marshal` | `content/characters/void-marshal.json` | 0 | strict omission | initial/selection/replacement constructor |

Each character diff is exactly one deletion and zero additions. IDs, ordering, names, stats, abilities, starting equipment, contracts, QA flags, notes, art references, and all balance values are unchanged.

## Schema and parser ownership

`authoredCharacterSchema` is derived narrowly from `characterSchema` by omitting `heat` and enabling strict unknown-key rejection. The canonical loader returns `AuthoredCharacter`, never a persisted `Character`. `parseAuthoredCharacter()` reports the source path, content ID, issue path, and schema error. Authored `heat` is rejected at zero, nonzero, negative, or fractional values rather than silently stripped. Unknown Heat-shaped fields are rejected by the strict boundary.

The persisted `characterSchema` itself is unmodified. Runtime zero and historical nonzero values still parse; omission still fails. The session schema continues embedding the runtime schema.

Existing canonical definitions also contain intentional initial-state fields such as status, wounds, equipment containers, and current space. Phase 1N separates only the approved Heat compatibility field and does not broaden into a character-content redesign.

## Runtime construction and catalog behavior

The authored type flows through the canonical catalog, starting-loadout resolver, server catalog ownership, lobby selection, fresh-character setup, and replacement action. A complete runtime `Character` exists only after a genuine new-state boundary spreads `createLegacyCharacterCompatibilityState()`.

The Phase 1M boundary remains exactly one constructor definition and four production call sites:

1. initial session clone;
2. lobby selection;
3. fresh setup/replacement creation;
4. recalled-character replacement reducer.

The phone's pre-session catalog entry no longer requires authored Heat. Its local lobby preview preserves the pre-existing private-character shape with an inert zero fallback; this does not enter authoritative state, alter display, or add a gameplay constructor. Phone and TV session projections remain untouched.

## Persistence and reconnection

- New runtime characters contain and serialize `heat: 0`.
- An old stored `heat: 7` parses, serializes, restores into `GameRoomServer`, and reconnects unchanged.
- Loaded state bypasses authored parsing and new-character construction.
- Constructing another seat cannot reset an existing historical value.
- Missing persisted Heat remains invalid.
- Old values remain mechanically inactive and receive no conversion or compensation.

## Validation approval retirement

The empty Phase 1L character-default manifest and its type are removed. Any top-level authored `heat` now produces a direct error explaining that canonical authoring must omit Heat and runtime state receives compatibility zero from the named constructor. Effect and other compatibility approvals remain construct-specific and disjoint.

| Measure | Before | After |
| --- | ---: | ---: |
| Canonical character IDs | 17 | 17 |
| Authored Heat fields | 17 | 0 |
| Character-default approvals | 17 | 0 |
| Heat-effect approvals | 40 | 40 |
| Other compatibility approvals | 14 | 14 |
| Approval overlap | 0 | 0 |
| Combined unique compatibility IDs | 71 | 54 |
| Compatibility constructor definitions | 1 | 1 |
| Constructor call sites | 4 | 4 |
| Direct runtime new-state zero assignments outside constructor | 0 | 0 |
| Required runtime-schema Heat fields | 1 | 1 |
| Required serialized Heat fields | 1 | 1 |
| Phone/TV state-projection compatibility keys | 2 | 2 |
| Active Heat gameplay reads | 0 | 0 |
| Active Heat gameplay writes | 0 | 0 |
| Heat-only IDs / branches | 29 / 32 | 29 / 32 |
| Heat-effect occurrences | 41 | 41 |

## Generated files

None. Character JSON is canonical input, and no generated catalog or documentation file owns these fields. Asset references and the asset pipeline are unchanged.

## Tests

- Ten new authored-boundary cases cover the 17-file catalog, strict zero/nonzero/negative/fraction rejection, unknown Heat-shaped fields, ordinary required fields, runtime-schema separation, and single-player/co-op/rivalry construction.
- The nine Phase 1M construction/persistence/boundary cases remain green.
- The focused legacy validator suite now has 22 cases and proves zero default approvals, the 40/14/54 compatibility boundary, blanket authored rejection, effect isolation, and remaining manifest reconciliation.
- Character roster, MASTER ALPHA, UI stress fixtures, and three historical migration count guards were updated only for the authored/runtime type and 54-ID approval boundary.
- The first full-suite run had 855 passing tests and three stale 71-ID count assertions; those assertions were corrected to 54 and their 51 focused tests passed.
- Final verification passed: 80 test files / 858 tests, content validation, typecheck, production build, and the 404/404 asset audit.

## Four-seat critique

**New Player.** Selection, replacement, and all visible status remain identical. Heat and Risk do not return.

**Optimizer.** Authored data can no longer seed hidden Heat. Historical nonzero values remain inert, cannot satisfy a cost or condition, and are not reset by reconnect or another seat's construction.

**Family Player.** No meter, prompt, migration step, or bookkeeping appears. Existing saves and reconnect retain their current contract.

**Rules Lawyer.** Authored omission and persisted omission are distinct. Authored Heat is forbidden; runtime Heat is required. New runtime state receives explicit zero, explicit historical values win, and missing persisted values remain invalid.

## Files changed

- Seventeen `content/characters/*.json` definitions — remove only top-level `heat: 0`.
- `src/game/schema/character.schema.ts` — strict authored schema and distinct authored type; persisted schema unchanged.
- `src/game/content/characters.ts` — strict path/ID-aware authored parser and catalog.
- `src/game/rules/startingLoadout.ts`, `src/server/sessionState.ts`, `src/server/roomServer.ts`, `src/game/engine/actions.ts` — authored template types through the four existing construction boundaries.
- `src/game/engine/gear.ts` — narrow gear-bearing structural type so authored catalog checks do not require persisted Heat.
- `src/client/shared/types.ts`, `src/client/phone/PhoneApp.tsx` — truthful Heat-free catalog type with unchanged lobby preview behavior.
- `scripts/legacy-heat-validation.ts` — retire default approvals and reject authored Heat universally.
- `scripts/__tests__/legacy-heat-validation.test.ts` and focused engine/client tests — parser, runtime, compatibility count, and fixture coverage.
- `reports/heat-phase-1n-authored-character-omission.md` — this implementation record.
- `reports/heat-retirement-decision-register.md` — Phase 1N status only.

## Remaining prerequisites

Still separate and unimplemented: optional runtime `character.heat`; new-save omission; versioned save migration; projection-key retirement; old-value support-window policy; runtime-field removal; Mirror-key migration; 29 Heat-only IDs/32 branches; Rust Choir Peddlers; and stable discriminator cleanup.
