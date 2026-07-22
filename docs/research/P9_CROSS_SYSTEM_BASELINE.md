# P9 Cross-System Baseline

Recorded before P9 browser sessions on 2026-07-21.

## Repository baseline

- Branch: `ui/tv-movement-focus-mode`
- HEAD: `6bd4fc05a292df3749d024070260c27cf61c517a`
- Worktree: dirty before P9; 98 `git status --short` entries
- Staging area: unchanged by P9
- Ports 5173 and 8080: free
- P9 restriction: research artifacts only; no runtime, test, fixture, content, asset, rule, authority, privacy, or save changes

## Pre-existing modified files

```text
scripts/validate-content.ts
src/client/__tests__/uiValidationStress.test.tsx
src/client/main.tsx
src/client/phone/MobilePlayerCard.tsx
src/client/phone/PhoneActionPanel.tsx
src/client/phone/PhoneApp.tsx
src/client/phone/PhoneBattleView.tsx
src/client/phone/PhoneInventoryPanel.tsx
src/client/phone/PhoneMovementView.tsx
src/client/phone/PortraitControllerView.tsx
src/client/phone/__tests__/PhoneActionPanel.test.tsx
src/client/phone/__tests__/PhoneInventoryPanel.test.tsx
src/client/phone/__tests__/PhoneMovementView.test.tsx
src/client/phone/inventoryPresentation.ts
src/client/phone/usefulNowPresentation.ts
src/client/shared/CardArtImage.tsx
src/client/shared/__tests__/motionTokens.test.ts
src/client/shared/explainabilityPrompts.ts
src/client/shared/motionTokens.ts
src/client/shared/types.ts
src/client/shared/useRoomSubscription.ts
src/client/styles.css
src/client/tv/BoardMap.tsx
src/client/tv/HostBattleChamber.tsx
src/client/tv/HostBattleOverlay.tsx
src/client/tv/HostImage.css
src/client/tv/HostImage.tsx
src/client/tv/HostMovementJourney.tsx
src/client/tv/HostShopOverlay.tsx
src/client/tv/TalismanBoardSurface.tsx
src/client/tv/TvApp.tsx
src/client/tv/__tests__/BoardMap.test.tsx
src/client/tv/__tests__/HostImage.test.tsx
src/client/tv/__tests__/HostMovementJourney.test.tsx
src/client/tv/__tests__/HostShopOverlay.test.tsx
src/client/tv/__tests__/TvApp.test.tsx
src/client/tv/admin/AdminMapInspector.tsx
src/client/tv/admin/__tests__/AdminMapInspector.test.tsx
src/client/tv/admin/adminMapReferences.ts
src/client/tv/admin/adminMapRegistry.ts
src/game/data/boardSpaces.ts
src/game/engine/actions.ts
src/game/engine/reducer.ts
src/game/rules/sessionStart.ts
src/game/schema/session.schema.ts
src/server/__tests__/heatProjectionRetirement.test.ts
src/server/__tests__/phaseOneQaFixture.test.ts
src/server/__tests__/phaseTwoShopMechanicsFoundation.test.ts
src/server/__tests__/sessionState.test.ts
src/server/__tests__/shopEncounterProjection.test.ts
src/server/phaseOneQaFixture.ts
src/server/roomServer.ts
```

## Pre-existing untracked status roots

