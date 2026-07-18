# Live-Play UI Repair QA Index

## Captures

| State | Viewport | Path | Result |
|---|---|---|---|
| Requisition Chamber | 1920×1080 / 1366×768 | `reports/live-play-ui-repair-qa/shop-requisition-*` | Corrected stock-visible render; no overflow |
| Salvage Market | 1920×1080 / 1366×768 | `reports/live-play-ui-repair-qa/shop-market-*` | Board retained; no overflow |
| Battle header | 1920×1080 / 1366×768 | `reports/live-play-ui-repair-qa/encounter-header-battle-*` | Single line; old context panel absent |
| Cross-ring route | 1920×1080 / 1366×768 | `reports/live-play-ui-repair-qa/cross-ring-route-*` | Canonical board route visible |
| Helper selector | 390×844 | `reports/ui/broken-concordance/phone/active-helper-selector-390x844.png` | One/two helper selection above sticky actions |

The QA scripts checked horizontal overflow and browser console errors. The cooperative archive also covers requested, accepted, declined, result, public TV, and reduced-motion states.

## Verification

- `npm.cmd run validate:content`: passed; canonical 109 Threats, 36 Contracts, 24 Followers, and current content boundaries retained.
- `npm.cmd run typecheck`: passed.
- Focused phone, TV, assistance, mission, cross-ring, and reconnect tests: passed.
- `npm.cmd run test:client`: 38 files / 351 tests passed.
- `npm.cmd run test:integration`: 34 files / 301 tests passed after the required isolated socket rerun and one uncontended suite rerun.
- `npm.cmd run test:engine`: 67 files / 744 tests passed.
- `npm.cmd run test:rules`: 10 files / 49 tests passed.
- `npm.cmd run test`: 139 files / 1,396 tests passed.
- `npm.cmd run audit:assets`: 421/421 assets present; zero invalid, placeholder, or release-blocking assets.
- `npm.cmd run build`: passed.
- Browser QA at 1920×1080, 1366×768, and phone 390×844: passed overflow, privacy, console, and reduced-motion checks.
- `git diff --check` and `git diff --cached --check`: passed.

## Four critique seats

- New player: staged `Ask for Help`, compact header, player-colored markers, and automatic mission picker make the next action explicit.
- Optimizer: server-selected mission options cannot be rerolled by reconnect; selected helper IDs and maximum two remain authoritative.
- Family/casual: the Market prototype is quickest for routine visits; the Requisition prototype is clearest at couch distance.
- Rules lawyer: challenge cleanup precedes Contract completion; exactly one pending mission record owns the interruption; TV does not receive private options.

## Remaining choice

The only intended unresolved decision is which shop prototype, if either, should replace production. No production shop selection was made in this pass.
