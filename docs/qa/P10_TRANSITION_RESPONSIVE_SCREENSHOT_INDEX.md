# P10 Transition and Responsive Recovery — Screenshot Index

## Movement arrival and encounter handoff

| State | 1366×768 | 1600×900 | 1920×1080 |
|---|---|---|---|
| Arrival emphasis | [1366](p2-movement/screenshots/tv-arrival-emphasis-1366x768.png) | [1600](p2-movement/screenshots/tv-arrival-emphasis-1600x900.png) | [1920](p2-movement/screenshots/tv-arrival-emphasis-1920x1080.png) |
| Encounter handoff | [1366](p2-movement/screenshots/tv-encounter-handoff-1366x768.png) | [1600](p2-movement/screenshots/tv-encounter-handoff-1600x900.png) | [1920](p2-movement/screenshots/tv-encounter-handoff-1920x1080.png) |
| Final route step | [1366](p2-movement/screenshots/tv-final-movement-step-1366x768.png) | [1600](p2-movement/screenshots/tv-final-movement-step-1600x900.png) | [1920](p2-movement/screenshots/tv-final-movement-step-1920x1080.png) |

Recordings: [P2 recordings](p2-movement/recordings/). The four canonical route videos retain normal gameplay timing; the screenshot-only QA query extends local arrival presentation without changing state or commands.

## Shop control clearance

| State | 360×800 | 390×844 | 430×932 |
|---|---|---|---|
| Leave Shop clearance | [360](p6-shop-presentation/phone/leave-shop-clearance-360x800.png) | [390](p6-shop-presentation/phone/leave-shop-clearance-390x844.png) | [430](p6-shop-presentation/phone/leave-shop-clearance-430x932.png) |
| Equipment offer | [360](p6-shop-presentation/phone/equipment-360x800.png) | [390](p6-shop-presentation/phone/equipment-390x844.png) | [430](p6-shop-presentation/phone/equipment-430x932.png) |

Measured results are in [P6 capture index](p6-shop-presentation/capture-index.json): zero horizontal overflow, minimum 44 px Shop control, and no visible overlap among offer navigation, Leave Shop, and the global dock.

## Waiting, focus, status, and battle language

- [Single waiting context, 390×844](p4-waiting-handoff/waiting-phone/waiting-result-390x844.png)
- [Single waiting context, 360×800](p4-waiting-handoff/waiting-phone/waiting-result-360x800.png)
- [Mission selection, 390×844](p5-setup-lobby/phone/mission-selection-390x844.png)
- [Ready check, 390×844](p5-setup-lobby/phone/ready-check-390x844.png)
- [Start available, 390×844](p5-setup-lobby/phone/start-available-390x844.png)
- [Battle result, 1366×768](p3-encounter-battle/host/08-success-result-1366x768.png)
- [Battle result, 1920×1080](p3-encounter-battle/host/08-success-result-1920x1080.png)

Exact P3 filenames and all 84 captures are recorded in [P3 capture results](p3-encounter-battle/capture-results.json). Exact setup focus targets are recorded in [P5 capture results](p5-setup-lobby/capture-results.json).

## Review result

All reviewed screenshots have zero page-level horizontal overflow and zero browser-console errors. The final arrival frames visibly retain the command header, show all authoritative route steps, emphasize the destination, and expose only public destination/challenge information. No private Rivalry data, mission options, inventory choice, or owner-only prompt appears on TV. Genuine active Rivalry and real server-outage screenshots remain unclaimed because this pass did not fabricate those states.
