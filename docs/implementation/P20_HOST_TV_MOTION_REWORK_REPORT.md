# P20 Host TV Motion Rework Report

## Outcome

P20 adds an original, server-authoritative host presentation layer while
preserving P0–P19 gameplay, privacy, save, reconnect, network, art, and phone
behavior.

## Runtime files changed

- `src/client/tv/HostMotionCue.tsx`
- `src/client/tv/TvApp.tsx`
- `src/client/styles.css`
- `src/server/phaseOneQaFixture.ts` (development fixture isolation only)
- `src/client/tv/__tests__/HostMotionCue.test.tsx`
- `src/client/tv/__tests__/p20ReferenceCompliance.test.ts`
- `src/server/__tests__/phaseOneQaFixture.test.ts`
- `scripts/capture-p20-host-tv-qa.ts`
- `scripts/capture-p20-six-player-qa.ts`

P20 research, plan, design, implementation, and QA reports were also added or
updated.

## Architecture

`buildHostMotionCueModel` is a pure adapter from the public patch to one
presentation model. `HostMotionCue` adds session-scoped entrance
acknowledgement only.

Presentation precedence is:

`ended → focused movement owns screen → handoff → battle → active resolution
(unless arrival) → arrival → movement planning → shop → final stage → required
action`

The cue has no network, intent, gameplay, random, command, or durable
persistence dependency.

## TV flows

- Setup/game start: ready state, game summary, board reveal, first actor, and
  first action remain readable.
- Turn start: actor, sector, instruction, and next action are co-located.
- Movement: roll, legal destinations, route, intermediate step, and arrival use
  one dedicated presenter with no competing cue.
- Encounter: existing art and arithmetic retain focus; public instructions sit
  above the chamber.
- Penalty/reward: public consequence or gain receives an explicit label, reason,
  and result-stage position.
- Combat: combatants, relevant stat, dice, bases, modifiers, totals, result, and
  consequence remain auditable.
- Waiting: private decisions identify actor and wait reason without option data.
- Automated public state: arrival stack shows current mandatory rule and public
  progress without simulated AI behavior.
- End Turn/handoff: canonical handoff identity replaces the old 900 ms
  timer-owned banner.
- Progress/pressure/final: P14 projections and overlays remain authoritative.
- Victory/defeat: ended state suppresses the cue and yields to stable results.
- Reconnect: identical motion ID restores settled without replay.

## Fixture and capture improvements

- Prior QA movement rolls do not leak into unrelated navigation fixtures.
- Prior arrival, tile-challenge, displacement, and Suture Storm presenters are
  cleared before the next deterministic fixture.
- Movement route captures wait for step 1, step 2, and arrived state.
- Handoff capture waits for the canonical handoff ID.
- Long-content and missing-art evidence uses the existing development-only
  shared recovery fixture.

## Reference-code decision

No reference module was copied or translated. All readable Java was decompiled,
Android-specific wrapper/support code with no local licence. The actual
presentation engine remained opaque inside native/DTRZ content. Ashenreach uses
its existing TypeScript, React, CSS, public projection, and motion tokens.

## Art protection

- Ashenreach art files modified: 0.
- Ashenreach art files added: 0.
- Ashenreach art files removed: 0.
- Reference-game assets transferred: 0.
- Existing art is framed, layered, dimmed, or masked only by presentation CSS.

## Focused verification

- Motion, fixture-isolation, privacy, and reference-compliance tests: 52/52.
- Expanded host/state-ordering matrix: 203/203.
- Typecheck: passed.
- Browser evidence: 90 screenshots.
- Complete host recording: 136.36 seconds.
- Six-player recording: 16.48 seconds.
- Browser overflow: 0.
- Console/page errors: 0.

## Complete verification

- Content validation: passed (18 characters, 71 gear, 109 threats, 36
  contracts, 20 anomalies, 30 artifacts, 24 followers, 24 scars, 16
  escalations, and 30 afflictions).
- Typecheck: passed.
- Reference-code compliance: 4/4.
- Focused host, movement, encounter, penalty/reward, battle, waiting/handoff,
  progression/endgame, reconnect, privacy, reduced-motion, and state-ordering
  tests: 203/203.
- Client suite: 56 files, 461/461.
- Server integration suite: 43 files, 377/377.
- Engine suite: 71 files, 771/771.
- Rules-only suite: 13 files, 72/72.
- Production build: passed (568 modules).
- Asset audit: 435/435 present; 0 missing, invalid, placeholder, or
  release-blocking findings.
- Release asset audit: passed.
- `git diff --check`: passed.
- `git diff --cached --check`: passed.
- Staged files: 0.
- Ports 5173 and 8080: free after QA.
- QA capture/dev processes: stopped.
- Commit/push: not performed.

The repository's aggregate wrapper was not rerun because its complete
constituents were run independently and all 1,681 assertions passed. This avoids
duplicating the same long-running suites while retaining exact pass/fail
evidence for each required layer.

## Final asset integrity

- Baseline art inventory: 454 files, 1,106,650,363 bytes.
- Baseline manifest checkpoint:
  `40b975e1201edb05af9f6a56871e41cb7d61a1644c071e68e21f256c681b2af6`.
- Final Git status for `public/assets`: clean.
- Final untracked files below `public/assets`: 0.
- Reference media checked by SHA-256: 263.
- Reference/Ashenreach media hash collisions: 0.
- Ashenreach art files modified, added, or removed: 0/0/0.
- Reference-game assets transferred: 0.
