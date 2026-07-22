# Ashen Reach Host Map Information Specification

## P11 pre-edit architecture audit

This audit was completed before P11 implementation edits. The repository was on `ui/tv-movement-focus-mode` at `6bd4fc05a292df3749d024070260c27cf61c517a`, with 99 pre-existing dirty paths. Those paths are preserved and P11 remains uncommitted.

### 1. Current board architecture

The live TV command board renders `TacticalMapPanel` in `TvApp.tsx`. Its normal map surface is `TacticalMapBoard`, a deliberately thin wrapper around `BoardMap` with the legacy header and sidebar disabled. `BoardMap` places `TalismanBoardSurface` inside the shared `BoardStage`, using canonical `RIFTFALL_BOARD_NODES`, `boardSpaces`, tile layout geometry, and the existing adaptive image layer.

The map already receives authoritative public state for sectors, players, movement planning, scenarios, Contracts, tile arrival, and encounters. It renders player markers, mission markers, scenario effects, destination markers, movement routes, ring-transition badges, printed threat icons, shop lock state, and center confrontation state. Focused battle and shop modes yield the board to their established overlays. P10's movement presentation keeps the board visible through travel and delays encounter focus until the visual journey settles.

There is no live permanent information rail: `TacticalMapBoard` passes `showSidebar={false}`. `BoardMap` still contains a legacy bounded bottom/sidebar implementation used by direct component tests and administrative contexts, but the command board does not expose it.

### 2. Current sector-information architecture

Canonical sector identity and authored rules come from `boardSpaces` and the fixed board-node registry. Live public sector state comes from `PublicPatchPayload.sectors`. `BoardMap` currently joins those sources locally for presentation. Selected-sector state is local view state: it follows the active operative by default, follows the server-selected movement destination during planning, and can be changed by selecting a board tile.

The disabled legacy sector brief contains useful information, but its hierarchy is too broad for the live command board. It includes full text, lore, tags, choices, route copy, gate requirements, challenge icons, occupant count, and region. Some gate copy can fall back to internal note keys. This is unsuitable for the P11 public TV surface. The live board therefore lacks a compact, bounded current/destination sector explanation even though the necessary public data is already available.

Duplicated or low-value information found:

- Tile ring labels repeat region information on every tile.
- The disabled legacy brief repeats long authored text and secondary lore before immediate consequences.
- A separate board legend permanently consumes vertical space on ordinary map states.
- The former active-operative overlay is suppressed in the command-board stylesheet, leaving only the small token highlight.

Missing or undersized information found:

- Current operative identity is only a small circular initial and a tiny `Current` tile badge.
- Occupant identity is visible only as initials; there is no compact selected-sector roster.
- The live command board has no sector brief for current location or selected destination.
- Public persistent encounter/challenge, shop/service, mission, scenario, and special-link context is not summarized together.
- Route lines are visible during selection, but their region or special-link meaning is not explained in bounded public text.

### 3. Current active-operative treatment

The active seat is derived from the authoritative `turnOrder[activeSeatIndex]`. `BoardMap` marks that operative's sector active and passes an `active` flag into its player marker. The active marker gains a gold border, glow, and small scale increase; the tile also gains active/current classes and a `Current` badge. The marker uses the player's display-name initial and seat color.

This treatment is structurally correct but insufficient at couch distance, especially on bright art, with several occupants, or at 1366x768. It relies heavily on color/glow, lacks an adjacent text label, and can be difficult to distinguish inside the two-column marker stack. The command board's separate `ActiveOperativeOverlay` is intentionally hidden by current CSS, so it cannot compensate.

### 4. Current occupant treatment

Operative occupants originate from `patch.players`, are grouped by sector, sorted in stable seat order, and rendered as compact circular markers. The component supports multiple operatives without unstable keys because markers use stable seat IDs. A fallback numeric occupant count exists when no detailed marker data is supplied.

Public mission markers are separately grouped by sector and stable seat order, with seat color, initial, seat number, and border pattern. Nemesis and scenario objects use separate marker families. Printed threat icons and threat-blocked shop status are derived from public sector/canonical data. The selected-sector live view does not currently expand public occupant names or distinguish all public occupant families in prose.

### 5. Current public/private projection

