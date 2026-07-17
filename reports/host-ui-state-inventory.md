# Ashen Reach Host UI State Inventory

## QA environment

- Branch: `ui/host-complete-audit`
- Baseline commit: `72e9ce8`
- Command: `npm.cmd run dev -- --qa-fixtures --client-port=5191 --api-port=8091`
- Capture command: `npm.cmd run qa:host-ui`
- Browser: Playwright Chromium, headless
- TV viewports: 1920x1080 and 1366x768
- Controller viewport: 390x844
- Session: single-player co-op, standard mode, Bjornis, normal room creation/join/character/mission/ready/start flow
- QA helper: `/api/qa/phase1-fixture`; it mutates server state only when explicitly enabled, then uses the normal TV projection and production React components.

The indexed baseline archive contains 37 images across 19 states. The final archive contains 47 images across 24 states, including reduced motion, victory, collapse, scenario preparation, and disconnect coverage.

## State inventory

| State / event | Authoritative trigger | TV owner | Reachability | Status | Screenshot / evidence | Main finding |
|---|---|---|---|---|---|---|
| Server ready, no Host Phone | Public room exists; no host controller | `TvStartupScreen` | Normal | Complete | `before/startup-no-room-*` | Raw LAN URL made QR copy unreadable at 1366; corrected. |
| Room created | Room summary projection | `TvStartupScreen` | Normal | Complete | `before/lobby-room-created-1366x768.png` | Room identity and QR are clear. |
| First phone / host phone / setup | Seat and lobby projections | `TvStartupScreen` | Normal | Complete | Component tests; startup capture | TV stays presentation-only. |
| Scenario, character and mission selection | Lobby seat projection | `TvStartupScreen` | Normal | Functional but visually weak | Component tests | Full individual picker states remain phone-owned; TV correctly shows readiness only. |
| Idle Outer board | Active session, navigation awaiting roll | `TacticalMapPanel` | Normal | Complete | `before/board-idle-outer-*` | Strong map-first hierarchy. |
| One operative | Player projection | `OperativesRail` | Normal | Complete | `board-idle-outer-*` | Active seat is clear. |
| Four operatives / stacked sector | Player projection | `OperativesRail`, `BoardMap` | Normal multiplayer | Functional but visually weak | Existing tests only | Not reproducible in single-session capture fixture without creating three extra authenticated phones. |
| Middle / Inner ring | Server sector IDs | `BoardMap` | Normal | Complete | transition captures | Ring identity is visible in context and transition journey. |
| Center locked / cleared | Private requirement normalized into public route availability | `BoardMap` | Normal / fixture | Complete | `transition-core-locked-*`, `transition-core-cleared-*` | No private note text is projected. |
| Scenario center art | Active scenario projection | `BoardMap`, `ScenarioCard` | Normal | Complete | board and endgame captures | Art changes do not change center identity. |
| Movement roll requested | Navigation phase; no roll | Header + board | Normal | Complete | idle board | Actor and required phone action are named. |
| Movement result / destination selection | `movementPlanner.active` | `MovementFocusHud` | Normal / fixture | Complete after correction | `movement-roll-ready-*` | Baseline HUD clipped off-screen; corrected and browser-bounded. |
| Route preview | Selected destination projection | `MovementFocusHud`, `BoardMap` | Normal | Complete | component tests | Canonical route remains the only source. |
| Movement journey | Sector change plus previous planner | `HostMovementJourney` | Normal / fixture | Complete | transition captures | Per-step journey, destination and arrival state are retained. |
| Cross-ring / shortcut | Route sector IDs | `HostMovementJourney`, `TalismanBoardSurface` | Normal | Complete | transition captures and BoardMap tests | Cross-ring route is visually distinct through the authored route. |
| Forced displacement | Pending displacement projection | Header + canonical board | Normal | Functional but visually weak | component tests | Public destination is shown only after authority supplies it. No dedicated baseline image. |
| No legal route | Planner with zero enabled destinations | `MovementFocusHud` | Reachable edge case | Missing host-specific capture | test gap recorded | HUD supports a zero count, but no dedicated fixture currently creates it. |
| Reconnect mid-movement | Restored state | Board or settled journey | Normal | Complete mechanically | movement/reconnect tests | Completed movement is not replayed as a new gameplay event. |
| Tile arrival / challenge | Active resolution | battle/test chamber or sector brief | Normal | Complete mechanically | component tests | Enemy battles and tests share totals; persistent challenge remains labeled by source. |
| Threat enemy reveal | Current encounter / active battle | `HostBattleChamber` | Normal / fixture | Complete | `battle-introduction-*` | Art and combatants dominate. |
| Hazard / anomaly / elite | Current encounter | reveal/test components | Normal | Functional but visually weak | component tests | No dedicated browser archive for every card family; shared art/type framing is tested. |
| Battle setup | `activeResolution.stage=battle_setup` | `HostBattleChamber` | Normal / fixture | Complete | `battle-roll-required-*` | Card reveal lifecycle and reduced-motion fallback verified. |
| Pending enemy roll | `pendingEnemyRoll` | `HostBattleChamber` | Normal / fixture | Complete | `battle-enemy-roll-*` | Actor and pending roll are public-safe. |
| Rolled totals | `roll_result` | `HostBattleOverlay` | Normal / fixture | Complete | `battle-totals-*` | Both formulae and totals are simultaneous. |
| Battle success / tie | Outcome projection | `HostBattleOverlay` | Normal / fixture | Complete after correction | `battle-success-*` | Successful tie now says `Tie succeeds`; duplicate defeated row removed. |
| Battle defeat | Outcome projection | `HostBattleOverlay` | Normal / fixture | Complete | `battle-defeat-*` | Failure and blocker retention remain clear. |
| Reroll / prevention / reaction | Pending reaction state | header + battle chamber | Normal when authored | Functional but visually weak | engine/integration tests | No deterministic visual fixture; TV correctly never exposes private controls. |
| Wound / Scar / recall | Result deltas / session state | battle results + operative rail | Normal | Functional but visually weak | projection tests | No separate screenshot because QA battle fixture only seeds Wound state. |
| Shop entry / services | `shopEncounter` or shop sector | `HostShopOverlay` | Normal / fixture | Complete after correction | `shop-location-open-*` | Guidance reduced from three copies to one command. |
| Stock / affordable / sold out | Public shop projection | `HostShopOverlay` | Normal | Complete mechanically | component and shop tests | Hidden stock remains absent until server reveal; no Artifact options leak. |
| Purchase / sale result | Public result deltas | `HostShopOverlay` | Normal | Complete mechanically | component tests | Transaction summary is only shown when a result exists. |
| Artifact exchange eligibility | Completed Contract count | `HostShopOverlay` | Normal / fixture | Complete | `artifact-exchange-*-*` | Private choices never appear on TV. |
| Follower acquired / used | Public follower/result projection | operative rail and public result | Normal / fixture | Functional but visually weak | `follower-*-*` | Identity is public, private notes remain absent. |
| Scenario preparation | Scenario preparation projection | header/scenario card/board | Normal / fixture | Complete | `after/scenario-preparation-*` | Preparation is distinct from confrontation progress. |
| Final confrontation | Scenario confrontation state | center + scenario components | Normal | Complete mechanically | scenario tests / endgame archive | Side objectives do not render victory. |
| Victory | `status=ended`, winner and scenario result | `EndgameOverlay` | Normal / fixture | Complete | `after/session-victory-*` | Outcome is dominant while final board remains legible. |
| Loss | `status=ended`, no winner | `EndgameOverlay` | Normal / fixture | Complete | `after/session-loss-*` | Collapse is unmistakable and separate from Win Progression. |
| Active operative disconnected | Seat `connected=false` | live status + board | Normal / fixture | Complete after correction | `after/player-disconnected-*` | Reconnect now overrides stale shop prompts and names the player. |
| Server unavailable | Subscription error | startup/banner | Reachable network failure | Functional but visually weak | component tests | Not fabricated by browser fixture because it would terminate the capture server. |
| Missing art | image fallback | card/sector fallbacks | Reachable data defect | Complete mechanically | component tests | No runtime assets were altered. |
| Stale action rejected | server rejection to requesting phone | public state remains authoritative | Normal | Complete mechanically | integration tests | TV does not narrate private rejection details. |

