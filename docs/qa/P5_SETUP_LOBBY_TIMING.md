# P5 Setup and Lobby Timing

Measured on the local deterministic QA server on 2026-07-21. Values are development-machine observations, not network service-level guarantees.

| Transition | Observed |
|---|---:|
| Join submission → authoritative operative-selection projection | 192 ms |
| Scenario-selection fixture request | 7–25 ms |
| Operative-selection fixture request | 7–15 ms |
| Mission-selection fixture request | 8–20 ms |
| Ready-check fixture request | 6–14 ms |
| Start-blocked fixture request | 8–18 ms |
| Start-available fixture request | 5–26 ms |
| Maximum-player fixture request | 15 ms |

Fixture timings measure authoritative server acceptance. The browser then waits a deliberate 220 ms settling interval before screenshots; that delay is QA-only and is not gameplay timing. Setup controls lock synchronously on submission. No decorative setup animation determines command timing.

The current Start command changes to the resulting server state synchronously, so there is no fabricated percentage progress or artificial `loading_match` duration. Reconnect recording uses a real page reload and authoritative projection restoration. Reduced-motion recordings use the browser preference and preserve the same information and actions.
