# Host TV Admin Map Inspector Audit

## Outcome

The host TV now exposes a read-only **Map Inspector** beside the Admin Library. It renders the active canonical board, normalizes topology and authored tile content, audits the live tile-art manifest, and sends detached movement simulations through the same exact-distance planner used by gameplay. It does not dispatch an intent or mutate a session.

## Canonical source audit

| Concern | Canonical source | Inspector treatment |
|---|---|---|
| Board nodes, rings, labels, adjacency | `src/data/riftfallBoardNodes.ts` | 49 nodes loaded directly; no second board definition |
| Canonical sector encounter decks and danger | `src/game/data/canonicalSectorGraph.ts` | Hazards, enemies, anomalies, Contracts, Artifacts, and escalations normalized by stable ID |
| Named tile rules, tags, gates, and movement requirements | `src/game/data/boardSpaces.ts` | Rule text, services, required notes, allowed origins, and blocked copy shown |
| Exact-distance routes and movement restrictions | `src/game/rules/movementPlanner.ts` | `buildMovementRoutePlan` and `getMovementStepBlockReason` run against detached synthetic state |
| Rendered tile positions and route anchors | `src/client/tv/boardTileLayout.ts` | Used without copying or recalculating positions |
| Runtime tile artwork URLs | `src/client/tv/tileAssetManifest.ts` | Existing URL manifest used; source path derived as `public` + runtime URL |
| Authored tile challenge | `content/tile-challenges/rift-whispers-ashen-chapel.json` | Attached to `ashen-chapel` and cross-linked to Admin Library |

Ring membership is an explicit node field. Connections are adjacency IDs. Current `addConnection` behavior authors reverse links, so the active topology contains no one-way edges. Gates are represented structurally by destination `movementRequirements`; bridge and ferry are not canonical connection types in the current schema. The corresponding layers therefore report zero rather than inventing routes.

## Detected board inventory

| Ring | Tiles | Hazards | Challenges / anomalies | Enemies | Shops / services |
|---|---:|---:|---:|---:|---:|
| Outer | 24 | 45 | 14 | 69 | 6 |
| Middle | 16 | 37 | 39 | 75 | 2 |
| Inner | 8 | 18 | 23 | 38 | 0 |
| Center | 1 | 0 | 0 | 0 | 0 |
| **Total** | **49** | **100** | **76** | **182** | **8** |

The counts above are tile assignments, not unique card counts; the same authored card can correctly appear in multiple sector decks.

## Topology audit

- 49 canonical tiles.
- 64 undirected legal connections / 128 directed adjacency entries.
- Connection types: 51 normal, 10 ungated ring transitions, 3 gated ring transitions.
- One-way connections: 0.
- Invalid destination IDs: 0.
- Duplicate rendered positions: 0.
- Structurally unreachable tiles: 0.
- The interactive audit categories can focus invalid, one-way, missing-art, duplicate-art, or unreachable tiles.
- A QA-only query fixture (`mapAuditFixture=warnings`) proves invalid and missing-art presentation without altering canonical data.

Reachability on demand uses the production movement step gate check and an administrator-selected permission profile. Closed gates retain the production blocked reason. Alternate exact-distance paths are listed independently and drawn from their actual route nodes and route anchors.

## Tile artwork audit

- Active artwork folder: `public/assets/map/tiles/`.
- 36 unique PNG files are referenced by 49 tiles.
- Every active source image is 1254 × 1254 pixels (1:1).
- File sizes range from 2,766,870 to 3,676,367 bytes; mean 3,343,918 bytes.
- Missing canonical tile-art references: 0.
- 30 tiles participate in a repeated artwork reference. These are flagged as duplicate references, not treated as missing files.
- Rendered dimensions are measured from the actual board image element. Selected-tile inspection reports source size, rendered size, format, file size, scale percentage, aspect ratio, and `object-fit` crop status.
- At the reviewed viewports source images were substantially downscaled; no tile was upscaled. Square source images are cropped where the canonical board geometry is rectangular, and that mismatch is reported explicitly.

No legacy or reference-only map asset was found connected to the active tile manifest.

## Read-only movement safety

`buildAdminMovementSimulation` creates a detached minimal `GameState` with one synthetic seat, the canonical sector graph, a selected location, selected notes, and a movement roll. It calls `buildMovementRoutePlan` directly. Tests fingerprint the state before and after the call and require byte-identical serialized state. The Map Inspector imports no command dispatcher, sends no intent, and provides no client-side mutation path.

The simulation does not open gates, consume rolls, move a player, draw content, trigger arrival rules, or add log entries. It previews legal and blocked routes only.

## Admin Library integration

- Map content cards open their existing Admin Library record.
- Admin Library cards now list canonical map tile references when present.
- Selecting a tile reference returns to Map Inspector focused on that stable tile ID.
- Generated board functions such as Shop or Recovery are displayed as board-authored records and do not pretend to be Library cards.

## Browser screenshot review

All screenshots are under `reports/ui/admin-map-inspector/`.

| Screenshot | Viewport | Review result |
|---|---:|---|
| `artwork-full-board-1920x1080.png` | 1920×1080 | Complete board, dominant artwork, no horizontal overflow |
| `selected-tile-1920x1080.png` | 1920×1080 | Focused tile, connected neighbors, source and image details readable |
| `connection-view-1920x1080.png` | 1920×1080 | Artwork recedes; topology remains legible and attached to route anchors |
| `movement-route-1920x1080.png` | 1920×1080 | Exact route, ordered steps, alternatives, and blocked count visible |
| `content-view-1440x900.png` | 1440×900 | Tile content markers remain associated with their tiles |
| `image-audit-1440x900.png` | 1440×900 | Natural dimensions, format, and warning glyphs readable |
| `fitted-board-1280x720.png` | 1280×720 | Board fits without browser-level horizontal scrolling |
| `long-content-1280x720.png` | 1280×720 | Inspector scroll contains long rules without clipping the board surface |
| `audit-warnings-1280x720.png` | 1280×720 | Missing-art fallback and invalid-destination warning remain readable |

The first screenshot pass found that the first movement route leaked into Artwork, Content, and Image Audit modes, and that the controls rail retained a Movement Test scroll offset after switching views. The corrective pass confines route emphasis to Movement Test, resets zoom/pan and the rail position on view changes, aligns the inspector with the selected movement start, and splits camel-case layer labels into player-readable words. The final capture reported 49 rendered tiles, zero canvas elements, zero horizontal overflow, and no browser console or page errors at every requested viewport.

## Representation limits

- The current canonical model has no bridge or ferry connection type; those audit layers are intentionally empty.
- Directionality is adjacency-based. There is no richer authored direction label beyond whether the reverse adjacency exists.
- Original image byte size and natural dimensions are browser-loaded metadata rather than authored JSON fields, so they populate after image load.
- The QA invalid-link and missing-art state is development-only and never changes canonical topology or assets.

## Verification record

Focused validation covers full board rendering, canonical positions, two-way and synthetic one-way detection, invalid destinations, missing art, duplicate positions, content search, image dimensions and crop status, movement planner reuse, blocked gates, alternate routes, non-mutation, Admin Library cross-links, host-only exposure, and absence of canvas/Three.js/game dispatch.

The complete command results are recorded in the task completion response after the final repository verification pass.
