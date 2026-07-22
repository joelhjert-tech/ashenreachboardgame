# P4 Waiting and Handoff QA Index

All evidence is under `docs/qa/p4-waiting-handoff/`. Fixtures used real server projections through the token-authorized development QA endpoint.

## Phone — active player

Every state below was captured at 390×844 and 360×800:

| State | Files |
|---|---|
| Public result | `phone/result-{viewport}.png` |
| Long result | `phone/long-result-{viewport}.png` |
| Result with Continue | `phone/result-with-continue-{viewport}.png` |
| Continue submitting | `phone/continue-submitting-{viewport}.png` |
| Public damage | `phone/public-damage-{viewport}.png` |
| Private consequence | `phone/private-choice-{viewport}.png` |
| Private reward | `phone/private-reward-{viewport}.png` |
| End Turn available | `phone/end-turn-available-{viewport}.png` |
| End Turn submitting | `phone/end-turn-submitting-{viewport}.png` |
| Turn closing | `phone/turn-closing-{viewport}.png` |
| Next player active | `phone/next-turn-ready-{viewport}.png` |
| Reconnect during result | `phone/reconnect-result-{viewport}.png` |
| Reconnect during End Turn | `phone/reconnect-end-turn-{viewport}.png` |
| Stale Continue recovery | `phone/stale-continue-recovery-{viewport}.png` |
| Stale End Turn recovery | `phone/stale-end-turn-recovery-{viewport}.png` |
| Reduced-motion result | `phone/reduced-motion-result-{viewport}.png` |

## Waiting phones

Every state below was captured at 390×844 and 360×800:

| State | Files |
|---|---|
| Result resolving | `waiting-phone/waiting-result-{viewport}.png` |
| Long result resolving | `waiting-phone/waiting-long-result-{viewport}.png` |
| Private consequence | `waiting-phone/private-choice-waiting-{viewport}.png` |
| Private reward | `waiting-phone/private-reward-waiting-{viewport}.png` |
| End Turn submitting | `waiting-phone/end-turn-submitting-waiting-{viewport}.png` |
| Previous player after handoff | `waiting-phone/previous-player-waiting-{viewport}.png` |

## Host TV

Every state below was captured at 1920×1080 and 1366×768:

| State | Files |
|---|---|
| Public result | `tv/result-{viewport}.png` |
| Long public result | `tv/long-result-{viewport}.png` |
| Public consequence | `tv/public-consequence-{viewport}.png` |
| Private resolution waiting | `tv/private-choice-public-safe-{viewport}.png` |
| Human handoff | `tv/turn-handoff-{viewport}.png` |
| Next required action | `tv/next-required-action-{viewport}.png` |
| Reconnect-restored handoff state | `tv/reconnect-restored-handoff-{viewport}.png` |
| Reduced-motion handoff | `tv/reduced-motion-handoff-{viewport}.png` |

## Recordings

- `recordings/result-to-continue.webm`
- `recordings/result-to-end-turn.webm`
- `recordings/human-to-human-handoff.webm`
- `recordings/reduced-motion-handoff.webm`

Raw Playwright recordings are retained under `recordings/raw/` for traceability.

## Review findings and correction pass

The first screenshots showed the waiting actor and public action twice: once in the shell header and again in a second waiting card. The second card was removed, the header became the single restrained live region, and all waiting screenshots were recaptured.

Review results:

- Horizontal overflow: 0 px in all 60 captures.
- Console/page errors: 0.
- Private data leakage: none detected by serialized projection tests or browser text scan.
- Long result: Continue remains reachable in the encounter action region.
- End Turn: appears ahead of optional gear when legal.
- Handoff: names both players while retaining the board.
- Reconnect: handoff does not replay on the same TV session.

## Unavailable canonical states

- AI turn, human-to-AI handoff, and AI-to-human handoff: unavailable because Ashen Reach currently has no AI-seat turn system. Nemesis automation is not a player turn. No screenshot or recording was fabricated.
- A separate durable “automatic result transition” screen does not exist. Canonical automatic advancement is transient server processing and is covered by engine/integration tests rather than a fake paused fixture.
