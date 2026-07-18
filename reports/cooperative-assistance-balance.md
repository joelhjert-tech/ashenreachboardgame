# Cooperative Assistance Balance

## Method

`npm.cmd run analyze:cooperative-assistance` enumerates all 17 canonical non-QA operative definitions, uses their intrinsic skills, and evaluates the exact 2d6 distribution. It is deterministic analysis, not a human playtest. It reports weak, median, and optimized parties against difficulty bands 8–20.

Intrinsic ranges were:

| Skill | Minimum | Median | Maximum |
|---|---:|---:|---:|
| Command | 1 | 2 | 9 |
| Grit | 1 | 3 | 9 |
| Signal | 1 | 2 | 9 |
| Guile | 2 | 4 | 9 |
| Forge | 2 | 3 | 9 |

## Scenario calibration

| Test | Difficulty | Median active + one median helper | Weak active + two median helpers | Rationale |
|---|---:|---:|---:|---|
| Black Relay / Signal | 12 | 41.7% | 58.3% | Risky with one; material improvement with two |
| Webglass / Command | 12 | 41.7% | 58.3% | Same cooperative pressure across early/middle nodes |
| Cinder Lattice / Guile | 16 | 41.7% | 72.2% | Higher Guile distribution requires a harder inner node |
| Break the Chorus / Command | 12 | 41.7% | 58.3% | Opening Core stage remains accessible |
| Sever the Relay / Signal | 12 | 41.7% | 58.3% | Maintains the Signal identity |
| Hold Your Name / Grit | 15 | 27.8% | 41.7% | Hard final check; active Equipment/progression can raise this |

Active-operative effective stats and Equipment are deliberately not represented in the median column, so real prepared operatives perform better. Failure advances existing Global Escalation by 1; it does not create a second permanent pressure resource.

## Findings

- Full base-stat contributions create a strong, understandable reward for party composition.
- Weak operatives remain meaningful because the active player retains their own roll and full effective stat.
- Optimized characters with two optimized helpers can guarantee many ordinary difficulties. This follows the explicitly requested formula and was not silently weakened.
- Assistance on every trivial roll would add request fatigue and can trivialize difficulty 8–10. Eligibility remains limited to actual skill rolls; movement, payments, draws, passive effects, and automatic consequences are excluded.
- Six-player layout remains readable because only two requested helpers appear in the focused calculation.

## Deferred playtest questions

1. Whether normal difficulty-8 encounters should continue offering assistance once full-session timing is observed.
2. Whether optimized six-player parties overuse the same two specialists.
3. Whether repeated consent windows slow casual sessions.
4. Whether Hold Your Name at 15 is sufficiently dramatic after normal Equipment and progression.

No cooldown, reduced helper value, or balance-only encounter restriction was introduced.