```text
docs/design/
docs/implementation/
docs/plans/
docs/qa/
docs/research/
reports/map-tile-function-audit.md
reports/map-tile-function-balance-review.md
reports/map-tile-function-implementation.md
reports/phone-action-encounter-start-debug.md
reports/phone-action-layout-options.md
reports/phone-action-priority-stack-gameplay-test.md
reports/phone-action-priority-stack-implementation.md
reports/phone-primary-action-p1.md
reports/ui/map-tile-function-qa-index.md
reports/ui/phone-action-priority-stack-qa-index.md
reports/ui/phone-required-action-p1/
research/reference/talisman-video-audit/
scripts/capture-map-tile-function-qa.ts
scripts/capture-p2-movement-qa.ts
scripts/capture-p3-encounter-battle-qa.ts
scripts/capture-p4-waiting-handoff-qa.ts
scripts/capture-p5-setup-lobby-qa.ts
scripts/capture-p6-shop-qa.ts
scripts/capture-p7-inventory-player-card.ts
scripts/capture-p8-shared-presentation.py
scripts/capture-phone-action-priority-stack.ts
scripts/capture-phone-required-action-p1.ts
src/client/phone/PhoneActionPriorityStack.tsx
src/client/phone/PhoneRequiredActionShell.tsx
src/client/phone/__tests__/PhoneActionPriorityStack.test.tsx
src/client/phone/__tests__/PhoneRequiredActionShell.test.tsx
src/client/phone/__tests__/PhoneTileArrivalSummary.test.tsx
src/client/shared/ArtworkFrame.tsx
src/client/shared/LiveStatus.tsx
src/client/shared/OperativePortraitImage.tsx
src/client/shared/SharedPresentationQaFixture.tsx
src/client/shared/__tests__/presentationHooks.test.tsx
src/client/shared/__tests__/presentationSystem.test.tsx
src/client/shared/presentationSystem.ts
src/client/shared/useFocusOnRevision.ts
src/client/shared/useReducedMotion.ts
src/game/rules/__tests__/tileFunctions.test.ts
src/game/rules/tileFunctions.ts
src/server/__tests__/requiredActionProjection.test.ts
src/server/__tests__/tileArrivalLifecycle.test.ts
src/server/__tests__/tileEncounterStart.test.ts
```

The P9 files introduced under the already-untracked `docs/research`, `docs/qa`, and `docs/plans` roots are tracked separately in the P9 completion report.

## P0-P8 evidence availability

The implementation reports and QA archives for P2-P8 are present, along with the P1 required-action report and capture archive. Current audit harnesses exist for P2 movement, P3 encounter/battle, P4 waiting/handoff, P5 setup/lobby, P6 shop, P7 inventory/player card, and P8 shared presentation.

`docs/UI_DIRECTION.md` exists. `docs/ASHENREACH_RULE_SPINE.md` and `docs/ASHENREACH_CARD_ECONOMY_SPINE.md` are still absent; this is a documentation limitation, not a runtime blocker. The audit uses server projections, current tests, implementation reports, and rendered behavior as evidence.

## Verification baseline

P8 reported:

- Content validation: passed
- Typecheck: passed
- Client: 405/405
- Engine/rules: 763/763
- Integration: 353/353
- Constituent total: 1,521 passed
- Production build: passed, 557 modules transformed
- Asset audit: 435/435 present
- Browser overflow and console errors: zero
- Aggregate wrapper: exceeded 300 seconds without reporting a failing assertion; all constituent suites passed independently

P9 will rerun the required research verification after evidence collection.

## Audit methods

- Browser: headless Chromium through native Playwright scripts already stored in the repository.
- Server: canonical `npm.cmd run dev -- --qa-fixtures` managed by the bundled `with_server.py` lifecycle helper.
- Reduced motion: Playwright browser context/media emulation using `prefers-reduced-motion: reduce`.
- Reconnect: browser reload/new context with the stored canonical controller session, plus server-projected reconnect fixture states.
- Evidence location: `docs/qa`; no screenshots or recordings enter `public/`, `src/`, or any production asset folder.
- Privacy: rendered DOM, live regions, fallback/alt text, and public/private projection tests are reviewed. No live user data is used.

## Known limitations before capture

- QA fixtures create deterministic authoritative states but do not reproduce human hesitation or LAN latency.
- Headless Chromium cannot prove real-device browser-chrome behavior or full screen-reader output.
- Rivalry coverage depends on currently authored projection fixtures; unsupported private branches will be listed rather than fabricated.
- The aggregate test command is expected to exceed the available execution window; constituent suite results remain the authoritative verification evidence.
