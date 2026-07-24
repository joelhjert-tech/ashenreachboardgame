# P19 Samsung Galaxy S24 FE phone baseline

## Repository

- Repository: `ashen-reach-codex-task-01-repository`
- Branch: `integration/p0-p15-ux-consolidation`
- Starting HEAD: `02b7ca1701c861aaa32751b2008b05f944289ec4`
- P18 and other unrelated dirty work was preserved.
- No files were staged, committed, reset, or pushed.

## Physical device

- Manufacturer: Samsung
- Model: SM-S721B, Galaxy S24 FE
- Android: 16
- API: 36
- Chrome: 150.0.7871.128
- Physical display: 1080 × 2340
- Physical density: 450 dpi
- Active density override: 510 dpi
- Font scale: 1.0
- Android navigation-mode setting: 0
- ADB serial: `RZCXB1YQDGM`

## Measured physical Chrome layout

- Normal CSS viewport: 338 × 601
- Normal visual viewport: approximately 338.82 × 601.10
- Device pixel ratio: 3.1875
- Pointer: coarse
- Hover: none
- Reduced motion: false
- Service-worker controller: none
- Horizontal overflow: none

The measured viewport is substantially smaller than both the previous Galaxy
S21+ baseline (384 × 722) and the standard 390 × 844 Playwright viewport.
Physical-screen pixels must not be treated as CSS pixels.

Entering the Fullscreen API succeeded, but Chrome 150 in this tab configuration
retained the measured 338 × 601 CSS viewport and visible browser chrome. This is
a platform limitation, not permission to auto-enter fullscreen.

## Connection

The physical phone used Android Studio Device Mirroring, physical touch, ADB
reverse forwarding for ports 5173 and 8080, Chrome remote debugging through the
device DevTools socket, and the local QA-enabled authoritative server. The phone
joined room `3009H` as `P19S24` and completed real setup, movement, destination
selection, arrival, battle/check, Inventory, and Trophy-upgrade actions.

## Authority

Movement legality, selected route, dice results, battle totals, tile rules,
Trophy value, upgrade cost, and upgrade acceptance remained server-owned.
P19 changes presentation, disclosure timing, browser navigation, and
development fixtures only.
