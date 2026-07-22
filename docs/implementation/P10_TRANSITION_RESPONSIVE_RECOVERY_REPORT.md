# P10 Transition and Responsive Recovery Report

## Phase 1 reproduction — before editing

Baseline: branch `ui/tv-movement-focus-mode`, HEAD `6bd4fc05a292df3749d024070260c27cf61c517a`, 98 pre-existing dirty status entries, ports 5173 and 8080 free. The rule-spine and card-economy-spine documents referenced by the local skills are not present; `docs/UI_DIRECTION.md`, the P9 evidence, current projections, and existing tests are the available authority.

| Finding | Responsible component/state | Classification | Expected files | Current timing / DOM | Smallest correction | Regression risk |
|---|---|---|---|---|---|---|
| P9-001 arrival not observed | `TacticalMapPanel` in `TvApp.tsx`; local `visualTravel.arrived` follows an authoritative previous/current patch comparison. Encounter state already exists on the server. | Presentation timing plus QA observation race; not projection or gameplay. | `TvApp.tsx`, `HostMovementJourney.tsx`, motion tests/tokens only if timing changes, P2 capture script/tests | Travel advances at 300 ms start, 520 ms normal segment, 680 ms cross-ring segment, then an `is-arrived` render held for 760 ms. P2 sleeps/captures before waiting for the transient class, so screenshot work can consume the hold. | Expose a stable semantic movement-stage attribute, keep the arrival phase visibly settled and non-blocking, and make the harness wait for that semantic phase before capture. | Encounter overlay must not duplicate, server commands must not depend on the timer, reconnect must not replay completed travel. |
| P9-002 Shop overlap | `PhoneActionPanel` renders offer navigation and `.phone-shop-skip`; CSS fixes the latter above the global dock. | Responsive CSS geometry. | `styles.css`, focused Shop browser/tests | Offer navigation is normal flow; Leave Shop is `position: fixed` at `bottom: 4.6rem`, with only 5.5 rem content padding. At 390×844 and 360×800 its hit area overlays carousel controls. | Return Leave Shop to normal flow as a secondary action after offer navigation and retain safe-area clearance in the single phone scroll region. | Must retain ≥44 px targets, no bottom-dock collision, no transaction or stock changes. |
| P9-003 waiting duplication | `PhoneRequiredActionShell` plus `PortraitControllerView` player-card `phone-player-essential-state`. | Render hierarchy/copy duplication. | `PortraitControllerView.tsx`, tests | Required shell says `<actor> is acting`; the player card immediately repeats `Waiting for <actor>` and the same public detail. | While a projected action belongs to another player, keep the required shell as the sole context and render vitals without the duplicate current-context block. | Do not remove public actor/action or expose owner options; keep one `aria-live` announcement. |
| P9-004 setup focus | Phone setup surfaces in `PhoneApp.tsx` and `PortraitControllerView.tsx`; server supplies `SetupProjection.id`, `stage`, actor, and allowed command. | Focus management. | Those two components and phone tests | Stage changes scroll the lobby to top, but no stage-owned choice receives focus. Existing shared `useFocusOnRevision` already prevents repeat focus. | Key focus to authoritative setup ID; focus first legal operative/mission option, Ready, or Start exactly once. | Avoid focus stealing on unchanged revisions, hidden/disabled targets, non-owner phones, and reconnect. |
| P9-005 TV truncation/repetition | `TopHeader` and `getHostStateBannerModel` in `TvApp.tsx`; `.tv-command-live-status` CSS. | Copy and responsive CSS. | `TvApp.tsx`, `styles.css`, TV tests | Heading and paragraph are forced to one line with ellipsis. Required-action meta repeats actor and kind after complete label/detail. | Omit redundant required-action meta and permit a bounded two-line supporting paragraph while keeping heading single-line. | Long public copy must fit at 1366×768 and never reveal private context. |
| P9-008 `BATTLE 0` | `buildBattleModel` in `HostBattleOverlay.tsx`. `enemyBattleValue` is the opponent base value/difficulty component before enemy dice. | Semantic label. | `HostBattleOverlay.tsx`, battle tests | Rolled opponents set `opponentStatLabel = "Battle"`; formula therefore prints `BATTLE 0 + ROLL …`. | Label the value `Enemy base`; retain value, dice, total, and formula order. | No arithmetic or tie-rule change; legitimate zero remains visible. |
| P9-006 P2 race | `capture-p2-movement-qa.ts`. | QA harness. | P2 script | Fixed 560 ms sleeps and screenshot/image work precede the transient arrival wait. | Wait for `data-movement-stage=travel/arrival` and encounter semantic state; include current DOM stage in timeout errors. | Development-only; no client state or command shortcuts. |
| P9-006 P3 race | `capture-p3-encounter-battle-qa.ts`. | QA harness. | P3 script | Every document image must finish, including intentional missing-art fallback paths. | Wait for visible battle semantic stages and accept either resolved visible art or the canonical fallback. | Cached and missing art must preserve capture ordering and diagnostics. |
| P9-009 vocabulary | Player-facing UI calls the selected personal objective a Mission; internal schema and content remain `Contract`. Scenario is the shared expedition; Quest is a navigation label; Agenda is Rivalry-private. | Narrow copy audit. | Only visibly incorrect labels/tests found during implementation | Setup consistently says Mission, but an active-mission fallback exposes a raw `contractId`, and some public copy says active contract. | Keep internal Contract types/IDs; use Mission for player-facing personal objectives and never render a raw ID. | Do not change mechanics, save fields, IDs, or Rivalry privacy. |

