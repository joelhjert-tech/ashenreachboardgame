# Single-player movement browser QA index

Browser QA used one real Host TV, one real phone controller, a fresh single-player session, the canonical first movement, a real destination encounter, phone reconnect, and a QA projection for the second movement prompt.

## Environment

- Phone: 360×800, 390×844, 412×915
- TV: 1920×1080, 1440×900, 1280×720
- Browser: headless Chromium through Python Playwright
- Server: `npm.cmd run dev -- --qa-fixtures`
- Errors: zero console errors and zero page errors
- Overflow: zero horizontal overflow in every captured frame
- Servers after capture: ports 5173 and 8080 closed

## Captures

| Screenshot | State | Source |
|---|---|---|
| `01-single-player-join-390x844.png` | Single-player room join | Real session |
| `02-character-selection-390x844.png` | One-operative selection | Real session |
| `03-first-movement-prompt-360x800.png` | First movement prompt | Real session |
| `03-first-movement-prompt-390x844.png` | First movement prompt | Real session |
| `03-first-movement-prompt-412x915.png` | First movement prompt | Real session |
| `03-tv-first-navigation-1920x1080.png` | TV and phone agree on active operative | Real session |
| `04-legal-destinations-390x844.png` | Exact-distance legal destinations | Real session |
| `05-destination-selected-390x844.png` | Selected route and primary confirmation | Real session |
| `06-movement-confirmed-390x844.png` | Submission locked while travelling | Real session |
| `06-tv-movement-animation-1920x1080.png` | Authoritative route journey | Real session |
| `06-tv-movement-animation-1440x900.png` | Authoritative route journey | Real session |
| `06-tv-movement-animation-1280x720.png` | Authoritative route journey | Real session |
| `07-phone-reconnected-authoritative-state-390x844.png` | Reconnected into the actual arrival battle | Real session |
| `07-tv-authoritative-state-1280x720.png` | TV retains authoritative encounter state | Real session |
| `08-second-movement-turn-390x844.png` | Next actionable movement prompt | Server QA fixture |
| `08-tv-second-movement-turn-1280x720.png` | TV agrees on second navigation state | Server QA fixture |

## Visual review

- Movement step and primary Roll action are immediately visible.
- Legal destination count, distance, risk, and destination names remain readable.
- Selected destination and confirmation action remain distinct.
- The TV route follows the server route and does not use battle framing for travel.
- Reconnect restored the real enemy encounter rather than replaying movement.
- The initial reconnect capture was invalid because the QA script reloaded `resetAuth=1`; the script was corrected to use the normal room URL and the affected screenshot was recaptured.

All images are stored under `reports/ui/single-player-movement/` and remain QA/report assets rather than runtime content.
