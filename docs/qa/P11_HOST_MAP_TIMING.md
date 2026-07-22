# P11 Host Map Timing and Performance

## Motion contract

P11 does not change authoritative movement or encounter timing. The server advances gameplay exactly as before; the host map observes projected state.

- Sector-brief entrance: 180 ms presentation transition.
- Sector focus change: immediate content replacement within the same bounded shell.
- Active operative: restrained presentation pulse at the established handoff state; no gameplay callback.
- Route travel: unchanged P2/P10 segment timing and canonical path.
- Arrival beat: unchanged P10 non-blocking visual hold.
- Encounter handoff: brief removed as soon as focused encounter presentation owns the screen.
- Reconnect: stable state appears directly; completed movement does not replay.

With `prefers-reduced-motion: reduce`, brief movement and active pulsing are removed. Focus changes use static/fade presentation, while route, sector, occupant, and consequence information remain identical.

## Bounds and stability

| Viewport | Captures | Maximum brief width | Maximum brief height | Overflow |
|---|---:|---:|---:|---:|
| 1366x768 | 10 | 296 px | 266.66 px | 0 x / 0 y |
| 1600x900 | 10 | 352 px | 367.02 px | 0 x / 0 y |
| 1920x1080 | 10 | 352 px | 405.50 px | 0 x / 0 y |

The 1366 layout hides low-priority lore, tags, and expanded service copy before compromising route or tile visibility. The full board remains in frame and no camera zoom was introduced.

## Rendering controls

- Canonical sector lookups and the computed brief are memoized.
- Existing route geometry is reused.
- Sector focus does not load another copy of tile artwork.
- The brief uses no full-board blur or continuous filter.
- Mission density is capped visually with stable grouping.
- Marker keys remain stable seat IDs.
- No listeners or timers are created per sector selection.
- All seven recordings completed without console errors or observable stale overlays.

The capture harness waits on stable authoritative elements rather than transient animation class names. It records WebM outside runtime assets and closes every browser context.
