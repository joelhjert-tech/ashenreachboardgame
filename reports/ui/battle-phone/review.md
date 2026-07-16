# Phone Battle UI Screenshot Review

## Baseline

The untouched battle flow was captured at 390×844 in `baseline/`:

- `390x844-encounter.png`
- `390x844-battle-setup.png`
- `390x844-pending-enemy-roll.png`
- `390x844-rolled-result.png`
- `390x844-success.png`
- `390x844-defeat.png`
- `390x844-expanded-navigation.png`

The baseline placed the prompt, battle subject, active resolution, Battle Assist,
outcome prose, effect lists, and the full phone dock in the same scroll column.
Combatants and totals were not the first visual read, the same result appeared in
several sections, raw labels such as `BattleThreatGrit` could reach the screen,
and the authoritative action was commonly below the fold.

## First implementation review

The first composed-shell pass was captured at 390×844 in `implementation/`.
It was reviewed in encounter, setup, enemy-roll, rolled, success, defeat,
expanded-details, Operative, Gear, and Battle Log states.

The review found:

- The battle shell inherited the normal phone page padding while also using the
  full dynamic viewport height. This pushed the contextual navigation below the
  844px viewport.
- Fixture updates could be captured before the websocket projection reached the
  phone, producing stale or partially changed screenshots.
- The deterministic fixture's displayed stat, dice, modifier, and final total
  did not form a coherent equation.
- Threat-defeated and threat-remains information could be repeated by both a
  structured delta and authored fallback text.

Corrections made after visual review:

- Active battle now uses the page's full available viewport; safe-area padding
  remains inside the battle header and contextual navigation.
- Capture tooling waits for the exact projected stage and loaded combatant art.
- The QA battle uses `3 + 4 + 5 = 12` for success and `1 + 1 + 5 = 7` for
  defeat against 12.
- Consequences prefer structured deltas while suppressing semantic duplicates.
  The decisive outcome heading appears once, with one Trophy/remaining-threat
  row and each other mechanical consequence once.

## Final responsive review

Final captures are stored in `final/` for:

- 360×800
- 390×844
- 412×915
- 430×932

Each viewport includes encounter, battle setup, pending enemy roll, rolled
result, success, defeat, expanded details, and all three contextual panels.

The final review confirmed:

- Both combatants, the relevant stat, roll comparison, totals, result state, and
  primary action are visible without page scrolling.
- The scroll region, action dock, and contextual navigation occupy separate grid
  rows and do not overlap.
- There is no horizontal overflow at any target width.
- Long threat names and consequence rows remain inside their frames.
- Success and defeat use distinct, restrained colors without changing the
  Ashen Reach industrial visual language.
- Details are collapsed by default; opening them does not move or obscure the
  primary action.
- Contextual Operative, Gear, and Battle Log views retain the same persistent
  action and a 44px Back to Battle control.

## Remaining limitations

- Screenshots use an environment-gated deterministic QA encounter. Battle rules
  and projections remain covered by the normal engine and integration suites.
- The shell intentionally leaves unused vertical space on short outcomes so the
  primary action stays anchored rather than allowing secondary material to
  compete with it.
- The QA capture harness should be run sequentially; simultaneous room setup can
  contend during the lobby sequence.
