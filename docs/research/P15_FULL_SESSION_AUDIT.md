# P15 Full-Session Audit

## Method

This pass combined real HTTP/WebSocket room creation, connected phone and TV clients, canonical test fixtures, repeated reducer campaigns and catalog-wide scenario smoke/terminal checks. Fixtures changed authoritative server state; they did not author client outcomes. Unsupported AI seats, rankings and rematches were not fabricated.

## Campaign results

- **Co-op:** setup, roll, movement, arrival, private choice, battle result, shop, inventory, Contract progress, warning, final stage and end state were exercised with owner, waiting phone and TV attached.
- **Solo:** the canonical one-seat turn loop completed 30 movement turns with five state reconstructions. End turn returned to the same operative without assistance waiting.
- **Rivalry:** locked Agenda, owner-private state and public-safe TV/waiting projections were checked. No hidden Agenda, target, Contract or inventory detail crossed projection boundaries.
- **Nemesis Relay:** supported setup/progression/conclusion states remain covered by engine/integration fixtures. No AI seat behavior was introduced.
- **Six player:** player-count matrix 1–6 and a live six-seat host fixture verified marker stacking, handoff and host readability.
- **Reduced motion:** the result flow preserved state labels and totals with motion disabled.
- **Reconnect stress:** five real page reload/reconnect cycles plus focused setup, roll, movement, arrival, encounter, battle, reward, shop, objective and end-state restoration checks completed without replay.
- **Scenario matrix:** 31/31 supported scenario/mode/player-count browser cases and 31/31 authoritative victory/defeat terminal checks passed across all seven scenarios.

## Soak

The deterministic soak completed 30 turns, 30 movement selections and 30 movement commits, reconstructing the server on turns 6, 12, 18, 24 and 30. Browser sampling across 30 authoritative state cycles found one interval before and after, zero outstanding timeouts/animation frames, heap 13.4 MB before and after, and listener balance decreasing from 204 to 173. DOM nodes changed from 73 to 162 because the final sampled screen was a richer active state, not cumulative copies.

## Action continuity

Required-action projections retained one actor, one primary owner control and public-safe waiting context across setup, roll, movement, encounter, battle, consequence, reward, shop, inventory, objective and end-turn states. Reconnect advanced projection revision before restoring actionability. Duplicate submissions and stale commands remained rejected by the existing server tests.

## Findings

- P0: none.
- P1: ended host board controls remained focusable behind the result overlay; fixed by making the command board inert while ended.
- P1: host audio/admin controls could render below 44 px after responsive root scaling; fixed with physical pixel minimums.
- P2: scenario campaign harness contained stale six-scenario, old auth-key and long-name assumptions; corrected in the QA runner only.
- P2: the campaign runner left child QA servers alive on Windows after browser completion; final verification stopped all process trees, and the runner lifecycle should be hardened before routine CI use.
- P3: expected missing-art fallback warnings remain in explicit fallback tests.
