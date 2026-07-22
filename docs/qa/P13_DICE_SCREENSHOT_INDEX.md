# P13 Dice Screenshot and Recording Index

Root: `docs/qa/p13-dice/`

## Phone

Each principal state was captured at 360x800, 390x844, and 430x932 unless noted.

| State | Files | Evidence |
|---|---|---|
| Movement ready | `phone/movement-roll-ready-*.png` | One action, purpose, pending face, no fabricated value |
| Movement result / destination handoff | `phone/movement-roll-result-*.png` | Raw face 1, final 1, four legal destinations |
| Battle ready | `phone/battle-roll-ready-*.png` | Canonical two-die count and one Roll action |
| Battle two-die result | `phone/battle-two-die-result-*.png` | Ordered 3 + 4, raw 7, final 12, target 12 |
| Hazard/test result | `phone/event-test-result-*.png` | Ordered 1 + 1, modifiers, final 5, reroll cost/action |
| Reconnect result | `phone/reconnect-stable-result-390x844.png` | Restored 3 + 4 result; no replay or new command |
| Reduced motion | `phone/reduced-motion-result-390x844.png` | Complete raw and final information without tumble |

## Host TV

Each principal state was captured at 1366x768, 1600x900, and 1920x1080 unless noted.

| State | Files | Evidence |
|---|---|---|
| Movement result and destination markers | `host/movement-roll-result-*.png` | Board remains visible; raw/final movement value persists |
| Battle ready | `host/battle-roll-ready-*.png` | Public roll context; no TV action |
| Battle two-die result | `host/battle-two-die-result-*.png` | Stable 3 + 4 faces, final 12, fixed opposing value 12 |
| Hazard/test result | `host/event-test-result-*.png` | 1 + 1, positive and negative modifiers, final 5 |
| Reconnect result | `host/reconnect-stable-result-1920x1080.png` | Settled authoritative result restored |
| Reduced motion | `host/reduced-motion-result-*.png` | Same dice, arithmetic, and outcome with motion disabled |

## Waiting phone

| State | File | Evidence |
|---|---|---|
| Waiting for owner battle roll | `waiting-phone/waiting-for-owner-roll-390x844.png` | Public actor/context only; no owner Roll or reroll control |

## Recordings

- `recordings/movement-ready-to-result.webm`
- `recordings/battle-ready-to-result.webm`
- `recordings/reroll-window.webm`
- `recordings/reduced-motion-battle.webm`

## Automated capture evidence

`capture-results.json` records viewport, visible dice values, reduced-motion state, and horizontal overflow for every still. All 34 captures report zero horizontal overflow and the browser-error list is empty.

## Unsupported combinations

- Three-or-more operative dice are not supported by canonical current content, so no synthetic screenshot was fabricated.
- The map-first TV does not enter movement focus before a movement planner/result exists; movement readiness remains in the public Live Status rather than a fake pending die scene.
- Very short submitting/animation phases are represented in the recordings. Still result captures intentionally wait for the stable settled frame.
