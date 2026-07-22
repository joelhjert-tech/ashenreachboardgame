# Gameplay UX implementation backlog

## P0 — authoritative clarity

1. **Shared required-action projection.** One typed context model drives phone tab selection, TV narration, owner, blocked reason, and reconnect state. Acceptance: every pending resolver has exactly one owner and one player-facing next action.
2. **Reconnect animation guard.** Persist presentation identity and suppress completed dice, route, reveal, reward, and Scar animations. Acceptance: refresh at every major stage produces no repeated effect.
3. **Privacy projection audit.** Snapshot every phone role and TV state for missions, Artifacts, Rivalry, followers, assistance, and routes.

## P1 — core turn loop

4. **Phone action hierarchy completion.** Promote Priority Stack from prototype only after all canonical contexts map required/useful/optional/passive/blocked entries.
5. **Movement pacing pass.** Apply one segment timeline to route projection; verify cross-ring and forced displacement at both TV sizes.
6. **Encounter shell consolidation.** Remove duplicate headers/context panels; share art, test, totals, outcome, and consequence regions.
7. **Named waiting language.** Replace generic loading/waiting with actor + required action + reconnect/processing distinction.
8. **Result consolidation.** One public result and one consequence/reward for battle, hazard, purchase, mission, and Scar.

## P2 — setup and economy presentation

9. **Setup progress compression.** Replace large lobby prose with compact staged progress and adjacent confirm/back.
10. **Shop mode decision.** Select production Requisition Chamber or board-integrated market after side-by-side QA.
11. **Inventory timing filters.** Server projects passive/active eligibility and exact unavailable reason; phone only promotes legal actions.
12. **Mission replacement handoff.** Reward/cleanup completes, then owner-private deterministic picker opens automatically.

## P2 — system quality

13. **Unified image metadata.** Aspect ratio, focal point, fit, sizes, fallback, and decode hints for all gameplay art.
14. **Motion token audit.** Remove custom durations, replay-on-remount, and expensive board filters.
15. **Accessibility closure.** 44 px targets, safe areas, keyboard/focus for admin, non-colour seat identity, reduced motion, couch type sizes.
16. **Full-session instrumentation.** Measure pending-state duration, reconnect restoration, action rejection, layout shift, and animation frames without collecting private content.

## P3 — polish after playtesting

17. Original sound-hook implementation with approved assets.
18. Scenario-specific center transitions that preserve tile identity.
19. Ambient ash/machinery only after target-device frame budget is proven.
20. First-session contextual help that disappears after comprehension, never a permanent instruction panel.

## Recommended order

`authority/context → reconnect/privacy → phone primary action → movement → encounter/battle → waiting/results → setup/shop → image/motion/accessibility → ambient polish`

## Reviewable implementation matrix

| Priority / item | Problem and evidence | Proposed solution | Likely files | Effort / risk | Acceptance and tests |
|---|---|---|---|---|---|
| P0 Shared context | Phone/TV can describe different next actions; contrast with D2 05:16. Ashen Reach: `03-mode-scenario-selection-390x844.png`. | One typed required-action projection with owner, context, command, blocked reason. | server projection, shared types, `PhoneApp`, `TvApp` | L / high | Every pending resolver maps once; projection/privacy/reconnect tests. |
| P0 Reconnect guard | Restored state can look newly resolved. D2 04:20 shows why reveal identity matters. | Persist presentation/event identity and suppress completed motion. | event selectors, movement/battle/shop overlays | M / high | Refresh at every stage; no reroll, duplicate reward, or replay. |
| P0 Privacy audit | Shared presentation risks leaking owner options. Reference cannot solve this; Ashen Reach advantage. | Snapshot roles and remove private fields before TV model. | room projection, phone/TV models | M / high | Rivalry, mission, Artifact, assistance, route privacy suite. |
| P1 Phone hierarchy | Setup/action pages require long scanning. Ashen Reach `03` and `04`. | Promote the shared Priority Stack after every context is classified. | `PhoneActionPanel`, priority stack, styles | L / medium | One primary action above fold; all legal actions represented; mobile QA. |
| P1 Movement pacing | Fast travel reduces route comprehension. Reference P1 09:47 retains board context. | Canonical segment timeline with distinct cross-ring beat. | `HostMovementJourney`, motion tokens | M / medium | Exact segment order at two TV sizes; reconnect and reduced-motion tests. |
| P1 Encounter shell | Repeated headers reduce art/result space. D2 04:20 and P1 28:10. | Share one category-aware shell and one outcome row. | host battle/challenge/event components | L / medium | Long titles fit; totals and consequence shown once; category tests. |
| P1 Waiting language | Generic waiting hides ownership. Ashen Reach `05-host-player-joined-1920x1080.png`. | Generate actor + required-action copy from the shared context. | phone/TV status selectors | S / low | Every pending state names actor/action; reconnect and inactive-seat tests. |
| P1 Result consolidation | Repeated banners make outcomes ambiguous. P1 28:10. | One result, one margin, one consequence/reward. | roll outcome, battle, shop result views | M / medium | Success/failure/tie/purchase/Scar snapshots show no duplicate rows. |
| P2 Setup compression | Oversized lobby prose and distant confirmation. Ashen Reach `03`–`05`; playlist 03:01. | Compact five-stage progress and adjacent confirm/back. | lobby/setup phone/TV components | M / medium | Back never leaves joined room; each stage one selection and one confirm. |
| P2 Shop decision | Two viable visual models create implementation drift. D2 04:20 supports focus; board evidence supports continuity. | Select one production treatment after identical-state comparison. | host shop overlay/model, styles | M / low | Stock/service/result/privacy/reduced-motion at 1920 and 1366. |

Every item above must also run content validation, typecheck, the affected focused suites, aggregate tests, production build, console/overflow/privacy review, and `git diff --check`.