## Terminology map

- **Mission:** a player-owned objective selected during setup or as a replacement. Backed internally by Contract data.
- **Contract:** the internal authored card/schema family and completed credential used by economy rules. It is not the preferred general player-facing label for an active objective.
- **Quest:** the phone navigation surface containing mission progress and related objective information; not a separate rules object in this slice.
- **Agenda:** an owner-private Rivalry objective. Its details never appear on TV or waiting phones.

## Implementation status

Complete, pending final verification results recorded below.

## Corrections implemented

- Preserved the existing server-authoritative route and encounter payload while the TV completes one local arrival presentation before revealing an already-authoritative encounter.
- Added stable `travel` and `arrival` DOM stages plus the authoritative movement event identity for deterministic observation.
- Set the normal arrival hold to 600 ms, inside the evaluated 350–650 ms range. Reduced motion settles in 160 ms. A development-only `qaArrivalHold=1` extends only the local presentation long enough for high-resolution evidence capture; normal gameplay timing is unchanged.
- Moved the transient journey presentation to a TV-only document portal and contained every tile-art frame with an explicit positioned override. The final visual review found that `talisman-board-tile-art` could escape a journey card and cover the entire presentation even though the arrival component itself reported `display:grid`, `visibility:visible`, and `opacity:1`. The portal removes the command-board stacking conflict; the containment rule fixes the actual full-surface artwork escape.
- Kept the journey below the permanent command header at 1920x1080 and 1366x768, including the compact-width media rule. The canonical board remains visible behind the dark journey layer.
- Returned Leave Shop to the normal Shop document flow after offer navigation. The single scroll region and bottom dock retain their existing authority and navigation behavior.
- Removed the duplicate waiting context from the secondary player-card block and suppressed a duplicate busy badge when a phone is already in a waiting state.
- Added setup focus for scenario, operative, mission, Ready, and Start checkpoints. The shared focus hook now consumes a revision only after focus succeeds, which keeps it correct under React development Strict Mode cleanup.
- Allowed two lines of supporting TV status copy while keeping the primary status single-line, and removed repeated required-action metadata.
- Replaced `BATTLE 0`/`BATTLE n` with `ENEMY BASE 0`/`ENEMY BASE n`; no value or calculation changed.
- Repaired P2 to wait on semantic movement stages and route positions before capture. Repaired P3 to wait on visible artwork resolution or a canonical fallback rather than every image in the document.
- Kept Mission as the player-facing personal objective term. Contract remains the internal schema/card family. Removed the raw Contract ID fallback from the active Mission view.

