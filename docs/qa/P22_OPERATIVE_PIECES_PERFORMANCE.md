# P22 Operative Pieces Performance

## Rendering

- React plus inline SVG and CSS transforms.
- No Canvas, WebGL, Three.js, external model, or runtime texture nodes.
- Stable identity and formation calculations are deterministic and bounded to six pieces.
- A sector change replaces one environment image; it does not rerender a legacy 49-tile board.
- Portrait URLs reuse the existing shared asset resolver and browser cache.
- Shadows use bounded CSS box shadows without large blur filters.

## Lifecycle

- Journey timers are owned by one hook and cleared on state revision, reduced-motion change, and unmount.
- Completed movement event IDs suppress replay for the mounted authoritative session.
- No global event listeners are added by the piece or journey implementation.
- The active piece alone receives the highest z-order and one-shot emphasis.

## Browser evidence

At 1366×768, 1600×900, and 1920×1080:

- 66/66 captures completed.
- 0 console or page errors.
- 0 overflow cases.
- 0 escaped pieces.
- 0 severe overlap pairs.
- 0 Canvas nodes.
- 0 legacy tile images rendered.
- Six-piece formation and handoff remained responsive.

All 49 environments are 1672×941. File sizes range from 1,835,403 to 2,597,690 bytes; total size is 111,353,470 bytes. Only the current sector environment is rendered.

The client stress suite, full client suite, production build, and browser navigation/reload sequence found no observable timer, listener, or animation accumulation. Long-duration physical-TV memory profiling was outside the browser-only scope requested for this task.
