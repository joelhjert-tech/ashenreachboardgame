# S21 Single-Player Gameplay and Text Review

Date: 2026-07-26
Scenario: The Broken Seal
Mode: single-player, cooperative rules
Device: Samsung Galaxy S21+
Physical display: 1080 × 2400
Measured Chrome viewport: 384 × 722 CSS pixels at 2.8125 device-pixel ratio
Original and restored Android font scale: 1.0

## Outcome

One genuine server-authoritative game was played through the physical S21 controller to a natural defeat. The session ended when Escalation reached 8/8; victory progress was 0/2. The controller performed 73 legal visible actions, reached the terminal `ended` state, and did not use state injection, forged dice, or direct gameplay commands.

The completed run covered setup, movement roll, destination selection, route confirmation, cross-reach guidance, arrival, a recurring tile challenge, an enemy battle, reward presentation, inventory, shop handling, pressure, result acknowledgement, handoff, reconnect restoration, and endgame. Important states not naturally selected or drawn were covered by the existing deterministic client, engine, and integration tests.

Raw privacy-safe evidence is stored outside Git under:

`.tmp-playtest/s21-single-player-readability-review`

The accepted natural run is:

`.tmp-playtest/s21-single-player-readability-review/natural-attempt-4/broken-seal-1p`

It contains 36 phone/TV screenshots and 12 typography checkpoints. No room code, credentials, private messages, or private objective text is included in this report.

## Gameplay findings

- Server-authored movement, routes, dice, challenges, rewards, pressure, and endgame remained authoritative.
- Arrival and challenge progression continued without duplicate effects.
- Result-ready state restored after reconnect and did not replay its consequence.
- The final session had zero phone console errors, zero TV console errors, zero failed requests, zero horizontal-overflow detections, and no canvas/WebGL nodes.
- No rules, probabilities, save format, protocol, privacy projection, or artwork changed during this refinement.

## Defects and iterative refinements

| Defect | Evidence before | Cause | Selected refinement | Verification |
|---|---|---|---|---|
| A completed failed test could show a stale `Continue` action while forced displacement still required acknowledgement. The stale action did nothing and could strand automation or confuse a player. | Natural attempt 3, pending forced-displacement stall | The orphan-outcome fallback did not exclude owner choices that were still authoritative and pending. | Suppress orphan `Continue` whenever any owner resolution choice is pending. Keep only the real forced-displacement action. | Focused forced-displacement regression and the complete phone suite pass. |
| Choose Piece and Choose Operative could open partway down the page after the Join view had scrolled. | Initial physical setup screenshots | The document scroll position survived the local setup-step transition. Resetting only the inner setup scroller was insufficient. | Reset the document root, body, and setup scroller before paint whenever the seat, setup revision, or setup step changes. | Physical S21 before/after run in `setup-after-2`; component regression verifies all three scroll positions return to zero. |
| `Back to Pieces` measured 36 CSS pixels high. | Enlarged-text setup capture | The setup-only button used a smaller historical minimum height. | Raise its minimum height to 44 CSS pixels. | Physical S21 enlarged-text capture and 320/430 responsive checks show no clipping or undersized visible setup buttons. |
| At enlarged text, `Choose Operative` truncated and the three filters compressed. | `enlarged-text` physical capture at 125% page text plus Android font scale 1.15 | A single-line ellipsis and equal three-column grid did not have enough width. | Allow the operative heading to wrap, give the first two filters more width, reduce excessive tracking, and use a two-row filter arrangement at 340px and below. | `enlarged-text-after` physical S21 capture plus 320 × 568 and 430 × 932 browser checks pass without overflow or clipping. |
| Result-ready repeated large player-total and difficulty-total text beneath a seal that already communicated the result. | Previous result-ready presentation | Duplicate visual arithmetic competed with the portrait composition and consequence. | Keep one central `Total` seal. Preserve both authoritative totals in its accessible name, while removing the duplicate visible comparison block. | Physical result-ready screenshot, approach/hazard/battle component tests, and full client suite pass. |
| The campaign driver could click a stale numeric button index after a projection update. | Natural attempt 2 | The evidence harness retained an index rather than the visible button identity. | Match current controls by test ID, accessible label, text, and only then position; retry after a projection change. | The final 73-action run completed without a harness stall. This changes QA tooling only. |

## Typography and layout review

### Accepted hierarchy

