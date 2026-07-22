# P6 Shop Timing and Runtime QA

## Final deterministic run

| Operation | Duration |
|---|---:|
| Category fixture/projection | 18 ms |
| Equipment fixture/projection | 19 ms |
| Items fixture/projection | 22 ms |
| Services fixture/projection | 33 ms |
| Artifact fixture/projection | 17 ms |
| Sell fixture/projection | 30 ms |
| Insufficient-funds fixture/projection | 16 ms |
| Sold-out fixture/projection | 37 ms |
| Threat-locked fixture/projection | 14 ms |
| Long-lore fixture/projection | 14 ms |
| Authoritative purchase response | 209 ms |

These are local end-to-end fixture request timings, not gameplay delays or
animation gates. Presentation follows authoritative state and never determines
transaction completion.

## Browser measurements

- 72 screenshots captured.
- Phone viewports: 390x844 and 360x800.
- TV viewports: 1920x1080 and 1366x768.
- Horizontal overflow: 0 pixels on every capture.
- Browser console errors: 0.
- Unhandled page errors: 0.
- Reduced-motion information parity: passed.
- Reconnect restored the browsing state and focused offer without replay.

## Performance notes

- Only the focused offer renders at full prominence on phone.
- Adjacent offers are selected by explicit controls and do not mount a desktop
  stock grid.
- Existing image components retain fixed geometry, fallback handling, and lazy
  behavior, preventing layout shifts from intrinsic image size.
- No timers or animation callbacks control Buy, Sell, Service, or Leave state.
- No listeners are added per transaction by the P6 components.
