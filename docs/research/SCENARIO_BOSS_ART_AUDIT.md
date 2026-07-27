# Scenario Boss and Art Audit

Date: 2026-07-27

## Outcome

All eight production scenarios now resolve to one canonical final boss, one
runtime portrait, one phone-optimized portrait, and one reproducible image
prompt. All eight scenario sheets also retain their existing registered art.

No scenario rule, dice value, reward, loss condition, victory threshold, save
field, protocol message, or privacy projection was changed.

## Scenario matrix

| Scenario | Canonical boss | Public boss track | Confrontation source | Portrait |
|---|---|---:|---|---|
| The Broken Seal | The Unnamed Prisoner | 2 restoration marks | Authored three-check seal ritual | `nemesis_unnamed_prisoner.png` |
| The Throne of Ash | The Ash Regent | 6 claims | Nemesis stat block | `nemesis_ash_regent.png` |
| The Mirror of False Heroes | The False Hero | 4 mirror breaks | Nemesis stat block | `nemesis_false_hero.png` |
| The Devourer Beneath | The Devourer Beneath | 5 maw strikes | Nemesis stat block | `nemesis_devourer_beneath.png` |
| The Labyrinth Engine | Iron Saint Malrec | 5 shutdown marks | Nemesis stat block | `nemesis_iron_saint_malrec.png` |
| The Dying Star | The Dying Star Core | 4 ignition marks | Nemesis stat block | `nemesis_dying_star_core.png` |
| The Grinning Tithe | The Pallid Curator | 6 wounds | Nemesis stat block | `nemesis_pallid_curator.png` |
| The Broken Concordance | The Hollow Regent | 3 Core stages | Authored cooperative stage plan | `nemesis_hollow_regent.png` |

## Defects found

Before this pass:

- The Broken Seal and The Broken Concordance had named or implied finales but
  no scenario-linked boss record.
- The Throne of Ash was linked to the Hollow Regent instead of its authored Ash
  Regent.
- The Mirror of False Heroes was linked to the Glass Prophet instead of its
  authored False Hero.
- The Devourer Beneath was linked to Specimen Null-X instead of the authored
  Devourer.
- The Dying Star was linked to Kharvox instead of its authored Core.
- The Pallid Curator portrait existed, but the runtime resolver returned the
  Hollow Regent fallback.

The displaced legacy nemeses remain available to Nemesis Relay and were not
deleted.

## Generated art

Five wholly original portrait assets were generated with the built-in image
generation workflow:

- `nemesis_unnamed_prisoner.png`
- `nemesis_ash_regent.png`
- `nemesis_false_hero.png`
- `nemesis_devourer_beneath.png`
- `nemesis_dying_star_core.png`

The prompts are derived from canonical boss records in
`src/game/data/nemeses.ts` and flow through
`src/game/assets/design/characterPortraitPrompts.ts`.

Existing Iron Saint Malrec, Pallid Curator, and Hollow Regent art was reused
without modification. Existing scenario-sheet art was not modified.

## Mechanics protection

The new `scenarioConfrontationMode` field separates presentation identity from
confrontation orchestration:

- `nemesis-stats` retains the existing stat-derived checks.
- `authored-plan` keeps bespoke staged scenario logic while still exposing the
  correct public boss and portrait.

The Broken Seal remains on its solo-tuned three-check ritual. The Broken
Concordance remains on its three cooperative stages requiring assistance.
Public boss-track lengths match the existing authoritative progress values.

## Regression coverage

`scenarioBossCatalog.test.ts` requires:

- Exactly one boss per production scenario.
- Scenario and boss names to match.
- Correct public track lengths.
- Authored-plan protection for the two staged finales.
- A canonical prompt, registered path, and existing portrait for every boss.

Existing scenario confrontation, catalog API, projection, and Grinning Tithe
tests verify the server-authoritative behavior and public presentation.

## Validation

- Scenario-focused tests: 79 passed.
- Server integration suite: 414 passed.
- Content validation: passed.
- Typecheck: passed.
- Production build: passed.
- Asset audit: 585/585 present, zero missing, zero invalid, zero
  placeholders, and zero phone-image issues.
- Broader engine suite: not green because 54 existing legacy Heat-retirement
  and old consequence-lifecycle assertions fail outside scenario boss scope.
  No failing test referenced a scenario boss record, portrait resolver, scenario
  catalog, final confrontation, or scenario projection.
