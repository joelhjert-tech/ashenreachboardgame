# Physical Android Hardening Report

## Architecture

- `useActiveRoomBackGuard.ts`: controlled history sentinel, detail-dismiss event, supplemental unload warning, one canonical leave callback.
- `usePhysicalVisualViewport.ts`: shared Visual Viewport snapshot and CSS variables.
- `PhoneApp.tsx`: keyboard-safe Join, immediate submit lock, room-safety dialog across reconnect/setup/game branches.
- `PortraitControllerView.tsx`: major-tab scroll policy and detail-first Back precedence.
- `PhoneHazardChallengePrototype.tsx/.css`: physical-height result hierarchy and expandable audit detail.
- `PhoneActionPanel.tsx`: compact tile-arrival context during active resolution.
- `physicalAndroidPhoneProfile.ts`: measured regression profile and constrained keyboard profile.

## Non-changes

No gameplay rules, server authority, Leave Room semantics, command outcomes, reconnect semantics, privacy boundaries, save data, encounter arithmetic, rewards, inventory, objectives, or Host TV behavior changed.

## Four-seat critique

- New player: Join and Back intent are now explicit; major tabs start predictably.
- Optimizer: full arithmetic remains available and local item/detail return retains context.
- Family/casual: the safety dialog and short result hierarchy reduce accidental exit and scrolling.
- Rules lawyer: Back cannot submit gameplay, Stay preserves the required action, Leave uses canonical authority, fixed opposition remains fixed, and full details remain auditable.

## Physical evidence

Galaxy S21+ Chrome verified keyboard geometry, mandatory-action Back protection, Stay behavior, scroll reset, compact Hazard outcome, endgame fixtures, reduced motion, and reload restoration. Playwright retains 360 × 800, 390 × 844, and 430 × 932 while adding 384 × 722.

## Final assessment

The P18 physical closeout found and corrected one server-side active-leave blocker without changing lobby release, gameplay, saves, or reconnect authority. The corrected physical Back/Leave sequence, repeated Back/Stay sequence, real keyboard, major-tab scrolling, Hazard/battle/shop flows, reconnect, reduced motion, and endgame fixtures now match the intended validated design. Final command results and both historical aggregate runs are recorded in the P18 closeout section below.

## P18 aggregate history

- Earlier hardening aggregate: all 1,574 assertions passed, but the PowerShell output pipeline returned exit code 1.
- Unchanged compact-reporter rerun: 1,574/1,574 passed, exit code 0, 426.7 seconds.
- P18 adds one integration regression for active controller departure; the final aggregate is 1,575 rather than a missing or weakened test.

## P18 final verification

| Gate | Result |
| --- | --- |
| Focused physical Android | 164/164, exit 0 |
| Content validation | Passed, exit 0 |
| Typecheck | Passed, exit 0 |
| Engine/rules | 771/771, exit 0 |
| Rules-only | 72/72, exit 0 |
| Server integration | 375/375, exit 0 |
| Client | 429/429, exit 0 |
| Aggregate | 1,575/1,575, exit 0, 418.8 seconds wall time |
| Production build | Passed, exit 0 |
| Asset audit | 435/435, exit 0 |
| Working/cached diff checks | Passed |

The focused count is 164 rather than the earlier 161 baseline because the final focused command includes all current profile, viewport, Back guard, Join/App, Action, Inventory, and Hazard tests. No test was removed or assertion weakened.

## Final physical acceptance

**PHYSICAL PHONE EXPERIENCE MATCHES THE VALIDATED DESIGN**

Concrete residual limitations are platform boundaries, not runtime defects: Playwright cannot reproduce real Android browser chrome, the Samsung keyboard, Android Back, exact physical rendering, or OS process eviction. Those paths retain physical-device acceptance and server-authoritative reconnect coverage.
