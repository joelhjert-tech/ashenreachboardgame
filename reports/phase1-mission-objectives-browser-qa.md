# Phase 1 Mission Objectives Browser QA

Date: 2026-07-10

Commit under test: `84904f8 feat: add phase 1 mission objective schemas`

Mode: QA/report-only. No game code or content changed.

## Test environment

- Fresh dev server and freshly created single-player room `I7AKP`.
- Scenario: The Broken Seal (`scenario_broken_seal`).
- Character: Bjornis / Firebreak Conqueror.
- Active Phase 1 contract: **Echo Triangulation** (`multiStopRoute`, unordered, three named sectors).
- TV viewport: 1366×768.
- Phone viewport: 390×844.
- Browser: headless Chromium through Playwright.
- Phone and TV reported no console errors or page errors, no horizontal overflow, and `canvasCount: 0`.

The room was created through the real HTTP setup endpoints. Bjornis joined, selected the offered Phase 1 contract, readied, and started normally. The browser clients then connected through their normal phone and TV subscriptions.

## Browser sequence exercised

1. Fresh room creation, join, character reservation, mission selection, ready, and start.
2. Phone Quest view for Echo Triangulation.
3. TV active mission summary and mission markers.
4. Real `Roll Movement` action from the phone.
5. Server returned movement value 5 and two legal destinations.
6. Phone selected Rusted Transit Gate and rendered the exact six-node route including origin and destination.
7. Phone confirmed the move.
8. TV switched from movement selection to arrival/test focus and then the revealed Wire-Chewer Pack encounter.

This route did not land on Glass Signal Pier, Coldwind Wharf, or Sunken Pier. The random movement result and subsequent encounter therefore prevented a truthful browser claim for target progress or completion in this session.

## Results

| QA target | Verdict | Evidence |
| --- | --- | --- |
| Fresh session with no stale mission state | Pass | New room, new seat, Echo Triangulation started at `0/3 stops`. |
| Old contract compatibility | Pass by automated regression; not separately replayed in browser | Existing engine/client/full suites passed after Phase 1. |
| New route contract available through real setup | Pass | Echo Triangulation appeared among Bjornis's three starting offers and was accepted normally. |
| Route progress initiated only by real movement | Partial | Real roll, legal destination, selection, confirmation, arrival, and encounter handoff succeeded; selected destination was not a mission target. |
| Ordered route rejects wrong-order visit | Not browser-tested | Targeted objective test passes; no deterministic browser route control exists. |
| Unordered route accepts any valid stop | Not browser-tested | Targeted objective test passes; no authored target was reachable on the sampled roll. |
| Duplicate visit does not duplicate progress | Not browser-tested | Targeted objective test passes; repeated target arrival was not reached. |
| Final route stop completes and rewards once | Not browser-tested | Existing atomic completion tests and targeted objective tests pass, but browser flow did not reach `3/3`. |
| Successful shop action advances `shopTransaction` | Not browser-tested | No Phase 1 shop contract was offered in the retained fresh room and the route did not reach a suitable shop flow. |
| Failed/blocked/wrong-shop actions do not advance | Not browser-tested | Covered by server/shop and objective tests, not demonstrated in this browser room. |
| Phone objective and progress readability | Pass | Quest view showed title, faction, complete route clue, `Progress 0/3 stops`, and reward. No overflow at 390×844. |
| TV mission summary readability | Pass | TV showed Echo Triangulation, objective copy, `0/3 stops`, reward, and mission markers on all three target sectors. |
| Movement/encounter focus handoff | Pass | Movement HUD yielded to arrival test and then battle focus without a stale mission or movement overlay collision. |
| Completion inventory and new-mission availability | Not browser-tested | The sampled mission did not complete. |

## Screenshots captured

Screenshots remain untracked under `qa-artifacts/phase1-mission-browser-qa-2026-07-10/`:

- `phone-initial-route-mission.png`
- `phone-route-mission-quest.png`
- `phone-route-after-roll.png`
- `phone-route-after-confirm.png`
- `tv-initial-route-mission.png`
- `tv-route-after-roll.png`

They are QA evidence only and are not intended for commit.

## UI findings

### Phone

- The Quest view is readable at 390×844 and presents the new schema as `0/3 stops`.
- The full route clue is visible: Glass Signal Pier → Coldwind Wharf → Sunken Pier.
- The movement action remained usable without horizontal overflow.
- After rolling, the phone clearly showed two legal destinations, exact route details, and `Confirm Move`.
- No console/page errors were recorded.

### TV

- The active mission rail renders the new objective and progress without a new heavy focus mode.
- All three target sectors receive visible `MISSION` markers.
- Movement remains map-first and server-authoritative.
- Battle/test focus correctly suppresses the movement presentation after arrival.
- No console/page errors or horizontal overflow were recorded at 1366×768.

## Bugs and limitations

### QA-1 — No deterministic browser control for Phase 1 mission targets

- Severity: QA coverage blocker; not a confirmed gameplay defect.
- The starting offer, movement value, reachable destinations, threat draws, and encounter sequence are stochastic.
- A fresh real session can demonstrate normal availability and presentation, but cannot reliably reach a selected route stop or shop transaction within a bounded QA run.
- Recommended follow-up: add a test-only, non-production browser fixture or seeded QA harness that starts a room with a named contract, known sector, known movement roll, and known clear shop stock. It must still submit normal server intents and must never enter release projections.

### QA-2 — Asset audit still enumerates 30 contract images while content validates 36 contracts

- Severity: non-blocking polish/audit coverage.
- The six new contracts use normal card-art fallback behavior, but the asset audit's contract-image summary remains `30 present / 30 total` rather than representing the six new content records.
- This does not block Phase 1 mechanics but should be made explicit before bespoke art production.

## Verdicts

- **Old-contract compatibility:** pass through the full regression suite; no browser regression observed.
- **`multiStopRoute`:** presentation and real movement integration pass; target progression/completion remains browser-unverified.
- **`shopTransaction`:** automated mechanics pass; browser flow remains unverified.
- **Phone/TV UI:** pass for initial state, route markers, roll, selection, confirmation, and focus handoff.
- **Reward/completed inventory/new mission:** browser-unverified because no Phase 1 mission completed.

## Overall verdict

**Incomplete browser sign-off, with no confirmed Phase 1 gameplay blocker.** The browser run validates fresh-session availability, readable phone/TV projection, real movement selection, and focus handoff. It does not provide enough evidence to approve route completion, duplicate suppression, shop progression, reward-once behavior, completed-mission inventory, or new-mission availability from the browser alone.

The existing automated coverage remains green and directly covers the schema and progress rules. A deterministic QA-only fixture is the safest next step before calling Phase 1 browser-verified.

## Follow-up status

This first run remains the record of the stochastic reachability limitation. A guarded deterministic fixture was subsequently added and the missing route, shop, reward, inventory, and new-mission checks were rerun successfully. See `reports/phase1-mission-objectives-deterministic-browser-qa.md` for the final browser verdict.
