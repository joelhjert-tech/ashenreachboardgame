# Host TV Image Containment Audit

## Scope and outcome

Host TV artwork now uses one bounded rendering primitive instead of relying on
the natural dimensions of each source file. The audited Host surfaces pass
browser containment checks at 1920×1080, 1440×900, 1280×720, and the unusual
1600×700 probe without image overflow or horizontal document scrolling.

This work does not change gameplay state, public/private projection, movement
geometry, save data, or phone presentation.

## Root causes found

- Host artwork was rendered through several unrelated `<img>` patterns with
  different sizing and error behavior.
- Some flex and grid children did not establish `min-width: 0` and
  `min-height: 0`, allowing a large intrinsic image size to influence tracks.
- Shop artwork, category icons, battle art, map tiles, and Admin previews used
  presentation-specific rules rather than a shared containment boundary.
- Image decode and missing-art states did not always reserve the same frame as
  the final artwork.
- Browser sub-pixel rounding initially let a portrait extend roughly 1.7 px
  beyond its frame. Pinning the image absolutely to `inset: 0` removed that
  final measured overflow.

## Shared component

`HostImage` provides:

- `contain` and `cover` fit modes;
- card, portrait, square, map-tile, wide, and natural frame ratios;
- an optional CSS `object-position` focal point;
- stable loading, missing-source, and failed-decode states;
- card, portrait, map, and icon fallback identities;
- a wrapper that reserves geometry before image decode and clips the image to
  its assigned frame.

The shared CSS pins the child image outside normal layout flow, constrains it to
100% of both frame dimensions, and keeps the fallback in the same reserved
space.

## Host surfaces migrated

- Lobby/setup scenario presentation and operative setup portraits
- Main-board operative portraits, active-location preview, scenario art,
  Nemesis presentation, Contract miniatures, card reveal, and encounter art
- Battle operative portrait, enemy/card artwork, and card backs
- Full-screen Host Shop category icons and product carousel cards
- Canonical board tile artwork
- Admin Card Library grid and inspector
- Admin Card Editor current, unsaved, and replacement previews
- Admin Map Inspector tiles and source-art preview

Inventory, victory, loss, and other Host states that reuse these shared
operative/card/encounter presenters inherit the same image constraints.

## Fit decisions

### Contain

- Card art and card backs
- Equipment and shop product cards
- Scenario sheets and Contracts
- Admin Library art
- Admin Card Editor previews
- Admin Map Inspector source preview
- Shop category icons

### Cover

- Operative and Nemesis portraits, using a top-biased focal point where needed
- Canonical map tile art inside fixed board geometry
- Active location previews
- Decorative lobby and scene artwork remains a detached CSS background layer
  and uses cover semantics without entering flex/grid flow

## Custom focal positions

`HostImage` accepts any valid CSS `object-position` value through `focalPoint`.
Operative, player-card, battle, and Nemesis portraits currently use `50% 14%`
to protect faces and head silhouettes. Gameplay card artwork uses centered
containment so meaningful card content is never cropped.

## Intentional exception

`BoardStage` retains its direct board `<img>`. Its natural image dimensions are
read to calculate the letterboxed board rectangle used by route and marker
geometry. The image already lives inside a clipped fixed stage and is the only
direct Host TV `<img>` outside `HostImage`. Replacing it without preserving
that geometry contract would risk moving canonical overlays.

## Oversized runtime sources

Compression was deliberately not included. The largest audited files include:

| Size | Dimensions | Asset |
|---:|---:|---|
| 3.69 MB | 1254×1254 | `riftfall/board/tiles/outer/outer_frozen_plains.png` |
| 3.62 MB | 1024×1536 | `riftfall/cards/route-notes/card_back_route_note.png` |
| 3.62 MB | 1024×1536 | `cards/backs/card_back_character.png` |
| 3.61 MB | 1254×1254 | `riftfall/board/tiles/outer/outer_ice_world.png` |
| 3.57 MB | 1024×1536 | `riftfall/cards/artifacts/card_back_artifact.png` |
| 3.56 MB | 1254×1254 | `cards/contracts/cartel-exposed-object.png` |
| 3.54 MB | 1254×1254 | `riftfall/board/tiles/middle/middle_void_shield_generator.png` |
| 3.51 MB | 1254×1254 | `map/tiles/map_tile_back.png` |

These source dimensions no longer affect rendered layout dimensions.

## Browser QA

The automated capture traverses real Host and phone flows, applies QA fixtures
through the server, and checks every `.host-image-frame` image rectangle
against its frame with a 1.5 px tolerance. It also rejects horizontal body or
document overflow.

Captured states:

- lobby
- character selection
- main board
- battle
- encounter card
- shop categories
- shop carousel
- Admin Library, including visible missing-art placeholders
- Admin Map Inspector

Screenshots are stored in `reports/host-image-qa/`. The focused shop archive is
stored in `reports/host-shop-qa/`.

Manual review confirmed useful containment for square map sources, tall card
sources, wide lobby art, operative portraits, missing art, selected shop art,
and long shop text. The first browser pass exposed the portrait sub-pixel
overflow and an inherited shop grid centering rule; both were corrected before
the final captures.

The 1600×700 probe also exposes pre-existing compact-height battle typography
pressure. It does not cause image overflow or horizontal scrolling and was not
expanded into a battle-layout redesign in this image-containment task.

## Tests and validation

- `HostImage` unit coverage verifies explicit fit/ratio classes, focal points,
  absent sources, and failed-decode fallback.
- Host Shop coverage verifies authoritative category/card rendering, selected
  product state, privacy, and transaction presentation.
- Admin coverage verifies Library and Map Inspector rendering.
- `TvApp` coverage verifies the migrated Host surfaces continue to select the
  correct authoritative state.
- Browser QA verifies actual image/frame rectangles and viewport overflow at
  all four viewport sizes.

Final results:

- `npm.cmd run validate:content` — passed (18 characters, 71 gear, 109
  threats, 36 contracts, 20 anomalies, 30 artifacts, 24 followers)
- `npm.cmd run typecheck` — passed
- `npm.cmd run test:client` — 40 files, 365 tests passed
- `npm.cmd run test:engine` — 68 files, 747 tests passed
- `npm.cmd run test:integration` — 34 files, 303 tests passed
- `npm.cmd run audit:assets` — 426/426 present; zero missing, invalid,
  placeholder, or release-blocking assets
- `npm.cmd run build` — passed
- containment browser QA — 10 states, 40 screenshots passed
- `git diff --check` and `git diff --cached --check` — passed (line-ending
  notices only)

The repository's aggregate test command combines the client, engine/rules, and
integration directories above. Its constituent suites were run independently
after the combined wrapper exceeded its execution budget under contention.

No commit was created.
