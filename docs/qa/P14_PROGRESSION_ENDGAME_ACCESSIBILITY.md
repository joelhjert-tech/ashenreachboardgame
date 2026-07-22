# P14 Progression and Endgame Accessibility

## Meaning and reading order

- Win Progress and Loss Pressure always include text values.
- Near-win, danger, and critical states use explicit labels and explanations;
  colour is not the only carrier.
- Final-stage and result regions have semantic labels and live-region behavior
  only during the first authoritative transition.
- Reconnect-restored results use a normal region to avoid announcing an old
  event as new.
- Phone result reading order is outcome, mission, reason, final totals, private
  owner-only result, then exit action.

## Responsive behavior

- Phone: verified at 360×800, 390×844, and 430×932.
- TV: verified at 1366×768, 1600×900, and 1920×1080.
- No horizontal overflow was measured.
- The 360×800 result keeps the primary exit action above the lower viewport.
- Long mission and defeat text wraps; no essential field is ellipsized on the
  result screen.

## Motion

`prefers-reduced-motion: reduce` disables P14 reveal, pulse, and transition
animation. No information is conveyed by motion alone, and no gameplay timer
depends on animation.

## Known limitation

At the smallest TV width, the persistent command header remains intentionally
dense. The critical warning is repeated as explicit live-status text so its
meaning survives any truncation in the compact instrument area.
