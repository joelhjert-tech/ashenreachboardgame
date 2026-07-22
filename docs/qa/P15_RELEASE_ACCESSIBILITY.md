# P15 Release Accessibility

- Phone viewports: 360×800, 390×844, 430×932.
- TV viewports: 1366×768, 1600×900, 1920×1080.
- Required controls remained inside the viewport with zero horizontal overflow.
- Reduced motion retained all outcome, total and next-action information.
- Outcome and waiting states include text, not color alone.
- Ended sessions now make the board inert so hidden map controls cannot retain focus behind the result overlay.
- TV audio, admin and return controls use physical 44 px minimum hit areas, independent of rem scaling.

The final capture inventory includes undersized-control diagnostics so responsive regressions can identify the exact label and class rather than reporting only a minimum number.
