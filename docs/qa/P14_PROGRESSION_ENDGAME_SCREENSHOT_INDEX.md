# P14 Progression and Endgame Screenshot Index

The machine-readable capture manifest is
[`p14-progression-endgame/capture-results.json`](p14-progression-endgame/capture-results.json).
It records every viewport, motion preference, overflow measurement, timing, and
unsupported state.

## Archive

| Surface | Folder | States | Sizes |
|---|---|---|---|
| Phone owner | `p14-progression-endgame/phone/` | early/near progress, gain, early/near pressure, critical, final stage, co-op/solo/Rivalry/Relay result, summary, long content, reconnect, reduced motion | 360×800, 390×844, 430×932 |
| Host TV | `p14-progression-endgame/host/` | early/near progress, gain, near loss, pressure gain, critical, final announcement/objective, co-op result, Rivalry/Relay result, summary, fallback, reconnect, reduced motion | 1366×768, 1600×900, 1920×1080 |
| Waiting phone | `p14-progression-endgame/waiting-phone/` | public progress, threshold warning, final stage, Rivalry owner-safe result | 390×844 |
| Recordings | `p14-progression-endgame/recordings/` | progress, pressure, final-stage transition, victory, defeat, Rivalry reveal, exit-state, reconnect, reduced motion | 390×844 WebM |

## Representative captures

- Host critical warning:
  `host/critical-warning-1366x768.png`
- Host final-stage announcement:
  `host/final-stage-announcement-1920x1080.png`
- Host co-op victory:
  `host/coop-victory-1366x768.png`
- Host co-op defeat:
  `host/coop-defeat-1920x1080.png`
- Phone critical warning:
  `phone/critical-warning-390x844.png`
- Phone final objective:
  `phone/final-stage-entry-390x844.png`
- Phone victory:
  `phone/coop-victory-360x800.png`
- Phone long defeat reason:
  `phone/long-defeat-reason-430x932.png`
- Waiting phone privacy check:
  `waiting-phone/rivalry-result-public-only-390x844.png`

## Review result

- 113 screenshots and 9 recordings produced.
- Horizontal overflow: 0 in every capture.
- Browser console errors: 0.
- Short-screen conclusion action remains visible.
- Long Mission and defeat copy wrap without clipping.
- The TV board remains visible beneath final-stage and result presentation.
- No private Agenda data from another player appears on TV or waiting phones.
- Missing result art degrades to the structured text/result frame; gameplay and
  actions remain available.
