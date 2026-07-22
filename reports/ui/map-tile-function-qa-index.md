# Map Tile Function QA Index

Browser QA used a QA-enabled real server, WebSocket projections, production phone/TV components, and canonical card/challenge data. Fixtures seed server state only. All captures passed horizontal-overflow and console-error checks.

## Phone

| Screenshot | State | Viewport | Review |
|---|---|---:|---|
| `map-tile-function/phone-tile-arrival-360x800.png` | Tile arrival + recurring challenge | 360×800 | Current rule and primary check visible above fold after correction |
| `map-tile-function/phone-tile-arrival-390x844.png` | Tile arrival + recurring challenge | 390×844 | Clear mandatory/optional counts |
| `map-tile-function/phone-tile-arrival-412x915.png` | Tile arrival + recurring challenge | 412×915 | No overflow |
| `map-tile-function/phone-fixed-hazard-390x844.png` | Fixed Hazard/test presentation | 390×844 | Approved challenge shell retained |
| `map-tile-function/phone-challenge-success-390x844.png` | Challenge success | 390×844 | Result remains authoritative |
| `map-tile-function/phone-challenge-failure-390x844.png` | Challenge failure | 390×844 | Consequence remains clear |
| `map-tile-function/phone-optional-shop-390x844.png` | Optional shop after arrival | 390×844 | Shop remains optional and skippable |
| `map-tile-function/phone-salvage-payment-390x844.png` | Salvage payment | 390×844 | Payment prompt remains owner-only |
| `map-tile-function/phone-scar-follow-up-390x844.png` | Scar follow-up | 390×844 | Scar selection remains owner-only |
| `map-tile-function/phone-reconnect-tile-resolution-390x844.png` | Reconnect during challenge | 390×844 | Current challenge and visit stack restored |
| `map-tile-function/phone-single-player-next-turn-390x844.png` | Solo navigation resumes | 390×844 | No multiplayer helper wait |

## Host TV

| Screenshot | State | Viewport | Review |
|---|---|---:|---|
| `map-tile-function/tv-multi-effect-stack-1920x1080.png` | Three-symbol Customs Gate stack | 1920×1080 | Public stack readable over board |
| `map-tile-function/tv-multi-effect-stack-1440x900.png` | Three-symbol Customs Gate stack | 1440×900 | No overlap/overflow |
| `map-tile-function/tv-multi-effect-stack-1280x720.png` | Three-symbol Customs Gate stack | 1280×720 | Compact queue remains readable |

## Admin Map Inspector

| Screenshot | State | Viewport | Review |
|---|---|---:|---|
| `map-tile-function/admin-map-tile-functions-1920x1080.png` | Ashen Chapel executable rule view | 1920×1080 | Order, repeat, references and source visible |
| `map-tile-function/admin-detached-arrival-simulation-1920x1080.png` | Detached arrival simulation | 1920×1080 | Simulation warning, prompts and trace visible |

## Corrective screenshot pass

The first phone render displayed every rule at full height and hid the primary Challenge action at 360×800. The implementation was changed to show the current rule plus a collapsed remaining-effect count. The first TV render used a stale QA sequence and showed an unrelated prompt; the server fixture now increments sequence and clears all canonical pending records before broadcasting. Both affected sets were recaptured and manually inspected.

## Verification commands

| Command | Result |
|---|---|
| `npm.cmd run validate:content` | PASS — 18 characters, 71 gear, 109 Threats, 36 Contracts, 20 anomalies, 30 Artifacts, 24 followers, 24 Scars, 16 escalations, 30 afflictions |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run test:engine` | PASS — 70 files, 763 tests |
| `npm.cmd run test:rules` | PASS — 12 files, 64 tests |
| `npm.cmd run test:integration` | PASS — 38 files, 338 tests |
| `npm.cmd run test:client` | PASS — 44 files, 380 tests |
| `npm.cmd run test` | PASS — 152 files, 1,481 tests |
| `npm.cmd run build` | PASS — production Vite build |
| `npm.cmd run audit:assets` | PASS — 435/435 present; zero missing, invalid, placeholder, or release-blocking assets |
| Browser QA | PASS — 16 captures; requested phone/TV viewports; no horizontal overflow or console errors |
| `git diff --check` | PASS |
| `git diff --cached --check` | PASS |

The first integration attempt found two failures in the Mirror confrontation threshold cases. They were fixed by marking internal scenario phase transitions as automatic while retaining the canonical end-turn guard on player requests. The exact 191-test engine/server regression set and the complete integration suite then passed. No screenshots are runtime assets.