- Primary outcomes and the central total use large display type and remained readable at the measured S21 viewport.
- Primary controls remain at least 44 CSS pixels high. `Continue`, movement, destination, confirmation, and end-turn actions stayed clear of the Android and in-app navigation areas.
- Essential result and action copy is high contrast, short, and visually dominant.
- Smaller navigation captions and compact status metadata remain intentionally secondary; they do not carry exclusive gameplay meaning.
- The result comparison remains fully available to assistive technology even though the duplicate visible line was removed.
- Body copy and card rules wrap without horizontal clipping. Long content remains scrollable above stable actions.

The automated text sampler reports visually hidden accessibility labels as one-pixel clipped nodes and counts compact navigation captions against body-text targets. Those are expected false positives. Physical screenshots and target measurements were used to distinguish them from visible defects.

### S21 physical checks

- Normal text: setup, mission selection, movement, destination, route, result-ready, resolution entry, handoff, and endgame.
- Enlarged text: piece, operative, mission, and movement states at 125% page text plus Android font scale 1.15.
- Device font scale was restored to 1.0 after both stress passes.
- Setup headings, filters, artwork frames, and sticky actions remained in bounds after refinement.

### Responsive browser checks

| Viewport | Piece | Operative | Mission | Horizontal overflow | Small visible setup controls |
|---|---|---|---|---:|---:|
| 320 × 568 | pass | pass | pass | 0 | 0 |
| 430 × 932 | pass | pass | pass | 0 | 0 |

The operative filter becomes two rows only at the narrow breakpoint; the production S21 retains the balanced three-column arrangement.

## Reconnect, privacy, and accessibility

- Result-ready restored from the latest authoritative projection after reconnect.
- Completed movement and consequences did not replay.
- No automatic gameplay retry was introduced.
- Pending owner choices remain private and now correctly outrank the generic outcome acknowledgement.
- The visible result seal exposes a complete accessible label containing player and challenge totals.
- Colour is not the sole carrier of outcome or action meaning.
- Enlarged text and reduced-motion information remain complete through existing semantic and motion-token behavior.

## Validation

| Check | Result |
|---|---|
| Content validation | pass — 18 characters, 71 gear, 109 threats, 36 contracts, 20 anomalies, 30 artifacts, 24 followers, 24 scars, 16 escalations, 30 afflictions |
| TypeScript typecheck | pass |
| Focused phone regressions | pass — 110 tests across PhoneApp, PhoneActionPanel, and hazard/challenge result coverage |
| Complete combined suite | pass — 187 files, 1,756 tests |
| Client suite | pass — 69 files, 538 tests |
| Engine and rules suites | pass |
| Server integration suite | pass — 45 files, 389 tests |
| Production build | pass — 634 modules transformed |
| Asset audit | pass — 511/511 present, zero missing, invalid, placeholder, or release-blocking assets |
| Physical S21 game | pass — terminal authoritative defeat, 73 legal actions |
| Physical console/network review | pass — zero recorded errors or request failures |
| Horizontal overflow | pass — zero in the accepted natural run and responsive setup matrix |
| Art diff | pass — zero artwork files changed |
| Staged files | zero |
| Commit or push | none |

The first unbounded monolithic run exposed a load-sensitive one-second setup-test wait. The production behavior and isolated test were already passing. The helper now allows five seconds for the asynchronous setup render, and the complete 1,756-test aggregate passes with bounded worker concurrency.

## Files changed

- `scripts/run-s21-full-game-campaign.ts`
- `src/client/phone/PhoneActionPanel.tsx`
- `src/client/phone/PhoneApp.tsx`
- `src/client/phone/PhoneResultReadyGate.tsx`
- `src/client/phone/__tests__/PhoneActionPanel.test.tsx`
- `src/client/phone/__tests__/PhoneApp.test.tsx`
- `src/client/phone/__tests__/PhoneHazardChallengePrototype.test.tsx`
- `src/client/styles.css`
- `docs/qa/S21_SINGLE_PLAYER_GAMEPLAY_TEXT_REVIEW.md`
- `docs/qa/S21_SINGLE_PLAYER_GAMEPLAY_TEXT_SUMMARY.json`

## Concrete remaining risks

- A single natural game cannot guarantee that every authored card length and every rare private reaction is physically optimal. Those paths remain covered by deterministic tests rather than this specific draw sequence.
- The automated run completes legal actions much faster than a human player. It validates correctness and rendered states, but not human decision-time pacing.
- The complete suite takes about eight minutes on this workstation, so future physical-device iterations should continue to use focused tests during refinement and the combined suite for final validation.
