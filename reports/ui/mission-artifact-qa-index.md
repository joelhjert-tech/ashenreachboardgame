# Mission and Artifact QA Index

## Fixture

- Real single-player server and WebSocket projections
- QA fixture: authoritative `relic-trade` state through the server fixture endpoint
- Phone: 390×844
- TV: 1920×1080, 1440×900, 1280×720, and confirmed-result 1366×768
- Browser: headless Chromium
- Live state was mutated only through normal server setup, intents, reducers, and the existing authenticated QA fixture

## Screenshots

| File | State | Finding |
|---|---|---|
| `reports/ui/economy/phone-390x844-insufficient-contracts.png` | 2/3 dealer state | Service remains unavailable without three credentials |
| `reports/ui/economy/phone-390x844-exchange-ready.png` | 3/3 dealer state | Artifact service is available; no automatic grant |
| `reports/ui/economy/phone-390x844-private-artifact-options.png` | private candidate choice | Up to two owner-only candidates; Missions explicitly remain owned until confirmation |
| `reports/ui/economy/phone-390x844-confirm-artifact.png` | confirmation | Exact selected Artifact and exchange confirmation shown |
| `reports/ui/economy/phone-390x844-reconnect-ledger.png` | reconnect after exchange | Zero unspent, acquired Artifact present, three spent records in collapsed history |
| `reports/ui/economy/tv-1920x1080-requisition-private.png` | pending private choice | No candidate names; public waiting state |
| `reports/ui/economy/tv-1440x900-requisition-private.png` | pending private choice | No candidate names; responsive public waiting state |
| `reports/ui/economy/tv-1280x720-requisition-private.png` | pending private choice | No horizontal overflow; public waiting state remains readable |
| `reports/ui/economy/tv-1366x768-public-exchange.png` | confirmed acquisition | Selected Artifact becomes public exactly once |
| `reports/ui/mission-artifact/phone-390x844-mission-progress.png` | Mission progress | Active objective, 1/3 progress, and typed Salvage reward are visible together |
| `reports/ui/mission-artifact/phone-390x844-mission-ready.png` | Mission ready | Explicit authoritative completion action is visible in the Contracts group |
| `reports/ui/mission-artifact/phone-390x844-mission-reward.png` | Mission completion | Completed route and immediate `Gain 1 Salvage` result appear once |
| `reports/ui/mission-artifact/phone-390x844-replacement-mission.png` | replacement selection | Owner phone automatically opens the private next-Mission picker |
| `reports/ui/mission-artifact/tv-1920x1080-mission-inspector.png` | Admin Library | Normalized objective and reward data remain inspectable |
| `reports/ui/mission-artifact/tv-1920x1080-mission-reward-simulation.png` | Simulation Lab | Detached canonical preview shows Salvage 3 to 4, ordered effect trace, and unchanged live/registry evidence |

## Review and correction

The first browser pass exposed two issues:

1. Chrome reported a blocked vibration call before user activation. The phone now checks `navigator.userActivation.hasBeenActive` before vibrating.
2. TV showed “Transaction Resolved” while Artifact selection was still pending. The pending state now reads `RELIC REQUISITION IN PROGRESS` and explains that Missions remain unspent until phone confirmation.

The corrected capture pass completed with no console errors. Candidate identities were absent from every TV screenshot. No page-level horizontal overflow was observed at the requested viewports.

The focused Mission capture also completed with no console errors or horizontal overflow. The QA fixture establishes only deterministic progress/ready preconditions; completion, reward resolution, replacement queuing, Admin inspection, and Simulation Lab execution use the normal authoritative paths.
