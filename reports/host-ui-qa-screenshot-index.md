# Host UI QA Screenshot Index

## Archives

- Baseline: [`reports/host-ui-qa/before/`](host-ui-qa/before/)
- Final: [`reports/host-ui-qa/after/`](host-ui-qa/after/)

Every gameplay filename is emitted at 1920x1080 and 1366x768 unless noted.

| Filename stem | State | Before | After | Fixture / path | Review result |
|---|---|---|---|---|---|
| `startup-no-room` | Waiting for Host Phone | yes | yes | normal auto-room | QR copy corrected. |
| `lobby-room-created` | Room exists, no phone | 1366 only | 1366 only | normal session API | Room and join path clear. |
| `board-idle-outer` | Normal board | yes | yes | normal setup/start | Strong baseline retained. |
| `movement-roll-ready` | Roll result, choose destination | yes | yes | movement journey fixture | Clipping fixed; board restored after second review. |
| `transition-guardian-locked` | Gate route locked | yes | yes | map transition fixture | Public route state only. |
| `transition-guardian-cleared` | Gate route available | yes | yes | map transition fixture | Journey and arrival state clear. |
| `transition-core-locked` | Center route locked | yes | yes | map transition fixture | Center remains canonical. |
| `transition-core-cleared` | Center route available | yes | yes | map transition fixture | No private clearance text. |
| `battle-introduction` | Enemy revealed | yes | yes | phone battle fixture | Combatants dominate. |
| `battle-roll-required` | Battle setup | yes | yes | phone battle fixture | Reveal sequence retained. |
| `battle-enemy-roll` | Enemy roll pending | yes | yes | phone battle fixture | Pending actor clear. |
| `battle-totals` | Roll result | yes | yes | phone battle fixture | Both totals simultaneous. |
| `battle-success` | Successful equal totals | yes | yes | phone battle fixture | `Tie succeeds`; one defeated row. |
| `battle-defeat` | Failed battle | yes | yes | phone battle fixture | Consequence and blocker clear. |
| `battle-reduced-motion` | Battle setup with reduced motion | no | yes | media emulation | Computed chamber animation is `none`. |
| `shop-location-open` | Public services | yes | yes | shop fixture | Repeated guidance removed. |
| `artifact-exchange-ineligible` | 2/3 completed Contracts | yes | yes | relic trade fixture | No private options. |
| `artifact-exchange-eligible` | 3/3 completed Contracts | yes | yes | relic trade fixture | TV shows eligibility only. |
| `follower-acquired` | Follower attached | yes | yes | follower fixture | Public identity only. |
| `follower-used` | Follower unavailable/used | yes | yes | follower fixture | Private note absent. |
| `scenario-preparation` | Preparation resources | no | yes | host-state QA fixture | Kept separate from confrontation. |
| `player-disconnected` | Active phone disconnected | no | yes | host-state QA fixture | Reconnect now overrides shop. |
| `session-victory` | Scenario victory | no | yes | host-state QA fixture | Outcome dominates; board remains context. |
| `session-loss` | Scenario collapse | no | yes | host-state QA fixture | Loss is unmistakable. |

## Browser assertions

- No horizontal overflow at either TV viewport.
- Movement HUD bounding boxes remain inside 1366 pixels.
- Zero canvas elements.
- No console or page errors.
- No private Artifact/Rivalry strings.
- No duplicated Threat defeated result.
- Reduced-motion battle entry has no animation.

The archive intentionally excludes fabricated UI for mechanics that have no deterministic QA fixture. Those gaps are listed in the state inventory.
