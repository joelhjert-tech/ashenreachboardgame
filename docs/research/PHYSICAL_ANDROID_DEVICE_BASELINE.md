# Physical Android Device Baseline

Audit date: 2026-07-22

- Device: Samsung Galaxy S21+ (SM-G996B)
- Android: 15 / API 35
- Chrome: 143.0.7499.146
- Physical display: 1080 × 2400
- CSS layout viewport: 384 × 722
- Device pixel ratio: 2.8125
- Keyboard-open visual viewport: 384 × 301.511 CSS pixels
- Font scale: 1.0
- Connection: USB ADB, `adb reverse` for 5173 and 8080, physical Chrome at `http://127.0.0.1:5173/`
- Inspection: Android Studio Device Mirroring plus Chrome remote debugging

The physical Chrome viewport is the Android acceptance baseline. Raw screenshot pixels are not treated as CSS layout dimensions.

## P18 closeout environment

Android Studio Device Mirroring remained available and the Chrome tab was inspected through the physical-device DevTools endpoint. Local frontend and game traffic used ADB reverse rules for ports 5173 and 8080; a temporary local CDP forward on 9222 was used only for fixture control and inspection. All forwarding rules are removed during final cleanup.

## Corrected measurements

With the Samsung keyboard open, the player-name field measured 44 CSS pixels high. The Join Game button measured 44 CSS pixels high at `top=208.08`, `bottom=252.08`, leaving 49.43 CSS pixels below it inside the 301.51-pixel visual viewport. Horizontal overflow was zero.

The normal visual viewport reported `384 × 722.489`, with zero top offset and zero observed safe-area inset. Gesture navigation still reserves OS space below Chrome's content viewport.
