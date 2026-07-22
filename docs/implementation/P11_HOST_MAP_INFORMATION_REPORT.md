# P11 Host Board and Map Information Report

## Outcome

P11 is complete as a bounded presentation change. The shared TV board now explains the current or selected canonical sector without adding another gameplay state machine, changing topology, or shrinking the map into a secondary surface.

The implementation remained uncommitted and unpushed. It was developed on `ui/tv-movement-focus-mode` from `6bd4fc05a292df3749d024070260c27cf61c517a`. The 99 dirty paths present before P11 were preserved.

## Architecture

### Previous board-information architecture

`TvApp` rendered `TacticalMapPanel`, then `TacticalMapBoard`, `BoardMap`, and `TalismanBoardSurface`. Canonical tile content and public game state already reached the board, but the command-board configuration disabled the legacy sidebar and supplied no compact replacement. Players could see markers and routes, but not a couch-readable explanation of the relevant sector. Active identity depended mainly on a small initial, border, and glow.

### Final host map projection

`buildHostMapSectorBrief` is a pure presentation adapter. It joins the canonical `boardSpaces` definition with the existing public TV patch and authoritative movement-planner output. It does not calculate movement legality, encounter outcomes, objective progress, or private availability.

Ownership remains explicit:

- Sector name, region, lore, tags, authored challenge, services, and connection wording come from canonical content.
- Operatives and their locations come from the server-projected player list.
- Route, distance, destination, special segment, and selected-destination state come from the authoritative movement planner.
- Scenario, mission ownership, face-up encounter state, and public threat state come from existing public projections.
- Focus and visual placement are local presentation concerns only.

The adapter uses an allow-list of public labels. Unknown metadata is omitted rather than shown as a raw stable ID. The host brief never receives private inventory, Salvage, Scar choices, hidden rewards, private Contract details, or Rivalry agendas.

### Files changed for P11

- `src/client/tv/hostMapPresentation.ts`
- `src/client/tv/HostSectorBrief.tsx`
- `src/client/tv/BoardMap.tsx`
- `src/client/tv/TacticalMapBoard.tsx`
- `src/client/tv/TvApp.tsx`
- `src/client/tv/TalismanBoardSurface.tsx`
- `src/client/tv/__tests__/BoardMap.test.tsx`
- `src/client/styles.css`
- `scripts/capture-p11-host-map.ts`
- `docs/design/ASHENREACH_HOST_MAP_INFORMATION_SPEC.md`
- P11 implementation and QA documents under `docs/implementation` and `docs/qa`
- `docs/plans/P9_CROSS_SYSTEM_UX_BACKLOG.md`

No protocol, save-schema, engine, topology, movement-planner, encounter, scenario-rule, objective-rule, or economy file was changed for P11.

## Active operative and occupants

The active token now combines a static outer outline with a text flag (`Active · player name`). This remains identifiable without color and over both bright and dark tile art. Reduced motion removes animated emphasis while retaining the outline and label.

Other operatives remain compact and use stable seat ordering. The selected-sector brief expands occupants into readable rows with player display name first and operative name second. Four- and six-operative stacks preserve identity without rendering large portraits over the tile.

Public mission markers retain canonical seat color, seat number, initial, pattern, and accessible label. Dense same-sector mission markers now show the first two stable-seat markers and a `+N` group marker, reducing obstruction while retaining the full selected-sector roster and public ownership context.

Public scenario objects, shop/service state, printed challenges, and the currently public face-up encounter are represented through their existing marker families and the selected-sector brief. Persistent encounter identity is shown only when the server currently projects it as public. The client does not retain or invent a persistent encounter after that state ends.

## Sector brief

The brief appears for the active operative's current sector, a selected destination, route focus, and arrival focus. It yields entirely to focused battle, encounter, discovery, and shop presentations.

Its hierarchy is:

1. Focus state and sector identity
2. Immediate public consequence or route context
3. Active operative and occupants
4. Challenge, face-up threat, shop/service, objective, scenario, or connection
5. Short lore
6. Secondary public tags

Empty values produce no headings or blank containers. Long names and public copy wrap inside a bounded panel. At 1366x768, lore, secondary tags, and service detail are compressed before the board is reduced. The brief chooses the opposite side of the board from the selected node where possible and does not accept pointer input over the map.

The prior destination-summary portion of the movement HUD is visually suppressed while the new sector brief is present. Roll, route, and travel timeline remain visible. This removes duplicate destination prose without removing movement state or changing the DOM contract used by existing tests.

## Routes and map context

Destination A/B/C markers remain the primary movement choices. Selecting a destination causes the brief to follow the server-selected destination and show its canonical name, region, route length, and public risk/opportunity summary. The route line and selected marker remain visible.

Gate, bridge, special-connection, and cross-ring context come only from canonical route metadata or authored board content. The QA archive includes Guardian Span gate/cross-ring context and Ashwake Crossing bridge context. No canonical ferry metadata exists in the current repository, so P11 neither invented a ferry route nor fabricated a ferry screenshot.

