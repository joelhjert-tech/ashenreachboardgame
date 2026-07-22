# P3 Encounter and Battle Timing

## Runtime motion contract

Animation follows server state and never advances gameplay. No P3 delay controls dice, rewards, consequences, prompts, or phase completion.

| Presentation change | Runtime token / behavior | Purpose |
|---|---|---|
| Encounter reveal | `--tv-encounter-reveal: 460ms` | Move attention from board to the encounter |
| Card reveal | `--tv-card-flip: 840ms` | Reveal authored art once |
| Participant entrance | `--tv-participant-enter: 620ms` | Establish the two sides |
| Dice roll | `--tv-dice-roll: 1200ms` | Make the authoritative result readable |
| Result emphasis | `--tv-result-emphasis: 900ms` | Mark the final outcome once |
| Battle card setup | `calc(--tv-card-flip + 540ms)` | Complete the opposing-card composition |
| VS reveal | 460ms after a 1120ms visual delay | Establish confrontation after the cards arrive |

The longest presentation sequence does not block server resolution. If the state advances, the clients render the new authoritative stage. Reconnect and reduced motion skip already-seen motion.

## Reduced motion

`prefers-reduced-motion: reduce` removes battle animation, transition, filtering, and smooth scrolling on phone and TV. Card backs are hidden and final card faces, dice, totals, outcomes, and actions remain visible. The information hierarchy is identical.

`data-battle-restored="true"` applies the same no-replay behavior when a known battle identity is remounted after reconnect, regardless of the OS preference.

## QA harness timing

Harness waits exist only to let browser paint and record stable evidence. They do not ship as gameplay timers:

- brief host paint wait after fixture projection;
- phone stabilization wait after tab/action projection;
- neutral-state drain before changing deterministic scenarios;
- video recording windows around the normal authoritative sequence.

The final full capture completed in approximately 147.5 seconds and produced 84 screenshots plus five recordings.

## Verification measurements

| Work | Result / duration |
|---|---|
| Content validation | PASS, approximately 3.6s |
| Typecheck | PASS, approximately 23.7s |
| Asset audit | PASS, approximately 5.6s |
| Production build | PASS; Vite build approximately 6.7s |
| Engine/rules suite | 763/763, 133.55s Vitest duration |
| Rules-only suite | 64/64, 12.37s Vitest duration |
| Integration suite | 348/348, 114.90s Vitest duration |
| Client suite | 397/397, 132.24s Vitest duration |
| Reconnect test isolated | 1/1, approximately 2.72s test time |
| Browser capture | 84 screenshots, five recordings, approximately 147.5s |

The aggregate wrapper exceeded its 364-second execution window without a reported test failure. The engine/rules, server integration, and client constituents all passed independently. The integration rerun was intentionally performed without contention and includes the reconnect-flapping test.

## Performance observations

- No horizontal layout overflow was measured at any requested viewport.
- No browser console errors were recorded.
- The focused overlay does not add a new polling loop or gameplay timer.
- Battle presentation is built once from the existing room state and sent with normal projections.
- Session-storage identity checks avoid duplicate animation after remount.
- Cached art now settles immediately when the browser reports an already-complete image, avoiding a blank loading frame.
