# P8 Shared Presentation Consolidation Report

## Outcome

P8 consolidates the cross-feature presentation behavior introduced in P0-P7 without changing gameplay authority, sequencing, routes, calculations, privacy, or save data. Setup, required actions, movement, encounters, results, handoff, shop, player card, and inventory now share image containment, status vocabulary, motion preferences, focus rules, live announcements, safe-area variables, and minimum interaction sizing.

## Shared implementation

### Artwork

- `ArtworkFrame` owns aspect ratio, contain/cover behavior, loading state, cached-image recovery, deterministic fallback, and accessibility semantics.
- `HostImage`, `CardArtImage`, and `OperativePortraitImage` preserve feature APIs while using the shared implementation.
- Fallbacks expose generic player-facing labels and authored alternative text, never stable IDs or paths.
- Current focal art may load eagerly; browsing and inventory art remain lazy.

### Motion

- Shared durations and easings live in `motionTokens.ts` and CSS variables.
- `useReducedMotion` is now the common preference reader used by the scenario carousel and TV movement presentation.
- Existing meaningful timings remain feature-owned: movement segments, dice presentation, and the 900 ms handoff.
- No animation callback authors a gameplay result.

### Focus and announcements

- `useFocusOnRevision` focuses a meaningful state once per authoritative revision and does not steal focus on unchanged projections.
- `LiveStatus` deduplicates revision/message pairs and clears stale announcements.
- Required-action and movement surfaces no longer produce nested or per-frame live-region noise.
- Battle focus is immediate on authoritative stage entry, preserving existing test and couch-display behavior.

### Phone constraints

- One shared set of safe-area, navigation-height, sticky-action-clearance, and 44 px target variables replaces feature-local assumptions.
- Critical verbs and blocked reasons wrap.
- Targeted fixes cover character filters, compact portrait navigation, shop purchase controls, and wrap-card actions without compressing large selection cards.

### QA-only presentation fixture

`SharedPresentationQaFixture` is loaded only when the development build receives `?qaPresentation=p8`. It provides deterministic broken-image, long-name, long-rule, blocked-action, and live-status states. It does not issue commands or alter server state and is removed by the production environment guard.

## Feature migration map

| Slice | Consolidated behavior | Preserved exception |
|---|---|---|
| P0/P1 required action | Focus-on-revision, status terms, one live source, target sizing | Server legal-action ranking remains unchanged |
| P2 movement | Shared focus/live status and reduced-motion source | 300/520/680/760 ms journey pacing remains route-specific |
| P3 encounter/battle | Shared portrait framing and stage focus | Dice and comparison timing remain battle-specific |
| P4 waiting/handoff | Shared status vocabulary and safe sizing | 900 ms narrative handoff remains intentional |
| P5 setup/lobby | Shared safe areas, wrapping, and image contracts | Lobby grid and six-seat composition remain feature-owned |
| P6 shop | Shared card art, target minimums, status terms | Transaction animation remains shop-owned |
| P7 player/inventory | Shared portraits/card art, lazy images, long-copy wrapping | Inventory grouping and Relevant Now ranking remain feature-owned |

## Performance findings

- Artwork frames reserve layout space before decode, eliminating image-driven layout jumps.
- Cached image completion is handled synchronously rather than leaving a blank loading shell.
- Off-screen card art remains lazy; focal art can request high priority.
- No new dependency was added.
- Production build succeeds with 557 transformed modules. Shared CSS remains in the existing bundle rather than introducing a new runtime chunk.
- Browser QA found no repeated remount symptom, page overflow, or console error. Detailed network-level duplicate-request profiling remains a possible future performance audit, not a release blocker for P8.

## Accessibility and privacy

- Minimum measured phone target is 44 px.
- Meaningful missing images retain authored accessible names; decorative failures are hidden.
- Status changes are announced once by revision; animation frames are not announced.
- Reduced motion removes motion without removing information.
- No projection was widened. Owner-private inventory, mission, Artifact, Rivalry, and choice data remain phone-only.

## Four-seat critique

### New player

The primary state and action are consistent across screens, and missing art no longer looks like a broken application. Correction: generic “loading” and duplicated status regions were replaced by state-specific labels and a single live source.

### Optimizer

Animation does not delay commands or change legal timing, and state restoration does not replay focus/announcement revisions. Preserved exception: route and dice timings remain readable rather than being shortened into generic panel motion.

### Family/casual player

Touch targets, wrapping, and intermediate viewport behavior are materially more reliable. Correction: the first broad minimum-target rule made setup cards too compact, so it was replaced with exact compact-control selectors.

### Rules lawyer

Visible status and focus are derived from authoritative revisions, not local completion. Public TV strings remain projection-safe. No gameplay command, calculation, or continuation was moved into presentation code.

## Verification

| Check | Result |
|---|---|
| Content validation | PASS: 18 characters, 71 gear, 109 threats, 36 contracts, 20 anomalies, 30 artifacts, 24 followers, 24 scars, 16 escalations, 30 afflictions |
| Typecheck | PASS |
| Client | PASS: 405/405 |
| Engine plus rules | PASS: 763/763 |
| Rules subset | PASS: 64/64 |
| Integration | PASS: 353/353 |
| Constituent total | PASS: 1,521 tests |
| Aggregate wrapper | Timed out after 300 seconds without reporting a failing test; every constituent suite passed independently |
| Production build | PASS: 557 modules transformed |
| Asset audit | PASS: 435/435 present, 0 missing, 0 invalid, 0 placeholders |
| Browser QA | PASS: 33 screenshots, 2 curated recordings, 0 overflow, 0 undersized measured controls, 0 console errors |
| Reduced motion | PASS on phone and TV |
| Diff whitespace | PASS for both working and staged diffs; line-ending conversion notices are repository configuration warnings only |

## Remaining risks and non-goals

- Feature-specific artwork outside the P0-P7 paths is not mechanically migrated merely for consistency; its next modification should adopt `ArtworkFrame` or a domain adapter.
- Browser QA uses Chromium. Safari safe-area behavior is covered structurally by `env(safe-area-inset-*)` but not device-lab tested in this pass.
- The aggregate command duration exceeds the available wrapper window. This is a suite-runtime concern, not a detected correctness failure; the exact constituent commands and results are recorded above.
- The two missing rule-spine documents referenced by earlier work are still absent from the repository; P8 therefore uses the available UI direction and established server-authority rules.

## Scope confirmation

No game rules, result math, movement route, economy behavior, encounter resolution, save schema, projection visibility, or server authority changed as part of the P8 consolidation. Existing dirty P0-P7 and map/action work was preserved. Nothing was committed or pushed.
