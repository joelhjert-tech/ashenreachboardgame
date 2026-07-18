# Host Movement Journey Live QA

## Verdict

**Partial acceptance; final acceptance remains blocked.** A real single-player TV/phone session proved the server-authoritative multi-step journey, destination-test handoff, reconnect behavior, reduced motion, and responsive layouts. The current authenticated QA fixture cannot deterministically place an operative on a multi-step route into Ashen Chapel, so the required Rift Whispers recurring-challenge handoff was not exercised live.

Live QA also found and locally corrected one blocking presentation defect: an immediate authoritative destination test suppressed the journey before departure. `TvApp` now retains the bounded host-only journey presentation and reveals the already-authoritative destination focus afterward. A second local correction hides the board legend while that queued journey is visible. These corrections are uncommitted pending review.

## Environment

- Branch: `mission-lifecycle-repair`
- Landed feature: `848baf8 feat: add host movement journey presentation`
- QA fixtures enabled only for the fresh development server (`ASHEN_REACH_QA_FIXTURES=1`)
- Browser: headless Chromium through Playwright
- Phone viewport: 390x844
- Primary TV viewport: 1366x768
- Wide TV viewport: 1920x1080
- Session mode: fresh single-player room with one owning phone
- Operative: Tarek Voss / Void Marshal

## Authoritative route exercised

The final primary capture used a normal server roll of 4 and the phone-confirmed route:

1. Ashwalk Bridge
2. Votive Engine Room
3. Deadwater Marsh
4. Colony Outskirts
5. Broken Census Hall

The phone reported four movement steps; the host showed five route plates including origin and destination. Earlier successful captures also exercised three-, five-, and six-step movement totals without seeded rolls.

## Acceptance matrix

| Check | Result | Evidence / note |
|---|---|---|
| Before movement roll | Pass | Phone and TV captured; no journey visible before confirmation |
| Authoritative movement roll | Pass | Normal server rolls used; final primary roll was 4 |
| Destination preview | Pass | Phone and TV agreed on destination, exact route, and step count; no journey before confirm |
| Departure and ordered steps | Pass after correction | Every canonical route tile appeared in server order |
| Canonical tile artwork | Pass | Production `BoardTileImage` art appeared for every route plate; no QA replacement map |
| Current/destination hierarchy | Pass | Current plate enlarged and destination remained visible |
| Arrival brief | Pass | Arrival retained destination art, rule text, and public destination state |
| Destination test/Threat handoff | Pass after correction | Journey completed, then dedicated authoritative test chamber appeared with no overlap |
| Ordinary board return | Not independently exercised | Tested route immediately opened a destination test; automated component coverage remains green |
| Rift Whispers recurring-challenge handoff | Blocked | Existing authenticated fixture cannot create a multi-step arrival at Ashen Chapel |
| Reconnect during journey | Pass | Journey existed before reload; reload showed authoritative destination focus without replaying departure |
| Reduced motion | Pass | Route remained complete and readable; short state replacement used; no information removed |
| 1366x768 responsiveness | Pass after correction | No overflow; legend/header collision corrected |
| 1920x1080 responsiveness | Pass | Journey remained centered and readable |
| Runtime safety | Pass | No console/page errors, document overflow, or canvas/WebGL use |
| Public/private boundary | Pass | TV showed public route and resolution data only; phone retained private controls |

## Defects

| Severity | Defect | Correction |
|---|---|---|
| Blocker | Immediate destination `activeResolution` prevented the journey from starting, so all timed frames showed battle instead of movement | Queue the bounded host-only journey presentation and reveal the already-authoritative focus after it finishes |
| Medium | Board legend overlaid and clipped the journey header at 1366x768 when battle state was already projected | Hide `BoardLegend` whenever a journey presentation is active |
| Coverage blocker | No valid QA fixture path for a multi-step Ashen Chapel / Rift Whispers arrival | Do not claim recurring-challenge live acceptance; add a narrowly authenticated placement/route fixture in a later QA-only pass |

## Screenshots

All images are untracked under `qa-artifacts/movement-journey-live/`.

- `01-before-roll-phone-390x844.png` — 390x844
- `01-before-roll-tv-1366x768.png` — 1366x768
- `02-after-roll-phone-390x844.png` — 390x844
- `02-after-roll-tv-1366x768.png` — 1366x768
- `03-destination-selected-phone-390x844.png` — 390x844
- `03-destination-selected-tv-1366x768.png` — 1366x768
- `04-departure-tv-1366x768.png` — 1366x768
- `05-step1-tv-1366x768.png` — 1366x768
- `06-intermediate-tv-1366x768.png` — 1366x768
- `07-final-step-tv-1366x768.png` — 1366x768
- `08-arrival-phone-390x844.png` — 390x844
- `08-arrival-tv-1366x768.png` — 1366x768
- `09-handoff-tv-1366x768.png` — 1366x768
- `10-reduced-motion-tv-1366x768.png` — 1366x768
- `11-reconnect-result-tv-1366x768.png` — 1366x768
- `12-intermediate-tv-1920x1080.png` — 1920x1080

## Reconnect and reduced motion

Reloading the TV during an intermediate visual step did not emit another movement action or replay the journey. Because the server had already resolved position and destination state, the reloaded host correctly reconstructed the authoritative destination test rather than restarting a stale client-only animation.

With reduced motion enabled, the journey retained route order, current step, destination, and arrival information. The presentation used short step replacement and recorded no overflow, console error, or canvas.

## Verification

- Content validation: passed
- Typecheck: passed
- Client suite: passed
- Default-timeout full suite: passed
- Asset audit: 404/404 passed
- Production build: passed
- `git diff --check`: passed

## Remaining acceptance work

Add or extend a narrowly guarded QA fixture that can place the authenticated operative on an authoritative multi-step route ending at Ashen Chapel without bypassing normal movement confirmation. Then capture Rift Whispers arrival, verify the journey closes before challenge focus, resolve it, and confirm it remains attached. Until that evidence exists, the live presentation track is not fully accepted and this report should not be committed as a passing verification report.
