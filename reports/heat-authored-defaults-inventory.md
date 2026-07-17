# Heat authored defaults inventory

## Reconciliation

Current content contains exactly 17 authoritative authored Heat defaults. They are the 17 character records under `content/characters`; every record explicitly supplies `"heat": 0`. There are 17 files, 17 character IDs, one repeated field (`Character.heat`), and no generated copies. Tests and fixtures that repeat Heat values are consumers or compatibility copies and are not additional authoritative defaults.

The phrase “default” is historical shorthand here. `characterSchema` does not use Zod `.default()` for Heat: `heat` is a required non-negative integer. Removing any JSON member today makes `loadCharacters()` fail before session construction.

| Default ID | Character | Path | Value | Primary class | New state | Old saves | Gameplay read/write | Player-facing | Preferred treatment |
|---|---|---|---:|---|---|---|---|---|---|
| HD-01 | Joss Var | `content/characters/black-ledger-agent.json` | 0 | B required construction | copied | independent persisted field | none | no | stop authoring after compatibility constructor exists |
| HD-02 | Bjornis | `content/characters/char_bjornis.json` | 0 | B | copied | independent | none | no | same |
| HD-03 | Deepdale | `content/characters/char_deepdale.json` | 0 | B | copied | independent | none | no | same |
| HD-04 | Ker Von Ker | `content/characters/char_ker_von_ker.json` | 0 | B | copied | independent | none | no | same |
| HD-05 | Kira Dog | `content/characters/char_kira_dog.json` | 0 | B | copied | independent | none | no | same |
| HD-06 | MASTER ALPHA (`qaOnly`) | `content/characters/char_master_alpha.json` | 0 | B | copied only when QA selection is used | independent | none | no | same; retain QA coverage for compatibility constructor |
| HD-07 | Popelord | `content/characters/char_popelord.json` | 0 | B | copied | independent | none | no | same |
| HD-08 | Rumi | `content/characters/char_rumi.json` | 0 | B | copied | independent | none | no | same |
| HD-09 | Mira | `content/characters/cinder-monk.json` | 0 | B | copied | independent | none | no | same |
| HD-10 | Orenna Tash | `content/characters/fleet-elder.json` | 0 | B | copied | independent | none | no | same |
| HD-11 | Dessa Korr | `content/characters/grave-engineer.json` | 0 | B | copied | independent | none | no | same |
| HD-12 | Reskin Hale | `content/characters/oathbroken-prince.json` | 0 | B | copied | independent | none | no | same |
| HD-13 | Senna Pell | `content/characters/rift-cartographer.json` | 0 | B | copied | independent | none | no | same |
| HD-14 | Brask Ode | `content/characters/salvage-warden.json` | 0 | B | copied | independent | none | no | same |
| HD-15 | Dr. Yuna Castell | `content/characters/siege-medic.json` | 0 | B | copied | independent | none | no | same |
| HD-16 | Lane | `content/characters/signal-witch.json` | 0 | B | copied | independent | none | no | same |
| HD-17 | Tarek Voss | `content/characters/void-marshal.json` | 0 | B | copied | independent | none | no | same |

## Common authoritative path

`loadCharacters()` parses each JSON record directly with `characterSchema`. `createInitialSessionState()` selects roster definitions, applies starting loadout, and `cloneCharacter()` copies the entire character—including Heat—into each `PlayerState`. Character selection and replacement paths separately force `heat: 0`; therefore authored nonzero values would not be consistent across all construction paths and are not an approved authoring surface.

The full game state and session snapshot schemas embed the required character schema. JSON serialization therefore preserves Heat exactly. A verified parse accepts old `heat: 7`; deleting the field produces `invalid_type` at `players[0].character.heat`. Reconnection reconstructs the authoritative state and does not recalculate Heat.

No rule, affordability check, reward, threshold, or action consumes these 17 authored zeros. Two reducer assignments copy `player.character.heat` unchanged while applying shop changes; they are compatibility-preserving structural copies, not gameplay reads. Generic Heat effects remain no-ops. New selection/recruit paths write zero, but no ordinary action increments or decrements it.

Phone/TV projections do not expose the stored authored value: public character summaries and shop projections hardcode `heat: 0` for legacy payload shape. Thus the authored defaults themselves are projected zero times, although two compatibility projection shapes still contain a zero-valued Heat key.

## Tests and history

`characterRoster.test.ts` directly asserts zero for all 16 playable records; MASTER ALPHA is loaded but its Heat is only incidental. `legacyHeatContainment.test.ts` protects nonzero round-trip persistence and no-op isolation, not the 17 content values. Numerous fixtures carry Heat because the required type demands it; these are not independent defaults.

Git history identifies `3b02f11` as the initial character Heat import, `274ad94` as containment, and `cd41d75` as active-mechanics retirement. No later commit gives the authored zeros a gameplay role.

## Totals

- Primary classifications: B required construction default 17; A/C/D/E/F/G/H/I 0.
- Content-authored defaults: 17. Schema `.default()` values: 0. Generated defaults: 0. Fixture-only authoritative defaults: 0.
- Read by active gameplay: 0. Written/copied into eligible new character state: 17. Serialized when selected: 17. Directly projected: 0.
- Safe to delete as content-only edits today: 0. Requiring a compatibility construction boundary before content removal: 17.
- Requiring versioned save migration merely to remove the content defaults: 0. Removing persisted `character.heat` later requires versioned migration and a support-window decision.

All recommendations are pending approval.
