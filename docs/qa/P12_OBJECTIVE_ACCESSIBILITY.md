# P12 Objective Accessibility QA

## Semantics and reading order

- The phone tab is labelled **Objectives** rather than the false umbrella **Quest**.
- Sections read Shared Mission, replacement choice when required, My Contract, Private Agenda, then collapsed Completed Contracts.
- Progress bars have explicit current/required text and accessible labels.
- Current, remaining, completed, locked, revealed, and private states have text labels; color is secondary.
- Long lore is secondary in native `details`/`summary` controls.
- Replacement Contract buttons remain native buttons with player-facing names.

## Responsive review

The same canonical states were captured at 360x800, 390x844, and 430x932. Long titles and conditions wrap without horizontal overflow. Required Contract selection remains in the single document scroll region and the sticky tab dock does not cover the final reachable content.

The TV was captured at 1366x768, 1600x900, and 1920x1080. Shared Mission identity/progress stays in the single-line map-first command header. Private details never compete for couch-readable space.

## Focus and announcements

P12 reuses the existing authoritative required-action and focus-on-revision infrastructure. It does not add a duplicate live region. Replacement selection remains the server-owned pending action. Agenda privacy text is not placed in public live regions.

## Reduced motion

The reduced-motion screenshot and recording retain exact progress, reward, lock/reveal state, and replacement choices. No information is conveyed only through animation.

## Result

- Horizontal overflow: 0 across captured viewports
- Browser console errors: 0
- Internal identifier text leaks: 0
- Long-condition clipping: not observed
- Color-only state indicators: none introduced
