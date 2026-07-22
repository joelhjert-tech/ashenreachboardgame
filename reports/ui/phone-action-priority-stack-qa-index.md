# Phone Action Priority Stack QA index

All files are under `reports/ui/phone-action-priority-stack/`. The capture runner verified viewport width before every screenshot and failed on any console or page error.

| Screenshot | State | Viewport | Review result |
|---|---|---:|---|
| `free-action-360x800.png` | Free Action, short screen | 360×800 | Context and first Useful action visible; no overlap. |
| `free-action-390x844.png` | Free Action | 390×844 | Full-width action cards and compact header. |
| `free-action-412x915.png` | Free Action | 412×915 | Stable spacing and readable labels. |
| `free-action-430x932.png` | Free Action, wide phone | 430×932 | No excessive stretching or overflow. |
| `hazard-ready-390x844.png` | Mandatory Hazard reveal | 390×844 | Face Hazard is first in Required Now; End Turn blocked. |
| `hazard-active-390x844.png` | Hazard after canonical start | 390×844 | Start action gone; Roll check dice is the required action. |
| `challenge-390x844.png` | Recurring tile Challenge | 390×844 | Challenge identity, skill, and difficulty are clear. |
| `event-390x844.png` | Event reveal | 390×844 | Event context is distinct from battle terminology. |
| `battle-390x844.png` | Opposed battle | 390×844 | Approved dedicated Battle surface retained. |
| `payment-390x844.png` | Salvage payment | 390×844 | Approved owner-private payment state retained and readable. |
| `scar-choice-blocked-390x844.png` | Third-Scar choice | 390×844 | Scar selector exclusively owns the screen; no competing actions. |
| `mission-completion-390x844.png` | Mission ready to complete | 390×844 | Mission action appears in Optional with wrapping label. |
| `many-actions-430x932.png` | Loaded operative | 430×932 | Useful actions discoverable; group remains smooth and stable. |
| `many-blocked-actions-390x844.png` | Loaded but timing-blocked operative | 390×844 | Required action remains above fold; Blocked stays collapsed. |
| `end-turn-legal-390x844.png` | Legal End Turn | 390×844 | End Turn is a separate final group with mode copy. |
| `end-turn-blocked-390x844.png` | Illegal End Turn | 390×844 | End Turn absent as advance and listed under Blocked with reason. |
| `single-player-360x800.png` | Single-player End Turn | 360×800 | `Begin next round` copy verified; no other-player wait. |
| `co-op-waiting-390x844.png` | Real inactive second phone | 390×844 | Standby player identity is public-safe; no active-owner controls. |
| `rivalry-private-390x844.png` | Real Rivalry owner phone | 390×844 | Private agenda appears only as owner passive information. |
| `reconnect-restored-390x844.png` | Reconnect at encounter reveal | 390×844 | Same required encounter action restored without duplication. |

## Visual correction pass

The first render showed narrow two-column action cards and repeated action names. The production pass changed cards to a single full-width action column, removed duplicate visible labels, preserved semantic disabled reasons, and enabled safe wrapping for long Mission/action names. All indexed images were recaptured after that correction.

## Browser session details

- Browser: Playwright Chromium.
- Phone setup: normal room creation, Join Game, operative selection, starting Mission selection, Ready, Start Game.
- Co-op and Rivalry: real two-player sessions with separately authenticated phone pages.
- Difficult timing states: server-authorized development fixture projected through the same reducer, WebSocket projection, and production phone components.
- Encounter transition: real `START_TILE_ENCOUNTER` button submission.
- Development services were stopped after capture.
