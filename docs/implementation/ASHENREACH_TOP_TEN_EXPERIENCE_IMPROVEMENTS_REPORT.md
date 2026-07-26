# Ashenreach Top-Ten Experience Improvements

## Outcome

The coordinated phone-and-TV refinement is implemented without changing gameplay rules, random outcomes, saves, event formats, movement authority, rewards, privacy boundaries, or artwork.

The final presentation provides:

- One stable result verdict with final totals, applied consequence, up to four meaningful deltas, collapsed lore, and one Continue action.
- A visible arrival lifecycle queue on phone and a public-safe abbreviated queue on TV.
- Semantic routing that keeps movement checks on Move, non-opposed challenges on Action, and opposed enemies on Battle.
- Recoverable submissions with no automatic intent retry.
- Compact S21 setup screens and a public-safe turn handoff ledger.

Generated images: **0**. Existing assets modified: **0**.

## One authoritative result experience

`PhoneResultReadyGate` is now the reusable settled-result surface for:

- Movement approach checks.
- Hazards, anomalies, direct tile tests, and scenario tests.
- Opposed enemy battle outcomes.
- Rewards and penalties projected with a settled result.

The same verdict remains mounted while the server advances from roll result through applied consequence to acknowledgement. It contains only actor/challenge presentation, final totals, outcome, consequence, up to four deltas, collapsed lore, and one Continue action.

The movement verdict uses the destination's existing Signal Theatre environment art. Physical S21 QA caught and corrected a fallback-letter regression in the generic movement-resolution path.

## Arrival lifecycle

The phone arrival summary now renders the authoritative `PublicTileArrivalState` as an ordered queue with text, Phosphor icons, and explicit status:

1. Recurring tile challenge.
2. Threat lane draws in authored order.
3. Scenario confrontation.
4. Optional action or service.

States distinguish current, pending, completed during this arrival, recurring, and optional entries. “No threat drawn” is an inline completed entry rather than a full-screen verdict.

The Signal Theatre sector brief renders a bounded public-safe version of the same queue.

## Semantic routing

- Movement-origin resolutions require Move.
- Hazards, anomalies, direct tile tests, and scenario tests require Action.
- Battle is reserved for opposed enemies and enemy reactions.
- Client fallback routing and server required-action projection use the same distinction.
- Owner choices and rivalry details remain private.

## Submission recovery

The room subscription now reports whether an intent was placed on an open socket and exposes an explicit client resynchronization action.

Required actions, Continue, End Turn, setup, inventory, shop, and movement submissions use a six-second watchdog:

- Rejected socket sends clear pending state immediately.
- No command is resent automatically.
- A stalled submission displays “Restoring latest state” and reconnects.
- Controls unlock only after a fresh synchronized patch confirms the action remains legal.
- Timers clear on patch change, disconnect, teardown, and unmount.

## Compact S21 setup

At the measured 384×722 Chrome viewport:

- All six piece candidates and Continue are visible on the piece step.
- The first operative identity, essential rule, and Select action fit without a full-card scroll.
- Back to Pieces is in the setup header and no longer overlays portrait content.
- Mission art remains contained and adaptive.
- Unselected mission cards are not obscured by the Ready/Start dock.
- The selected mission retains a clear setup completion action.

Evidence:

- `.tmp-playtest/top-ten-experience/s21-piece-384x722.png`
- `.tmp-playtest/top-ten-experience/s21-operative-fixed-384x722.png`
- `.tmp-playtest/top-ten-experience/s21-mission-fixed-384x722.png`
- `.tmp-playtest/top-ten-experience/s21-mission-selected-384x722.png`
- `.tmp-playtest/top-ten-experience/s21-movement-roll-384x722.png`
- `.tmp-playtest/top-ten-experience/s21-approach-result-final-384x722.png`

## Turn handoff ledger

The server derives up to four public summary entries from allowlisted authoritative events between adjacent `TURN_COMPLETED` boundaries:

- Movement destination.
- Principal public challenge result.
- Public reward or penalty.
- Public pressure change.

The TV motion cue and next phone required action show the ledger briefly. It does not delay the turn or require acknowledgement, and it excludes private agenda and owner-only choice data.

## Accessibility

- Result meaning is expressed through text, totals, and labels rather than colour alone.
- Arrival queue state uses text and icons.
- Result portraits retain descriptive alternative text and existing fallbacks.
- Lore uses native disclosure semantics.
- One primary Continue action avoids duplicated focus targets.
- Submission recovery uses an announced status without automatically repeating commands.
- Reduced motion preserves the same state and information.

## Browser and physical QA

### Samsung S21+

Physical Chrome was exercised through USB debugging at a measured 384×722 CSS viewport. Setup, movement roll, destination flow, and an authoritative movement verdict were reviewed. No horizontal page overflow, clipped primary action, duplicate verdict, or dead result state was observed after the fixes.

### Signal Theatre TV

Chrome layout measurements:

| Viewport | Horizontal overflow | Vertical overflow |
|---|---:|---:|
| 1366×768 | No | No |
| 1600×900 | No | No |
| 1920×1080 | No | No |

The active host remained board-dominant and the sector brief stayed bounded at all three sizes.

## Verification

| Check | Result |
|---|---|
| Content validation | Passed: 18 characters, 71 gear, 109 threats, 36 contracts, 20 anomalies, 30 artifacts, 24 followers, 24 scars, 16 escalations, 30 afflictions |
| Typecheck | Passed |
| Focused result, recovery, routing, arrival, and handoff tests | 170 passed |
| Client suite | 538 passed |
| Server integration suite | 389 passed |
| Engine and rules suite | 829 passed |
| Production build | Passed |
| Asset audit | 511/511 present; 0 missing, invalid, placeholder, or release-blocking |
| Diff whitespace check | Passed |
| Artwork diff | None |
| Staged files | None |
| Commit or push | None |

The client suite emits only the existing intentional missing-art fallback diagnostics in tests that explicitly exercise fallback behavior.

## Files changed

The implementation changes are limited to phone presentation and recovery, shared subscription/types, Signal Theatre arrival/handoff presentation, server projection derivation, focused tests, shared CSS, and this report.

The three pre-existing untracked legacy research reports remain untouched and uncommitted.
