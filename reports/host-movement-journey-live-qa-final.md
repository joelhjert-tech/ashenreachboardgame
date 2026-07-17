# Host Movement Journey Live QA — Final Acceptance

## Verdict

Accepted for the tested live path. A fresh authenticated single-player TV/phone session completed a server-authoritative multi-step movement into Ashen Chapel, showed the bounded journey before destination focus, entered Rift Whispers through the normal arrival lifecycle, and did not replay the journey after TV reload.

This was a deterministic authenticated QA-fixture session, not a full campaign playthrough.

## Environment

- Branch: `mission-lifecycle-repair`
- Movement journey baseline: `848baf8`
- QA fixture: `movement-journey / ashen-chapel / withChoirLantern`
- TV viewport: 1366 × 768
- Phone viewport: 390 × 844
- Session mode: fresh single-player room with a valid signed seat token
- Reduced-motion and 1920 × 1080 evidence: retained from the preceding live journey pass documented in `host-movement-journey-live-qa.md`

## Authoritative route

- Operative: Tarek Voss / Void Marshal
- Origin: Scorched Road
- Ordered route: Scorched Road → Blastworks → Ashen Chapel
- Movement distance: 2 edges; 3 displayed route tiles
- Destination selection and confirmation: normal phone controls
- Route validation: normal server movement planner and confirmation

The fixture set only the active operative's starting sector, authoritative movement roll, clean resolution state, and optional exact owned Choir Lantern instance. It did not teleport after confirmation, directly open Rift Whispers, remove the challenge, or bypass route validation.

## Acceptance matrix

| Area | Result | Evidence |
|---|---|---|
| Normal journey | Pass | Departure, ordered intermediate tile, destination, and arrival rendered from the confirmed route. |
| Canonical art | Pass | Scorched Road, Blastworks, and Ashen Chapel used production `BoardTileImage` artwork. |
| Destination focus ordering | Pass | The journey completed before the already-authoritative Ashen Rite focus appeared; journey and focus did not overlap. |
| Recurring challenge handoff | Pass | After the normal Ashen Rite resolution continued, Rift Whispers opened through sector challenge flow. |
| Choir Lantern scope | Pass | `Use Choir Lantern` was available only before the unrolled Rift Whispers anomaly Signal test and showed 2/2 charges. It was not offered for the preceding Guile arrival test. |
| Challenge persistence | Pass | Rift Whispers remained publicly projected after resolution and after TV reload. Existing lifecycle tests cover repeat visits and another operative. |
| Replay/reconnect | Pass | Reload after resolution restored authoritative destination/challenge state without replaying departure. The preceding live pass also reloaded during an intermediate journey step without replay. |
| Reduced motion | Pass | Preceding live capture retained route order, destination, and arrival with reduced motion enabled. |
| Responsive | Pass | 1366 × 768 final run had no document overflow. Preceding live evidence passed 1920 × 1080. |
| Runtime safety | Pass after correction | No page errors, console errors, canvas, or WebGL in the final rerun. |
| Public/private boundary | Pass | TV showed public route and challenge data only; remaining charges and private item action remained on the owning phone. |

## Confirmed corrections

1. `fix: preserve movement journey before arrival focus`
   - Queues the bounded journey before an immediate authoritative destination focus.
   - Prevents journey/focus overlap and replay.
   - Avoids the movement legend collision at 1366 × 768.

2. `fix: render duplicate battle modifiers safely`
   - Final Choir Lantern QA exposed a React duplicate-key warning when two legitimate modifier rows had the same label and value.
   - The rendering key now includes row position; no gameplay or projection data changed.
   - The authenticated rerun produced no console or page errors.

## Screenshots

All captures are untracked under `qa-artifacts/movement-journey-live/`.

- `final-ashen-01-destination-preview-tv-1366x768.png` — 1366 × 768
- `final-ashen-01-destination-preview-phone-390x844.png` — 390 × 844
- `final-ashen-02-departure-tv-1366x768.png` — 1366 × 768
- `final-ashen-03-first-step-tv-1366x768.png` — 1366 × 768
- `final-ashen-04-intermediate-tv-1366x768.png` — 1366 × 768
- `final-ashen-05-arrival-tv-1366x768.png` — 1366 × 768
- `final-ashen-06-rift-whispers-tv-1366x768.png` — 1366 × 768
- `final-ashen-06-rift-whispers-phone-390x844.png` — 390 × 844
- `final-ashen-07-after-resolution-tv-1366x768.png` — 1366 × 768
- `final-ashen-07-after-resolution-phone-390x844.png` — 390 × 844
- `final-ashen-08-reload-tv-1366x768.png` — 1366 × 768

## Limitations

- The run used the authenticated QA fixture to establish a reachable starting state and exact movement roll; it was not a complete live campaign.
- A second physical revisit was not scripted. Persistence was verified through the authoritative post-resolution projection and reload, while repeat-visit behavior remains covered by the landed engine tests.
- The final Ashen Chapel rerun was at 1366 × 768. The 1920 × 1080 and reduced-motion checks are the live evidence recorded in the preceding partial report rather than duplicate final-run captures.

## Verification

The exact committed HEAD was checked in a clean worktree so unrelated destination-worktree TV WIP did not alter the result.

- Content validation: passed
- Typecheck: passed
- Engine tests: 257 passed
- Client tests: 228 passed
- Full suite: 690 passed
- Asset audit: 404/404 present
- Production build: passed
- `git diff --check`: passed
- Three.js regression: passed as part of the client and full suites

The dirty destination worktree separately has one interleaved TV assertion mismatch (`Tactical map`) in `TvApp.test.tsx`; it is unrelated to the committed movement journey and passes at committed HEAD. That unrelated WIP was not modified for this acceptance pass.

## Final conclusion

The movement journey, destination-test handoff, recurring Rift Whispers handoff, reconnect/replay protection, reduced-motion presentation, and tested responsive layouts meet the stated acceptance boundary. No movement legality, route calculation, server position, challenge rules, mission lifecycle, phone movement rules, or public/private projection boundary changed.
