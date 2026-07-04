# Phase 7E Real-Device Playtest Results

Baseline: `a165d27 phase-7d-stat-upgrade-progression-validation`
Branch: `cleanup/remove-threejs`
Date: 2026-07-04

## Setup

- Dev stack: running in LAN-accessible mode.
- Dev process started by Codex: `18764`
- TV URL: `http://192.168.50.238:5173/tv`
- Phone URL: `http://192.168.50.238:5173/`
- API URL: `http://192.168.50.238:8080`
- WebSocket URL: `ws://192.168.50.238:8080`
- Local API smoke: passed with HTTP 200.
- Local client smoke: passed with HTTP 200.

## Desktop Browser Smoke

Executed with Playwright Chromium against the live dev stack.

- Smoke room: `G1ML2`
- Emulated phone viewport: `390x844`
- TV viewport: `1920x1080`
- Phone screenshot: `artifacts/phase-7e/phase-7e-phone-emulated-390x844.png`
- TV screenshot: `artifacts/phase-7e/phase-7e-tv-1920x1080.png`
- Browser smoke report: `artifacts/phase-7e/browser-smoke-report.json`

Results:

- Phone rendered live controller state.
- TV rendered matching live host state.
- First-turn automatic threat/battle state rendered on both phone and TV.
- Phone bottom tabs remained visible.
- Horizontal overflow: none detected.
- Canvas count: `0` on phone and TV.
- Console/page errors: none detected.

## Real Phone Execution

Status: pending physical-device confirmation.

Codex started the LAN dev stack and opened the desktop TV URL, but cannot physically scan the QR code or operate the user's real phone browser. These checks require manual execution on the real device:

- [ ] Scan TV QR with real phone.
- [ ] Confirm QR URL uses `192.168.50.238`, not `localhost`.
- [ ] Confirm phone loads app.
- [ ] Confirm phone joins room.
- [ ] Confirm touch targets work with real browser chrome visible.
- [ ] Confirm no real-phone console/network errors if available through remote debugging.

## Required Flow Results

### 1. Real Phone Join

Status: pending real-device execution.

Desktop/LAN readiness passed:

- TV URL available on LAN.
- Phone URL available on LAN.
- API available on LAN.
- WebSocket URL available on LAN.

### 2. Solo Flow

Status: partially executed by desktop/browser smoke; pending real phone.

Confirmed:

- Solo room can be created through the live API.
- Seat can join.
- Ready can be set.
- Solo session starts immediately after start.

Pending real phone:

- Roll movement by touch.
- Choose destination by touch.
- Confirm move by touch.
- Resolve first sector/action on real browser.

### 3. Movement Tab

Status: pending real phone.

Phase 7D browser QA already confirmed the Move screen at `390x844`:

- Movement summary appears above secondary tools.
- Legal destination list appears before Useful Now.
- Bottom tabs remain visible.
- No horizontal overflow.

Pending real phone:

- Destination list readability with actual browser chrome.
- No clipped one-letter text.
- Numbered route detail.
- Confirm Move button does not cover route text.

### 4. Shop Flow

Status: pending real phone.

Not reached in this Phase 7E physical pass.

### 5. Battle Flow

Status: partially executed by desktop/browser smoke; pending real phone.

Confirmed:

- First-turn battle/threat state rendered on phone.
- TV battle state rendered matching active threat context.
- TV showed active operative, relevant stat, enemy difficulty, and battle prompt.
- No browser console/page errors.

Pending real phone:

- Resolve battle by touch.
- Confirm TV final battle overlay shows VS, dice, math, and result.
- Confirm phone can continue.
- Confirm no post-battle lockup.

### 6. Stat Upgrade

Status: covered by automated Phase 7D tests; pending real phone.

Confirmed by automated tests:

- Threat reward grants trophies.
- Upgrade deducts trophies.
- Base stat increases.
- Later roll uses upgraded base stat.
- Gear remains a separate modifier.

Pending real phone:

- Upgrade from real phone UI after trophy gain or fixture.
- Confirm real-phone result chips.
- Confirm later real-phone/TV math presentation.

### 7. Rivalry Privacy

Status: pending two-device execution.

Not executed in this pass.

### 8. Diagnostics

Captured:

- Device/browser for automated smoke: Playwright Chromium.
- API URL: `http://192.168.50.238:8080`
- WebSocket URL: `ws://192.168.50.238:8080`
- QR/phone URL family: `http://192.168.50.238:5173/?room=<roomCode>`
- Console/page errors: none in automated smoke.
- Screenshots: saved under `artifacts/phase-7e/`.

## Findings

No app P0/P1 defects were confirmed by the executable desktop/browser portion of this pass.

Open manual validation items:

- P1: Real phone QR join and touch-flow execution still need physical-device confirmation.
- P2: Movement readability under actual Android/iOS browser chrome still needs physical-device confirmation.
- P2: Shop flow on real phone still needs execution.
- P2: Stat upgrade flow on real phone still needs execution.
- P2: Rivalry privacy still needs a second controller/device.

## Notes

The dev server remains running for real-device testing at the LAN URLs above. If any real phone step fails, capture the browser, visible URL, and the exact screen state before changing code.