## Privacy boundary

The capture runner fails if it finds `Choose one Artifact`, `Confirm Artifact`, `Private agenda`, or `Rivalry target` on TV. It also asserts zero canvas elements and no horizontal overflow. Owner-only follower notes, Artifact choices, Contract objectives, route candidates, and Rivalry data remain phone-only.

## Rare-state closure addendum

| State | Trigger | TV component | Reachability | Final status | Evidence | Closure |
|---|---|---|---|---|---|---|
| Four operatives stacked | Four occupied seats share one projected sector | `BoardMap` / `TalismanBoardSurface` | Normal | Complete | `rare-states/stacked-operatives-*` | Stable seat ordering, four markers, active-seat priority, no overflow. |
| Ordered reaction pending | Public pending ordered consequence | `TvApp` rare-state panel | Normal when authored | Complete | `rare-states/reaction-stage-pending-*` | Current owner and stage dominate; private reaction data absent. |
| Ordered reaction settled | Completed Suture Storm sequence | `TvApp` rare-state panel | Normal when authored | Complete | `rare-states/reaction-stage-final-*` | Settled consequence appears once; reconnect does not reopen it. |
| Recall / pending Scar / resolved Scar | Wound threshold and Scar continuation | `TvApp` rare-state panel + operative rail | Normal | Complete | `rare-states/recall-*`, `scar-*` | Recall is distinct from defeat; Scar is not shown before authority. |
| Server unavailable / recovering | Real TV WebSocket interruption | `HostNetworkOverlay` | Normal network failure | Complete | `rare-states/server-*` | Last safe board remains, stale actions are suppressed, restored state requires a patch. |
