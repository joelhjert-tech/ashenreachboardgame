# P2 Movement Screenshot Index

All captures use real server projections and QA fixtures that mutate canonical server state. No screenshot uses client-authored legality or route data.

Root: `docs/qa/p2-movement/`

## Phone — 390×844 and 360×800

| State | Files | Review |
|---|---|---|
| Movement result / many destinations | `phone-movement-result-*`, `phone-many-legal-destinations-*` | Exact final distance remains pinned; four legal choices are visible with A–D markers. |
| Two legal destinations | `phone-two-legal-destinations-*` | Long exact-distance route shows only its two server-projected destinations. |
| Long destination content | `phone-long-sector-names-*` | Names wrap without hiding the selection or sticky primary action. |
| Destination selected | `phone-destination-selected-*` | Gold selected frame and destination-named Confirm action are unambiguous. |
| Destination submitting | `phone-destination-submitting-*` | Controls are disabled once; the P1 status shell owns submission feedback. |
| Public warning / special route | `phone-public-warning-*` | Ring-transition language is public-safe and the route remains selectable only when server requirements permit it. |
| Movement in progress | `phone-movement-in-progress-*` | Stale destination controls are absent after acceptance. |
| Waiting phones | `phone-waiting-selection-*`, `phone-waiting-during-movement-*` | Acting player and public action are clear; no destination choice or private data leaks. |
| Reconnect | `phone-reconnect-destination-selection-*`, `phone-reconnect-after-submission-*` | Selection markers are stable before submission; accepted movement does not reopen destination controls. |
| Stale action | `phone-stale-action-recovery-*` | Recovery explains that the authoritative state changed and restores the valid action. |
| Reduced motion | `phone-reduced-motion-selection-*`, `phone-reduced-motion-arrival-*` | Information is unchanged; only decorative motion is shortened. |

## TV — 1920×1080 and 1366×768

| State | Files | Review |
|---|---|---|
| Current operative | `tv-current-operative-*` | Current location and active player remain visible. |
| Legal destination markers | `tv-legal-destination-markers-*` | A/B labels match the phone and do not depend on color. |
| Multiple route choices | `tv-multiple-routes-*` | Destinations remain spatially readable without drawing an equal-strength route web. |
| Selected route | `tv-selected-route-*` | Only the selected authoritative route receives strong emphasis. |
| Special connection | `tv-special-connection-*` | Cross-ring choice is marked and its route follows the canonical edge. |
| First/intermediate/final steps | `tv-first-movement-step-*`, `tv-intermediate-movement-step-*`, `tv-final-movement-step-*` | Ordered route tiles and step count track the projected path. |
| Arrival | `tv-arrival-emphasis-*` | Destination is distinct from intermediate tiles and retained through the settle. |
| Encounter handoff | `tv-encounter-handoff-*` | Journey closes before the next authoritative presentation takes over. |
| Waiting context | `tv-waiting-player-context-*` | Shared public-safe required-action wording remains visible. |
| Reconnect | `tv-reconnect-restored-state-*` | Stable planner and marker assignment return without replaying server effects. |
| Reduced motion | `tv-reduced-motion-arrival-*` | Final destination and route summary remain readable with abbreviated motion. |

## Recordings

- `recordings/short-route-1920x1080.webm`
- `recordings/medium-route-1920x1080.webm`
- `recordings/long-route-1920x1080.webm`
- `recordings/special-connection-1920x1080.webm`

## Review result

- Tile names and route markers remain readable at both TV sizes.
- Sticky phone actions do not overlap contextual navigation.
- No capture contains raw route IDs or internal topology IDs in player-facing copy.
- No hidden encounter, Rivalry target, mission detail, or server-only route key was visible.
- No horizontal overflow or browser errors were recorded.
