# P15 Contention Analysis

## Original failure

`src/server/__tests__/reconnectFlapping.integration.test.tsx` expected the reconnect status trace to remain stable after the replacement socket opened. Under aggregate contention it sometimes observed one additional intermediate render.

The old wait was not semantic: it accepted the still-rendered `open` label plus an increased historical connection count, then slept 1.5 seconds. That could complete after the server accepted the replacement socket but before React consumed the reconnect projection.

## Classification

- **E — test-harness observation race:** the assertion sampled an unstable render boundary.
- **D — duplicate bootstrap emission:** `adoptPhoneClient` sent a direct snapshot and immediately broadcast the same authoritative sequence again.

The intermediate state was server-originated, bounded and privacy-safe, but duplicate delivery made its observation scheduling-sensitive. It did not authorize a stale command or replay an effect.

## Correction

`GameRoomServer.adoptPhoneClient` now performs one authoritative broadcast for adoption/connectivity. The test waits for all of these semantic conditions:

- a closed state was actually observed after the drop;
- total connections increased by exactly one;
- exactly one socket is active;
- exactly one newer state patch arrived;
- the projection sequence advanced;
- the rendered status returned to open.

The fixed delay and status-array-length assertion were removed. Actor, command, connection and private projection checks remain exact.

## Evidence

- Before correction, isolated loop: 25/25 pass; average 10.14 s (9.67–10.96 s), demonstrating the contention-only character.
- After correction, exact focused test: 1/1 pass in 1.25 s.
- After correction, isolated loop: 25/25 pass; average 8.46 s (8.04–9.29 s).
- Focused reconnect/movement/player-count group: 16/16 pass.
- Shuffled integration seed 1501: 365/365 pass.
- Aggregate under concurrent browser and constituent load: 1,548/1,548 pass; reconnect case completed in 1.29 s.
- Clean canonical aggregate after all P15 corrections: 162 files and 1,548/1,548 pass in 565.58 s; reconnect completed in 1.31 s.

No assertion was weakened, no retry loop was made unbounded, and no sleep was added.

## Additional fixture isolation finding

Shuffled integration initially exposed a module-global room retained between `serverApi.integration` cases. A late-running name-validation case inherited a full room and returned the correct runtime rejection for the wrong fixture state. Test teardown now resets that harness to a clean unique lobby. The isolated shuffled file passes 26/26 and shuffled integration passes 365/365.

## Aggregate environment finding

A raw randomized Vitest invocation accidentally discovered a backup test beneath `.codex-safety`, expanding the run to 1,634 tests. It is not the package's canonical aggregate and is excluded from pass/fail totals. A later correctly scoped shuffled run exceeded its 15-minute execution window because nine browser-campaign QA server trees had remained alive on random ports. Process inspection identified those exact `scripts/dev.ts --qa-fixtures` trees plus the timed-out worker; after they were stopped, the standard canonical wrapper completed 1,548/1,548. This is classified as a QA lifecycle/resource-isolation issue, not a runtime gameplay failure. The release runner must always close spawned child process trees before aggregate verification.