## Files changed by P10

- `src/client/tv/TvApp.tsx`
- `src/client/tv/HostMovementJourney.tsx`
- `src/client/tv/HostBattleOverlay.tsx`
- `src/client/phone/PhoneApp.tsx`
- `src/client/phone/PortraitControllerView.tsx`
- `src/client/phone/PhoneRequiredActionShell.tsx`
- `src/client/shared/motionTokens.ts`
- `src/client/shared/useFocusOnRevision.ts`
- `src/client/styles.css`
- Focused tests beside those components and shared hooks
- `scripts/capture-p2-movement-qa.ts`
- `scripts/capture-p3-encounter-battle-qa.ts`
- `scripts/capture-p5-setup-lobby-qa.ts`
- `scripts/capture-p6-shop-qa.ts`

## Architecture review

No gameplay command, rule, projection, save field, network message, movement route, encounter trigger, Shop transaction, or privacy boundary was added or changed. The authoritative encounter can already exist while the TV completes its local presentation; the animation neither sends nor gates a command. Reconnect continues to use the projected destination/current encounter and does not manufacture a second arrival or reveal.

## Browser QA

- P2: 61 screenshots, four recordings, 1366×768, 1600×900, 1920×1080, phone 360×800/390×844, reduced motion, reconnect, cross-ring routes, and zero browser errors.
- P3: 84 captures per run across phone and TV encounter/battle states; two consecutive 84-capture runs completed with zero browser errors.
- P4: 60 captures after waiting-context consolidation; zero browser errors and zero overflow.
- P5: 46 captures; browser assertions observed focus on operative, mission, Ready, and Start controls; zero browser errors.
- P6: 99 captures including 360×800, 390×844, and 430×932 Shop states; geometry assertions prove no visible control overlap and a 44 px minimum target; zero browser errors.
- Active Rivalry and a genuine server outage remain deliberate manual-coverage gaps. No private or outage state was fabricated.

## Four-seat critique

- **New player:** Destination settling, a single waiting statement, and `Enemy base` make the sequence and arithmetic easier to understand. No new instructions were added.
- **Optimizer:** Route timing and encounter state remain authoritative; the visual hold cannot repeat rewards, alter arrival, or hide Shop navigation.
- **Family/casual:** The 600 ms arrival is readable without adding a Continue step. Shop exit is visually secondary and separated from offer navigation.
- **Rules lawyer:** The server may resolve ahead of presentation, but the TV never claims an outcome before it is projected. Mission/Contract wording changes no stable IDs or mechanics.

## Verification

- Focused transition/responsive regressions: **101/101 passed** across movement timing, Strict Mode focus, movement journey, TV state selection, phone setup focus, and waiting-shell duplication.
- Client suite: **408/408 passed**.
- Integration suite: **353/353 passed**.
- Engine/rules suite: **763/763 passed**.
- Aggregate suite: **1,524/1,524 passed** in 400.00 seconds.
- Content validation: passed with 18 characters, 71 gear, 109 threats, 36 contracts, 20 anomalies, 30 artifacts, 24 followers, 24 scars, 16 escalations, and 30 afflictions.
- TypeScript typecheck: passed.
- Production build: passed (558 modules transformed).
- Asset audit: **435/435 present**, zero missing, invalid, placeholder, or release-blocking assets.
- P2 final browser run: 61 screenshots, four route recordings, zero browser errors, and zero horizontal overflow. The final 1366x768 and 1920x1080 arrival frames were manually inspected after the artwork-containment fix.
- P3/P4/P5/P6 browser results remain green as recorded above.
- `git diff --check` and `git diff --cached --check`: passed; only existing line-ending notices were emitted.
- No commit or push was made.
