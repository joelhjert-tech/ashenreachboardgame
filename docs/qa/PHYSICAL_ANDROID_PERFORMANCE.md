# Physical Android Performance Review

- Visual Viewport uses one shared external-store subscription and requestAnimationFrame coalescing.
- Listeners are removed when the last subscriber unmounts.
- The Back guard pushes one sentinel per room key and does not push on render.
- Reconnect/rerender tests verify the guard does not grow history repeatedly.
- Top-level scroll uses one existing scroll root; no nested scrolling surface was added.
- Physical Join resizing reacted during the keyboard transition without repeated jumps.
- Physical tab switching and compact Hazard rendering showed immediate input response.
- Horizontal overflow: 0px.
- Primary controls: 44px minimum; Hazard primary action: 48px.
- No persistent console error remained after a clean reload. A React hook-order warning observed during live Vite hot replacement was not reproducible after reload and is classified as development HMR noise.

## P18 closeout observations

- Five repeated Back/Stay cycles produced one dialog at a time and no observable history or listener growth.
- Canonical Leave responded once and a repeated server request was idempotent.
- Background/resume and reload/reconnect restored the same authoritative fixture without replay.
- Physical tab changes, battle, Hazard, and shop responses remained immediate to touch.
- No persistent console or network error was observed during the clean closeout sequence.
- No material memory growth was observed in the bounded session. This was an observational DevTools check, not a long-duration heap benchmark.
