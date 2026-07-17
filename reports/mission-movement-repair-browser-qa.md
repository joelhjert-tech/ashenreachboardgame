# Mission Lifecycle and Movement Repair Browser QA

Date: 2026-07-10  
Result: **Partial pass with one fixed TV layout blocker and one unresolved browser-lifecycle blocker**  
QA mode: Fresh-server, fresh-room browser QA; no prior room or browser authentication reused.

## Environment

| Item | Value |
| --- | --- |
| Browser | Headless Chromium through Playwright |
| Server | Fresh `npm.cmd run dev` process managed and stopped by the QA harness for every attempt |
| Client | `http://127.0.0.1:5173` |
| API/WS | `http://127.0.0.1:8080` |
| TV viewport | 1366×768 |
| Phone viewport | 390×844 |
| Optional TV viewport | 1920×1080 not run |
| Session mode | Fresh single-player / co-op interaction |
| Scenario | The Mirror of False Heroes (chosen to avoid the Broken Seal's optional opening threat surge) |
| Character | MASTER ALPHA, QA-only reliable test character |
| Mission | Beacon Quieting — one authoritative enemy defeat required |
| Storage | TV and phone storage cleared before applying only the new room credentials |
| Runtime errors | No browser console errors, page errors, horizontal overflow, or canvas/WebGL surfaces |

The QA harness discarded rooms whose random starting mission offers did not include Beacon Quieting and discarded movement rolls whose legal routes did not include a sector backed by a populated encounter deck. It did not modify server state, inject reducer actions, or bypass movement/mission validation.

## Freshness confirmation

- No Ashen Reach Node/Vite server was listening before QA. The existing launcher window had no child Node process.
- Every browser attempt started a new managed server and created a new room.
- Phone and TV local/session storage were explicitly cleared before authentication.
- Fresh inventory showed `Completed Missions 0/3 toward an Artifact trade`.
- No stale active or completed mission state was observed.
- The helper terminated its command shell after each run but left ten orphaned `tsx scripts/dev.ts` process pairs during repeated discarded-room attempts. Final cleanup stopped all 20 repo-scoped Node processes; ports 5173 and 8080 are clear and no QA dev server remains running.

## Verdict table

| Target | Verdict | Evidence |
| --- | --- | --- |
| Fresh room and zero completed missions | PASS | Fresh private inventory rendered `0/3 toward an Artifact trade`. |
| Mission objective can be pursued from authoritative play | PASS | Beacon Quieting was accepted through the normal starting-mission UI; legal movement and populated encounter destinations were used. |
| Mission completion and immediate reward | BLOCKED | The arrival approach resolution remained in the battle-resolution handoff during repeated browser automation attempts; Action stayed locked behind `Resolve battle first`, so the completion button could not be reached honestly. Engine/integration tests pass but are not substituted for a browser verdict. |
| Duplicate reward prevention | BLOCKED | Could not reach the first browser completion. Existing reducer tests pass. |
| New mission availability after completion | BLOCKED | Could not reach browser completion. Existing engine/integration coverage passes. |
| Completed mission stored as 1/3 | BLOCKED | Fresh 0/3 state passed; post-completion storage could not be observed in the browser. Component and engine tests pass. |
| Progress survives ordinary transitions | PARTIAL | Fresh inventory remained 0/3 across lobby-to-active and tab transitions; completed-state persistence was not reached. |
| Relic dealer offers artifact trade | NOT REACHED | No relic dealer was reached in the fresh route. Server projection/tests contain the service. |
| Fewer than three missions rejected | TEST-ONLY PASS | Engine/server tests pass; not browser-reached. |
| Three missions consumed and artifact granted | TEST-ONLY PASS | Engine test passes; not browser-reached. |
| TV post-roll HUD compact and in viewport | PASS | HUD measured 1024×146 and remained entirely inside 1366×768. |
| Board large and central after roll | PASS AFTER FIX | Before fix, board was 217×514 at far left. After focused CSS fix, it measured approximately 1328×660. |
| HUD roll/count/phone instruction | PASS | Rendered roll total, modifier, legal destination count, and `Choose on phone`. |
| Destination appears on TV before confirmation | PASS | Selected destination name appeared on TV immediately after phone selection. |
| Phone Roll Movement initially visible | PASS | Button bounding rectangle was inside the 390×844 viewport. |
| Phone Confirm Move initially visible | PASS | Button bounding rectangle was inside the 390×844 viewport after selection. |
| Phone movement die readable | PASS | High-contrast movement dice/result presentation rendered at 390×844. |
| Phone avoids contradictory movement copy | PASS | Arrival showed `Arrival resolving`; `No movement choice` was not shown during travel/arrival capture. |
| Battle/test suppresses movement and arrival HUD | PASS | Arrival approach test owned the TV; neither movement HUD nor arrival panel remained above it. |
| Shop suppresses movement and arrival HUD | TEST-ONLY PASS | Existing TV tests pass; no shop was reached in browser QA. |
| Arrival sector brief content | NOT OBSERVED | Each captured arrival immediately activated the higher-priority approach test/battle focus, correctly suppressing the brief. A no-test arrival is needed for direct brief QA. |
| Normal board returns after focus | PARTIAL | Movement HUD returned to full board before selection; the post-arrival resolution blocker prevented a full end-to-end return check. |

## Blocking issues and fixes

### Fixed — P1: movement focus collapsed the board

**Observed:** At 1366×768 after rolling, the board collapsed to roughly 217×514 on the far left while the movement HUD occupied a separate implicit grid row. Most of the TV became an empty black area.

**Cause:** The rail-free movement stage did not explicitly lock its grid to one full-size row/column. The map shell and HUD could create implicit tracks, and nested board wrappers retained intrinsic sizing.

**Focused fix:** The movement focus stage now uses one `minmax(0, 1fr)` row and column; its map shell, board panel, board shell, and board stage stretch to 100%; the HUD is explicitly absolute; and the board stage drops its conflicting aspect-ratio constraint in this focus mode only.

**Retest:** PASS. Board measured approximately 1328×660 at 1366×768. The compact bottom HUD remained visible and did not overlap the top header or QR.

### Open — P1 QA blocker: arrival resolution did not release browser flow

**Observed:** After an authoritative movement roll, destination selection, confirmation, and successful arrival approach check, the phone showed `CONTINUE`. Repeated normal browser continuation attempts did not reach the subsequent encounter/action state reliably. The Action tab remained locked with `Resolve battle first`.

**Impact:** Browser QA could not honestly complete Beacon Quieting, observe its immediate reward, verify 1/3 storage, accept another mission, or reach a relic dealer. This does not prove the reducer lifecycle is broken: all engine, client, integration, and full-suite tests pass. It does prove that the fresh browser path remains unverified and needs a short manual or instrumented follow-up around `CONTINUE_RESOLUTION` and the movement-to-sector handoff.

**Recommended next fix/diagnostic:** Capture WebSocket `INTENT_REJECTED`/state-patch stages for the arrival `CONTINUE_RESOLUTION` click, then verify the expected sequence `roll_result -> outcome_summary/awaiting_continue -> sector -> encounter/action`. Fix only the first divergent stage.

### Tooling — P2: repeated helper runs left child dev processes

The server lifecycle helper stopped its parent command but did not reap the nested `tsx` children on Windows. Repeated clean-room attempts therefore shifted to higher ports even though the browser continued using the first server. All repo-scoped `scripts/dev.ts` processes were explicitly stopped at the end. Future Windows browser QA should launch one server once, reset rooms through the API, and terminate the complete process tree after the run.

## Movement route exercised

Multiple clean-room rolls were sampled because stock encounter data exists only for part of the expanded board. Captured routes included:

- Ashwalk Bridge to Colony Outskirts;
- Ashwalk Bridge to Deadwater Marsh;
- Ashwalk Bridge to Pilgrim Lock Gate;
- Ashwalk Bridge to Rusted Transit Gate;
- Ashwalk Bridge to Glass Signal Pier.

The most useful focus-priority capture used Rusted Transit Gate or Glass Signal Pier, where an arrival approach test immediately replaced movement focus.

## Screenshot inventory

Screenshots are untracked under `qa-artifacts/mission-movement-fresh-session-2026-07-10/` and were not staged or committed.

| Screenshot | Purpose |
| --- | --- |
| `01-phone-fresh-active.png` | Fresh active phone state |
| `02-tv-fresh-active.png` | Fresh active TV state |
| `03-tv-opening-battle-focus.png` | Optional opening-focus priority capture from a discarded clean room |
| `04-phone-before-roll.png` | Roll Movement visible at 390×844 |
| `05-phone-after-roll.png` | Readable dice and legal destinations |
| `06-tv-after-roll.png` | Repaired full-size board with compact bottom HUD |
| `07-phone-destination-selected.png` | Selected destination and Confirm Move |
| `08-tv-destination-selected.png` | TV destination update before confirmation |
| `09-tv-arrival-immediate.png` | Immediate arrival handoff |
| `10-phone-arrival.png` | Phone arrival-resolving state |
| `11-tv-arrival-or-focus.png` | Higher-priority arrival test/battle focus with movement suppressed |
| `11b-phone-battle-ready.png` | Phone arrival result waiting to continue |

## Verification

| Command | Result |
| --- | --- |
| `npm.cmd run validate:content` | PASS — 17 characters, 63 gear, 109 threats, 30 contracts, 20 anomalies, 30 artifacts, 24 followers, 15 scars, 16 escalations, 30 afflictions |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run test:engine` | PASS — 15 files, 239 tests |
| `npm.cmd run test:client` | PASS — 24 files, 220 tests |
| `npm.cmd run test` | PASS — 59 files, 645 tests |
| `npm.cmd run build` | PASS |
| `git diff --check` | PASS; output contains only pre-existing LF/CRLF warnings from unrelated dirty files |

## Files changed in this pass

- `src/client/styles.css` — focused movement-stage board-stretch fix.
- `reports/mission-movement-repair-browser-qa.md` — this report.

No mission content, reward logic, server mission mechanics, phone components, TV components, shop mechanics, or game rules were changed. Existing dirty phone/TV/item-tier work and untracked QA screenshots were not staged or committed.

## Commit decision

No commit was created. The QA did not fully pass, and the worktree contains extensive unrelated WIP. The report and focused CSS fix should be reviewed with the arrival-resolution follow-up before any scoped commit is prepared.