The TV consumes `PublicPatchPayload`. Player locations and display names are public. Movement destinations and routes are server-authored and include public names, route names, distance, tags, threat icons, ring-transition metadata, shop/service summaries, occupants, and only public face-up encounter data. Scenario markers use public scenario/Nemesis state. Mission markers are derived only from the public Contract catalogue and public-safe destination relevance already present in the patch.

Private hands, notes, item choices, Scar choices, hidden rewards, Rivalry agendas, private Contract objectives, and hidden encounter identities are not required for P11 and must not enter its presentation adapter. P11 will not add a server state machine or client legality inference. It will only summarize already-authoritative public data and canonical authored sector definitions.

### 6. Files expected to change

The smallest likely implementation touches:

- `src/client/tv/BoardMap.tsx` for compact public sector presentation and focus selection.
- `src/client/tv/TalismanBoardSurface.tsx` for accessible active/stacked marker presentation.
- A small new TV presentation adapter/component if it prevents BoardMap from accumulating display logic.
- `src/client/styles.css` for bounded overlays, marker hierarchy, responsive behavior, and reduced motion.
- Focused TV tests under `src/client/tv/__tests__`.
- The existing deterministic QA fixture only if current public fixture states cannot express required P11 screenshots.
- P11 design, implementation, QA, timing, accessibility, and backlog documentation.

No game rule, topology, movement planner, protocol, or save-schema file is expected to change.

### 7. Smallest viable implementation

1. Build a pure, memoized host-map presentation adapter from `PublicPatchPayload` plus canonical board definitions.
2. Add a compact sector brief inside the existing board shell, showing only non-empty public fields and yielding during battle, shop, and encounter focus.
3. Make the active operative marker unmistakable with a bracket/name flag and static shape treatment, while keeping other markers compact and in stable seat order.
4. Summarize public occupants, current challenge/threat state, shop/service availability, public mission/scenario relevance, region, and special connection without exposing IDs or predicting hidden outcomes.
5. Keep A/B/C destination markers and authoritative route overlay primary during movement selection; the brief follows the server-selected destination.
6. Add responsive and reduced-motion styling, focused tests, deterministic fixtures only where needed, and browser QA.

### 8. Principal risks and controls

**Board obstruction.** A large rail or central overlay would shrink or cover the board. P11 uses a bounded corner brief with a strict height/width budget, pointer-safe placement, and responsive compression. It yields to focused encounters.

**Privacy.** Joining canonical content with player state can accidentally reveal private objectives or hidden encounters. The adapter accepts only the public patch and an allow-listed subset of canonical sector presentation. Tests serialize and render forbidden strings to prove absence.

**Stale overlays.** Local selection can outlive authoritative movement or encounter state. Focus precedence is explicit: encounter yields the brief; active route destination overrides manual selection; current operative restores after route/arrival completion; missing sectors clear safely.

**Performance.** Rebuilding every marker and route on every focus click can rerender all tiles. Stable maps, route geometry, and sector summaries are memoized; no continuous animation or full-board blur is added.

**Misleading rules.** Canonical tag or note keys are not player-facing. The brief uses authored public rule/error copy and a constrained label map for public connection categories. Unknown values are omitted rather than exposed or invented.

**Marker density.** Six players on one tile can obscure art and route anchors. Stable offset grouping, a clear active marker, and selected-sector roster details retain identity without full-card overlays.

## Presentation contract

The board remains primary. P11 presentation is a read-only interpretation of authoritative public state:

- Canonical content owns sector name, region, lore, tags, printed challenges, shops, services, and authored connection text.
- Server state owns active operative, occupants, selected movement destination, route sequence, face-up encounters, scenario state, and public objective state.
- The TV owns only focus and visual hierarchy.
- Empty values are omitted.
- Unknown internal values never fall through to player-facing text.
- Focused battle, encounter, and shop presentations take precedence over the sector brief.

## Host focus precedence

1. Focused battle/encounter/shop: sector brief hidden.
2. Arrival: destination/current-sector brief shown for the readable arrival beat.
3. Movement destination selected: destination brief plus authoritative route context.
4. Movement choices without selection: current-sector brief; A/B/C markers remain primary.
5. Ordinary turn, waiting, end turn, or handoff: active operative's current-sector brief.
6. No active operative or missing public sector: overview with no empty brief.
