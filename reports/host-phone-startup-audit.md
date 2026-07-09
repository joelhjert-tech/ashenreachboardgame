# Host Phone Startup Audit

## Baseline

- Commit baseline before this pass: `4d39e96 archive-promoted-legacy-contract-assets`
- Scope: startup/lobby ownership only
- Content, card assets, movement, battle, shop, mission, scars, and Heat status were not changed.

## Previous Startup Behavior

Opening `/tv` restored or created a host-controlled setup surface. The TV could render setup controls, scenario/mode selectors, player rails, and other command-board panels before any phone had joined. The browser on the host computer also held the host token and could start or configure the session.

This made local startup fragile because the display computer was acting as both table display and setup controller. It also meant the heavy TV board/setup UI could appear before the intended real controller had joined.

## Room Code And QR Flow

The server owns the room code. `/api/session` exposes the current room code, LAN-safe session metadata, and startup flags. The TV reads that summary and subscribes as a public TV display with no host token. The QR continues to point phones at the same room code.

The phone join endpoint now accepts only room code and player name for the first step. Character selection is a later server-authoritative intent.

## Root Cause Of Startup Failure

The old flow coupled three responsibilities:

- TV display
- host setup authority
- player seat/character setup

That coupling meant startup could depend on host-computer state such as host token storage, restored setup controls, and whether the TV had already loaded the broader dashboard. A phone could not reliably become the setup authority before the TV had already entered a heavier host flow.

## New Flow Implemented

1. Server starts with `lobbyConfigured: false`.
2. TV opens `/tv` and shows only a black startup screen:
   - Ashen Reach title
   - room code
   - QR
   - "Waiting for Host Phone"
   - "Scan to control setup"
3. First phone to join receives the setup host role.
4. Host Phone chooses game type and supported mode.
5. Host Phone controls start.
6. TV loads the board only after the session is configured and started.

## TV Ownership Boundary

Before game start, TV is display-only. It does not render:

- map
- board tiles
- sidebars
- player rails
- scenario panels
- movement/shop/battle panels
- TV-side game selection controls

After game start, TV renders the normal command board.

## Phone Ownership Boundary

The first joined phone becomes Host Phone. It can:

- choose Single Player
- choose Multiplayer mode
- start when setup requirements are met

Each phone controls only its own character, starting mission, ready state, and in-game actions.

## Mode Mapping

| Visible label | sessionMode | interactionMode | gameMode | Hidden/private agenda | Min players | Safe to expose |
| --- | --- | --- | --- | --- | --- | --- |
| Single Player | single-player | co-op | standard | No | 1 | Yes |
| Normal | n/a | n/a | n/a | No | n/a | Disabled/coming later |
| Co-op | multiplayer | co-op | standard | No | 2 | Yes |
| Rivalry | multiplayer | rivalry | standard | Existing rivalry privacy rules only | 2 | Yes |
| Nemesis | multiplayer | co-op | nemesis_relay | Existing nemesis relay privacy rules | 2 | Yes if described as relay/private objective mode, not generic betrayal |

Internal names such as `ruthless`, `standard`, and `nemesis_relay` remain internal and are not displayed raw.

## Reconnect Behavior

The setup host role is stored as `setupHostSeatId`. Rejoining the same seat token restores the role before the game starts. A normal player phone receives its own setup step from projected seat state:

- joined/no character -> character selection
- character/no mission -> mission selection
- mission/not ready -> ready screen
- ready/not started -> waiting
- started -> controller

## Start Ownership

The TV no longer needs a Start button for setup. The Host Phone sends the start request with its seat token. The server accepts start only from the setup host seat or from the legacy host token for backward compatibility.

Solo Ready no longer auto-starts the room. Ready marks setup complete; Host Phone start begins the game.

## Tests Added Or Updated

- TV startup screen renders room code/QR and no board before start.
- TV auto-attaches as public display without host token.
- TV does not expose setup/mode/create controls.
- Phone first-join flow shows Host Phone game type controls.
- Phone character selection happens after seat claim.
- Host Phone start button appears in setup wait view.
- Room server assigns first joined phone as setup host.
- Room server rejects lobby configuration from non-host phones.
- Single-player Ready waits for explicit start.

## Browser QA

- `/tv` at 1920x1080: black startup screen rendered room code, QR, and "Waiting for Host Phone"; no map, sidebars, player rails, scenario panels, or canvas before game start.
- `/tv` at 1366x768: same startup state remained readable with no board UI and `canvasCount: 0`.
- Phone `/` at 390x844: join screen showed room code/name fields; first joined browser phone became Host Phone and showed game type controls.
- After Host Phone joined, TV updated to "Host Phone connected" and still did not load board UI.
- Choosing Single Player on the phone advanced to character selection without TV/computer input.
- No console/page errors were reported by the Playwright browser QA script.
- Dev server listeners on ports 5173 and 8080 were stopped after QA.

## Open Validation

Real physical phone QR validation was not performed in this automated pass. Keep P0-RD-001 open until a real handset scans the QR, joins as Host Phone, disconnects, reconnects, and resumes setup on the LAN.
