# Signal Theatre Cartography Prototype

## Status

Approved and implemented for normal play.

Signal Cartography is opened from the phone Movement screen through the server-validated `HOST_VIEW_REQUESTED` presentation intent. It does not alter gameplay state, movement, saves, random results, or the event log.

## Purpose

The map gives the table a public, schematic answer to:

- Where is each operative?
- Which destinations are legal?
- Which route is selected?
- Which printed Threat lanes are present?
- Which recurring or direct challenges are known?
- Which revealed persistent encounters remain on the board?

It never exposes hidden bag order, unrevealed cards, private missions, inventory, reactions, or choices.

## Phone prototype

The S21 Movement screen keeps the production identity rail and bottom navigation. A 44 CSS-pixel `Show map on TV` control sits inside the movement command viewport.

The production control emits either:

- `mode: "map"` to show Signal Cartography.
- `mode: "signal"` to return to Signal Theatre.

Any joined player may request the public map while movement is available. The latest valid request wins. The existing development fixture remains available at `/phone?phoneFixture=cartography`.

## TV prototype

The TV surface is an original SVG relay schematic with:

- Four concentric reaches.
- All 49 canonical sector names.
- Canonical sector connections.
- Active, legal, selected-route, and arrival states.
- Red, Blue, and Yellow printed Threat markers.
- Stat-coloured recurring and direct challenge markers.
- A separately framed revealed persistent encounter.
- Public player-piece clusters for one to six operatives.
- Compact reach and challenge legends.

Development fixtures:

- `/tv?cartographyFixture=route`
- `/tv?cartographyFixture=challenge`
- `/tv?cartographyFixture=dense`

No old tile artwork, new raster artwork, Canvas, WebGL, or private projection is used.

During normal play the TV selects this same schematic when the public `hostView.mode` is `map`. The live route, legal destinations, player locations, printed Threat lanes, recurring challenges, and revealed persistent encounters come only from the public server projection.

## Board-tile approval variant

An isolated development-only design is available for visual approval:

- `/tv?cartographyFixture=route&cartographyDesign=board-tiles`
- `/tv?cartographyFixture=challenge&cartographyDesign=board-tiles`
- `/tv?cartographyFixture=dense&cartographyDesign=board-tiles`
- `/tv?cartographyFixture=inner&cartographyDesign=board-tiles`

The variant arranges the same 49 canonical sectors as a contiguous 24/16/8/1 nested board. Tiles use a 13:10 footprint, making them 30% wider than the initial square prototype without stretching artwork, type, or icons. Tile faces use neutral, desaturated iron-and-stone material so Red, Blue, and Yellow remain confined to the printed Threat band at the bottom edge. Thick material rails, direct reach plaques, and a raised Core frame distinguish the Outer, Middle, Inner, and Core tracks without introducing new gameplay colour meanings. Each tile uses its registered Signal Cartography environment thumbnail, original hazard and challenge symbols, route/gate framing, and the existing public operative state. Ordinary track adjacency follows `RIFTFALL_BOARD_NODES`; non-adjacent authored connections remain visible as restrained etched links.

The active operative's public Contract destinations receive a green mission beacon. Ordered route Contracts mark only the next unfinished stop; other players' destinations are not promoted as the active target. The marker is derived only from public TV fields already used by the legacy board mission markers and does not reveal private rivalry objectives or phone-only choices.

Tile occupants now use six image-generated physical coin identities matching the stable Beacon, Bastion, Lantern, Harrow, Reliquary, and Compass Signal Pieces. A player-colour ring remains separate from the coin artwork. Active public mission targets use image-generated Route, Challenge, Hunt, or Service coins selected from the authoritative public Contract objective type.

This query does not change the normal `SignalCartographyPrototype` default. Production and live map requests continue to use the approved schematic until the board-tile variant receives explicit approval.

Browser captures:

- `.tmp-playtest/signal-cartography-board-tiles/route-1920x1080.png`
- `.tmp-playtest/signal-cartography-board-tiles/challenge-1366x768.png`
- `.tmp-playtest/signal-cartography-board-tiles/dense-1600x900.png`
- `.tmp-playtest/signal-cartography-board-tiles/inner-1920x1080.png`

## Motion

Normal motion uses a short opacity/transform reveal and route emphasis based on the existing host motion tokens. Reduced motion removes interpolation and presents the final schematic immediately.

The production transition is:

`Signal Theatre → relay iris reveal → Cartography → immediate critical-state return`

The map must return to Signal Theatre before encounter reveals, tests, battles, results, services, handoffs, final stage, victory, or defeat.

The host-view revision is presentation-only and is not serialized into save state. A connected or reconnecting client receives the current room view. A restored server starts safely in Signal Theatre.

## Evidence

Browser captures:

- `.tmp-playtest/s21-gameplay-map-review/phone-cartography-320x568.png`
- `.tmp-playtest/s21-gameplay-map-review/phone-cartography-384x722.png`
- `.tmp-playtest/s21-gameplay-map-review/phone-cartography-430x932.png`
- `.tmp-playtest/s21-gameplay-map-review/tv-route-1366x768.png`
- `.tmp-playtest/s21-gameplay-map-review/tv-route-1600x900.png`
- `.tmp-playtest/s21-gameplay-map-review/tv-route-1920x1080.png`
- `.tmp-playtest/s21-gameplay-map-review/tv-challenge-1366x768.png`
- `.tmp-playtest/s21-gameplay-map-review/tv-dense-1600x900.png`
- `.tmp-playtest/s21-gameplay-map-review/tv-dense-1920x1080.png`

Physical S21 capture:

- `.tmp-playtest/s21-gameplay-map-review/s21-cartography-prototype.png`

All measured prototype viewports had no document overflow. The S21 map action measured 44 CSS pixels high.

## Production verification

- The server accepts map requests only from an authenticated joined phone seat.
- Seat identity is checked against the submitted request.
- Critical presentation rejects the request with a public-safe reason.
- A map already on screen returns automatically when the authoritative state becomes critical.
- Reconnect receives the current host view without replaying the reveal.
- Restoring a saved game defaults to Signal Theatre.
- The projection contains no hidden Threat bag, unrevealed card, mission, inventory, reaction, or private-choice data.