Movement timing and route geometry are unchanged. On arrival, the brief follows the arrived sector for the existing readable arrival beat. It yields when encounter focus begins, and reconnect restores the stable authoritative destination/current-sector state rather than replaying completed travel.

No camera zoom or free pan was added. The full outer ring remains visible at all three supported viewports.

## Scenario, objectives, and public threats

The board continues using existing public mission and scenario projections. The brief adds public-safe ownership/relevance labels without mission text, private targets, or hidden progress. Several markers on one sector retain stable seat order and distinct identity.

Threat and challenge presentation is deliberately factual: printed challenge, public encounter category/count, or a public shop-blocked condition may be shown only when supplied by canonical/public state. The brief does not predict a draw, promise stock, or identify an unrevealed card.

Terminology remains presentation-only. Stable IDs are never used as player copy. The serialized/rendered tests reject internal identifiers and private terms.

## Responsive, performance, and accessibility QA

The board was captured at 1366x768, 1600x900, and 1920x1080. Thirty screenshots cover ten deterministic live states. Seven WebM recordings cover overview, preview changes, travel/arrival, encounter focus, handoff, reconnect, and reduced motion.

Measured maximum brief bounds:

| Viewport | Width | Height | Page overflow |
|---|---:|---:|---:|
| 1366x768 | 296 px | 266.66 px | 0 x / 0 y |
| 1600x900 | 352 px | 367.02 px | 0 x / 0 y |
| 1920x1080 | 352 px | 405.50 px | 0 x / 0 y |

No continuous board blur, camera interpolation, duplicate image loading, or timer-driven gameplay behavior was added. Stable canonical maps and the sector brief are memoized. Browser QA reported zero console/page errors and zero forbidden private/internal text matches.

Accessibility details include semantic headings, a labelled sector region, text-plus-shape active identity, readable occupant names, route text alternatives, accessible mission marker labels, safe long-name wrapping, and complete reduced-motion information.

## Four-seat critique

### New player

The active flag and current-sector brief make the acting operative and relevant tile immediately discoverable. Phone destination names match the TV destination brief. Special links are described only when authoritative. The main remaining learning constraint is that an unrevealed Threat remains intentionally unknown.

### Optimizer

Route length, region transition, public challenge, occupants, service, and mission relevance are visible without hiding route geometry. The first implementation duplicated destination information and allowed six mission markers per tile; screenshot review led to suppressing the duplicate HUD detail and grouping dense markers.

### Family/casual player

The compact panel is readable at couch distance and does not create a full-height rail. At 1366x768, secondary lore and tags yield to gameplay facts. Six-player density is materially lower after marker grouping, while the selected-sector occupant roster preserves identity.

### Rules lawyer

Every displayed rule originates from canonical content or the public server projection. Unknown connection metadata is omitted. Reconnect and focus precedence prevent stale route/sector claims. The brief never implies guaranteed stock or a hidden encounter. No ferry representation was invented without a canonical ferry.

## Verification

- Content validation: passed; canonical catalogs validated.
- Typecheck: passed.
- Focused host-map/sector/occupant/privacy tests: 20/20 passed in `BoardMap.test.tsx`.
- Focused TV application regression set: 73/73 passed.
- Topology and route tests: 150/150 passed.
- Client suite: 410/410 passed across 48 files.
- Integration suite: 353/353 passed independently across 40 files in 111.62 seconds; no server implementation was changed by P11.
- Engine/rules suite: 763/763 passed across 70 files.
- Aggregate suite: 1,526/1,526 passed across 158 files in 379.35 seconds.
- Production build: passed; 560 modules transformed.
- Asset audit: 435/435 present, 0 missing.
- Browser QA: 30 screenshots, 7 recordings, 10 states, 3 viewports, 0 overflow, 0 console/page errors.
- Reduced motion: passed with the same information and static emphasis.
- Diff checks: passed after implementation.
- Ports 5173 and 8080: closed after QA.
- Commit/push: none.

Topology, geometry, route legality, movement timing, encounter behavior, scenario mechanics, objective mechanics, privacy boundaries, command authority, save version 2, and legacy compatibility remain unchanged.

## Concrete remaining risks

- The runtime does not expose a canonical ferry connection, so ferry presentation cannot be validated until such content exists.
- Persistent encounter identity is not retained as a general sector occupant outside the currently public encounter lifecycle; adding that would require an authority/projection task, not a client inference.
- Very large future public-object counts may require a generalized marker-clustering policy. Current six-player and mission-density states fit all supported viewports.
- Active player display names are not guaranteed unique; seat pattern/number and operative secondary identity remain necessary disambiguators.

The next evidence-ranked slice is Quest, Contract, and private-agenda presentation, with privacy authority reviewed before visual expansion.
