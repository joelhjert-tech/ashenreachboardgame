# P17 Named Player Rules Screenshot Index

Browser QA evidence is stored under `docs/qa/p17-named-player-rules/`.

## Captured owner-phone states

Each state was captured at 360x800, 390x844, and 430x932 with zero document-level horizontal overflow:

- `kebab-popelord-confirmed-{viewport}.png`
- `joel-qa-operative-selection-{viewport}.png`
- `joel-qa-operative-confirmed-{viewport}.png`
- `non-joel-qa-hidden-{viewport}.png`

The rendered checks confirmed exact Kebab auto-selection, Joel-only MASTER ALPHA availability, and absence of MASTER ALPHA for `Joel2`. No browser console error was observed during these completed captures.

## Capture limitation

The follow-on multi-session capture for bound Fandiablos, CW battle arithmetic, TV, waiting-phone, reconnect, reduced-motion, and recordings encountered the already documented Windows QA child-process cleanup problem. The capture was stopped, ports were cleared, and no unavailable image or recording is represented as complete. Those states remain covered by canonical integration, privacy, reconnect, and presentation tests, but their requested visual evidence is still outstanding.
