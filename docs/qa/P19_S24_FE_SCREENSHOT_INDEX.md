# P19 Samsung S24 FE screenshot index

Physical binary evidence is local-only under
`docs/qa/physical-s24-fe/` and excluded through `.git/info/exclude`.

## Physical screenshots

1. `screenshots/01-roll-required.png`
2. `screenshots/02-expanded-seven-section-nav.png`
3. `screenshots/03-browser-fullscreen-active.png`
4. `screenshots/04-destination-a-expanded.png`
5. `screenshots/05-destination-b-expanded.png`
6. `screenshots/06-back-preserves-selected-destination.png`
7. `screenshots/07-battle-result.png`
8. `screenshots/08-trophy-upgrade-available.png`
9. `screenshots/09-trophy-upgrade-confirmation.png`
10. `screenshots/10-trophy-upgrade-result.png`
11. `screenshots/11-trophy-upgrade-applied.png`

## Physical recordings

1. `recordings/01-navigation-expand-collapse.mp4`
2. `recordings/02-fullscreen-enter-exit.mp4`
3. `recordings/03-movement-dice-and-destinations.mp4`
4. `recordings/04-trophy-upgrade-transaction.mp4`

## Playwright evidence

- `playwright/playwright-384x722-nav-collapsed.png`
- `playwright/playwright-384x722-nav-expanded.png`

The Playwright files are regression evidence only. They do not reproduce
physical Chrome bars, Android Back, physical GPU/font rendering, or the real
S24 FE viewport.

## Missing requested evidence

The full 29-screenshot and 12-recording matrix was not completed. In
particular, literal full Option A/Option B arrival captures, physical reduced
motion, missing-art, and physical reroll captures remain outstanding. No
Playwright artifact has been relabelled as physical evidence.
