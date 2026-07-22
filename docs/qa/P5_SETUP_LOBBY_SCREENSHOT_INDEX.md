# P5 Setup and Lobby QA Index

QA root: `docs/qa/p5-setup-lobby/`

## Phone captures

Each listed state was captured at 390×844 and 360×800.

| State | Evidence |
|---|---|
| Join room | `phone/join-room-*` |
| Invalid room | `phone/invalid-room-*` |
| Room full | `phone/room-full-*` |
| Initial operative choice | `phone/operative-selection-*` |
| Host mode selection | `phone/mode-selection-*` |
| Co-op selected | `phone/co-op-selected-*` |
| Rivalry selected | `phone/rivalry-selected-*` |
| Solo selected | `phone/single-player-selected-*` |
| Operative stage restored | `phone/operative-selection-restored-*` |
| Mission selection with canonical options | `phone/mission-selection-*` |
| Ready check | `phone/ready-check-*` |
| Canonical Start blockers | `phone/start-blocked-*` |
| Start available | `phone/start-available-*` |
| Reconnect after Ready/Start availability | `phone/reconnect-start-available-*` |
| Reduced motion | `phone/reduced-motion-ready-*` |

The deterministic fixture does not invent durable `start_submitting` or `loading_match` server states because Start currently transitions synchronously. Immediate submission locking is covered by component tests; restoring an active match is covered by existing room/reconnect suites.

## TV captures

Each listed state was captured at 1920×1080 and 1366×768.

| State | Evidence |
|---|---|
| One joined player and open slots | `tv/one-joined-player-*` |
| Host scenario presentation | `tv/scenario-selection-*` |
| Mission selection waiting state | `tv/mission-selection-*` |
| Ready check | `tv/ready-check-*` |
| Start blockers | `tv/start-blocked-*` |
| Start available | `tv/start-available-*` |
| Six occupied seats | `tv/maximum-player-slots-*` |
| Reduced motion lobby | `tv/reduced-motion-lobby-*` |

The one-player lobby capture also proves join-code presentation, open slots, mode/scenario summary, and setup waiting. The maximum-player capture proves all six rows fit at 1366×768.

## Recordings

- `recordings/join-through-ready.webm`
- `recordings/mode-and-scenario-selection.webm`
- `recordings/operative-selection.webm`
- `recordings/full-room-to-start.webm`
- `recordings/reconnect-during-setup.webm`
- `recordings/reduced-motion-setup.webm`

## Automated visual review

The final run produced 46 screenshots and six recordings. Every capture passed the document-width check. Browser console and page-error collection reported zero errors. Primary-action visibility is asserted where the state has an enabled primary action; waiting and TV states intentionally have none.

Machine-readable evidence: `docs/qa/p5-setup-lobby/capture-results.json`.
