# P14 Progression, Pressure, and Endgame Report

## Outcome

P14 now presents the complete match arc from one server-authored projection.
The TV keeps Win Progress and Loss Pressure in its command header, announces
bounded changes and the final stage over the board, and presents a structured
result without inventing rankings. Phones use the same public result and add
only the owner's authorized private Agenda conclusion.

No movement, encounter, reward, threshold, scenario, save, or victory mechanic
was changed. Presentation never advances gameplay.

## Server contract

`MatchProgressPresentation` is built in `roomServer.ts` from canonical state:

- `scenarioProgress` or scenario-owned confrontation progress supplies Win
  Progress.
- canonical escalation/collapse rules supply Loss Pressure and its limit.
- `scenarioConfrontation.active` is the sole final-stage trigger.
- `scenarioResult` supplies victory/defeat first; ended-session winner state is
  retained only as a legacy compatibility fallback.
- public `ResultDelta` events supply stable, public-safe change identities and
  causes.
- the phone receives `ownerPrivateResult` only from its existing private
  Rivalry projection.

Event-derived presentation identities now use stable event creation identity,
not a moving recent-log index. Internal seat, source, victory-condition, and
confrontation IDs are not rendered.

## Host presentation

- Existing progress instruments remain in the top command bar with numeric
  values.
- Near-win, danger, and critical warnings include text as well as colour and
  shape.
- Progress/pressure changes use one bounded overlay while the map stays visible.
- Final-stage entry uses a bounded announcement, then leaves a compact public
  objective on the board.
- Victory and defeat show mission, public reason, final tracks, operatives, and
  whether the final stage was reached.
- The old client-inferred result and invented most-Wounds/most-Scars/most-Trophy
  rankings were removed.
- `Return to Lobby` is the one canonical host action. No rematch was invented.

## Phone presentation

- Objectives show the same public progress, pressure, warning, cause, and final
  objective as TV.
- Ended sessions suppress unrelated tabs and show the complete result above the
  fold.
- `Leave Room` is the player action; Host Phone ownership of Return to Lobby is
  explained.
- A Rivalry phone may see its own private Agenda conclusion only. Other players'
  Agenda data remains absent.
- The generic required-action shell no longer masks the result screen.

## Reconnect and reduced motion

Transient presentation is acknowledged by stable ID in session storage. A
reconnect restores settled values/results without replaying a change, reward,
or first-reveal animation. Reduced motion removes transforms, pulses, and bar
travel without removing labels, totals, reasons, warnings, or actions.

## Browser-QA corrections

The first visual pass found and corrected:

1. A conditional hook in the TV result transition, which caused a React static
   flag error only when entering an ended state.
2. The phone result being hidden behind the generic required-action wrapper.
3. Unstable event-log indices replaying old progress feedback.
4. QA long-title state leaking its scenario into later captures.
5. Threshold text being too easy to miss in the compact TV header.

The final run captured 113 screenshots and 9 recordings with zero horizontal
overflow and zero browser console errors.

## Four-seat critique

### New player

The next match milestone, collapse risk, final objective, result, and available
exit are explicit. The result no longer depends on interpreting a bar colour or
knowing what a raw winner identifier means.

### Optimizer

Exact totals remain visible, change causes do not replay after reconnect, and
no fabricated leaderboard obscures canonical information. Unsupported Rivalry
ranking remains documented rather than inferred.

### Family / casual player

The board remains visible during updates, warnings use plain language, and the
phone conclusion fits the short 360×800 viewport without requiring a search
through tabs.

### Rules lawyer

Every displayed threshold, stage, reason, result, winner name, private Agenda
summary, and allowed command originates from the server projection. Missing
result data is never converted to a draw.

## Unsupported states deliberately not fabricated

- Rematch: no canonical command exists.
- Aggregate Rivalry ranking or tie: no canonical resolver exists.
- Draw: no canonical match result exists.
- AI/Nemesis controller result: canonical Relay state does not provide it.

## Verification

The completed verification run produced these results:

- `npm.cmd run validate:content`: passed. All canonical content families loaded.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run test:engine`: 763/763 passed across 70 files.
- `npm.cmd run test:rules`: 64/64 passed across 12 files.
- `npm.cmd run test:integration`: 365/365 passed across 42 files.
- `npm.cmd run test:client`: 420/420 passed across 50 files.
- `npm.cmd run audit:assets`: 435/435 assets present; no missing, invalid, or
  placeholder assets.
- `npm.cmd run build`: passed; Vite built 562 modules.
- Focused P14 server and TV projection coverage: 63/63 passed. The wider focused
  P14 selection passed 157/157.
- Browser QA: 113 captures and 9 recordings; zero horizontal-overflow defects,
  zero console errors, and public/private inspection passed.
- `git diff --check` and `git diff --cached --check`: passed; only existing
  line-ending notices were emitted.

The aggregate `npm.cmd run test` completed with 1,547/1,548 passing. Its only
failure was the reconnect-flapping timing test observing one additional
intermediate connection status under aggregate contention. No timeout or
assertion was weakened. The exact failing test then passed alone (1/1 in 7.89
seconds), and the complete integration suite passed again without contention
(365/365 in 115.23 seconds). The final authoritative connection state was open
even in the aggregate failure.

All temporary QA services were stopped. No commit or push was made.
