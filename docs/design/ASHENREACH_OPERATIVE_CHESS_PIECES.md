# Ashenreach Operative Chess Pieces

## Production direction

Signal Theatre uses a family of six **Signal Pieces** as its production marker system. Players choose Beacon, Bastion, Lantern, Harrow, Reliquary, or Compass during operative selection. The choice is public presentation identity: it is saved on the authoritative seat, restored on reconnect, and has no mechanical meaning.

The pieces share blackened relic metal, pale ceramic inserts, restrained cyan signal light, a portrait aperture, and a wide industrial base. Their distinct silhouettes—not colour swaps—make them recognizable at TV distance.

## Piece anatomy

- **Base:** black iron plinth, high-contrast player-colour rim, non-colour heraldry symbol, initials, and a grounded shadow.
- **Identity:** six stable colour/symbol pairings: circle, diamond, triangle, cross, hexagon, and split shield. Seat order, not transient render order, determines the pairing.
- **Body:** one of six original transparent Signal Piece renders, framed and animated by React/CSS.
- **Portrait:** the existing operative portrait is framed at runtime by `ArtworkFrame`; source art is never edited. Missing portraits show a compact AR fallback with the operative name retained accessibly.
- **Topper:** the selected piece owns a fixed non-mechanical silhouette: split crown, bastion, caged halo, fork, shield, or four-point compass.
- **Labels:** initials remain on the base. The active nameplate shows player and operative. The compact public roster preserves every player, operative, and location.
- **Active state:** elevated scale, high z-order, outer ring, stronger base light, and a short one-shot pulse. No continuous flashing is used.

## Deterministic formations

| Occupants | Formation |
|---|---|
| 1 | Centered |
| 2 | Diagonal pair |
| 3 | Triangle |
| 4 | Wide two-by-two square |
| 5 | Open radial cluster |
| 6 | Compact arc/radial cluster |

Formation order is stable seat order. The active piece receives z-index 100 and a 10% scale increase. Five- and six-occupant sectors add a compact occupant count. Focused formations use the full authored spread; compact mode contracts toward the center without reordering.

## Authoritative movement

The presentation consumes only the prior server movement planner, the new public patch, and the exact server-authored route. It cannot dispatch commands or create gameplay state.

```text
authoritative sector change
→ 300 ms departure lift
→ each canonical route sector
→ 520 ms ordinary segment / 680 ms ring-crossing segment
→ 600 ms arrival hold
→ encounter or next public state
```

The environment changes with each route sector. Arrival keeps the piece visible while the destination ring expands once. Encounter and result framing wait visually for the arrival beat, but server resolution is never delayed.

The lower journey track is drawn from the exact authoritative route. Six deterministic path families replace the former straight preview line: fracture, switchback, rising arc, sunken arc, relay zigzag, and broken crown. Every sector path has six small way-stops and one larger central event stop. The current sector selects presentation geometry only. Cross-ring travel always receives the broken-crown profile and a warm boundary colour.

The active piece remains at the central event stop while a tile event, challenge, battle, or stable turn state is active. On the next server-confirmed movement it departs from center to the edge. Intermediate route sectors enter from one edge and cross without implying a gameplay stop. The final sector enters from the edge and lands at center. The piece uses a restrained walking bob only while its authoritative movement presentation is active; stable and reduced-motion states never pulse continuously.

Reconnect begins from the stable authoritative sector with no route replay. Reduced motion removes lift, glide, rotation, and pulse while preserving destination, active ring, labels, and arrival state.

## Signal Theatre environments

Signal Theatre does not use legacy board-tile art. It resolves 49 original wide sector environments:

- 24 outer-reach environments with broader horizons and exposed industrial terrain.
- 16 middle-reach environments with denser structures and stronger signal pressure.
- 8 inner-reach environments with relic machinery and less natural geometry.
- 1 center environment for the final convergence.

The canonical sector ID selects the environment. Movement topology remains authored gameplay data and is not inferred from an image.

## Rendering and accessibility

- React, inline route SVG, generated transparent piece PNGs, CSS transforms, and existing motion tokens only.
- No Canvas, Three.js, WebGL, external models, or runtime textures.
- Every piece exposes public player name, operative name, active state, player symbol, and stable formation order.
- Portrait alt text uses the operative name.
- Colour is never the sole identity channel.
- Long active labels wrap within a bounded nameplate.
- The occupant summary exposes all public names semantically.
