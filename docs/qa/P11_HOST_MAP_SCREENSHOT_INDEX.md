# P11 Host Map Screenshot and Recording Index

## Test environment

- Branch: `ui/tv-movement-focus-mode`
- Base checkpoint: `6bd4fc05a292df3749d024070260c27cf61c517a`
- Browser: Playwright Chromium
- Runtime: real Vite client and WebSocket/server flow with the repository's authoritative QA fixture endpoint
- Sessions: one-player standard game plus a real six-seat co-op setup
- TV viewports: 1366x768, 1600x900, 1920x1080
- Screenshot root: `docs/qa/p11-host-map/screenshots/`
- Recording root: `docs/qa/p11-host-map/recordings/`
- Machine-readable measurements: `docs/qa/p11-host-map/capture-metrics.json`

No client state was manually injected. The six-player session used normal phone joining, operative selection, mission selection, Ready, and Start Game before the deterministic public fixture placed the operatives.

## Screenshot matrix

Each row exists at all three viewports with the suffixes `-1366x768.png`, `-1600x900.png`, and `-1920x1080.png`.

| State stem | Evidence | Review result |
|---|---|---|
| `board-overview-current-sector` | Ordinary board, active operative, current-sector brief | Active flag and sector identity readable; full board retained |
| `destination-abc` | Authoritative legal destinations | A/B/C choices remain primary; compact brief does not compete |
| `selected-destination-route-context` | Selected destination and exact route | Route, distance, destination, and brief agree; duplicate destination HUD removed |
| `cross-ring-gate-context` | Guardian Span gate and ring transition | Public gate/cross-ring meaning visible without internal clearance IDs |
| `bridge-current-location` | Ashwake Crossing bridge context | Bridge meaning uses canonical public content |
| `public-shop-sector` | Votive Engine Room shop/service | Service presence is public; stock is not promised |
| `long-sector-name` | Weeping Ammunition Shrine | Long tile and brief text wrap with no overflow |
| `reconnect-restored-map` | Reload during movement planning | Authoritative focus and route return without replay |
| `reduced-motion-map` | Same route state with reduced motion | Static identity and full information retained |
| `six-operatives-stacked-active` | Six operatives on Anchor Market | Stable marker order, active identity, grouped mission density, bounded roster |

Total: 30 PNG files.

## Recordings

| File | Sequence | Review result |
|---|---|---|
| `overview-to-movement-selection.webm` | Current sector to authoritative destination choice | Brief follows state; board remains stable |
| `destination-preview-changes.webm` | Two destination selections | Preview updates without stale text or listener accumulation |
| `movement-route-and-arrival.webm` | Multi-sector route and destination arrival | Canonical route is followed; presentation does not drive gameplay |
| `arrival-to-encounter-focus.webm` | Arrival followed by focused encounter | Sector brief yields to the encounter shell |
| `operative-handoff.webm` | Current seat to next seat | Active emphasis changes once with authoritative handoff |
| `reconnect-restoration.webm` | TV reload during movement planning | Stable route/brief restored; completed effects not replayed |
| `reduced-motion-map-sequence.webm` | Gate/cross-ring focus under reduced motion | No pulse/slide dependency; same facts remain visible |

## Required-state disposition

The P11 archive consolidates related acceptance states rather than duplicating identical frames. For example, the six-operative stack covers six operatives, several operatives on one sector, active emphasis, many occupants, and dense public objective markers. The selected-destination set covers A/B/C, route, destination preview, and current-region context.

- Ferry: not captured because no canonical ferry metadata or route exists. No route was fabricated.
- Persistent encounter/public enemy/threat-blocked shop: represented only when the current authoritative encounter projection exposes them. P11 does not retain a false persistent occupant merely to create a screenshot.
- Missing lore: all active canonical sectors currently contain lore. Empty-field omission is covered by the presentation adapter/render tests.
- Missing art: existing P8 `HostImage` fallback behavior remains unchanged and covered by its tests; P11 did not corrupt canonical art to fabricate a frame.
- Private agenda hidden: every capture scans rendered text for private/internal terms, and focused render tests verify absence. No private Rivalry data was synthesized.

## Visual corrections after first review

1. The selected destination appeared both in the new brief and the prior movement destination panel. The old detail block is now visually suppressed only while the sector brief is present; roll, route, and travel timeline remain.
2. Six-player mission markers produced excessive tile obstruction. Markers now retain the first two stable-seat identities plus a labelled `+N` overflow marker, while selected-sector details preserve the public roster.
3. At 1366x768, secondary lore and tags consumed too much height. The compact breakpoint now prioritizes identity, immediate rule, occupants, and route context.

## QA results

- Horizontal overflow: 0 for all 30 captures.
- Vertical overflow: 0 for all 30 captures.
- Browser console/page errors: 0.
- Forbidden private/internal text matches: 0.
- Screenshot failures: 0.
- Recording failures: 0.
