# Phase 7A Real-Device Playtest Checklist

Baseline: `8459aea phase-6c-slim-runtime-card-art-catalog`
Phase 7D stat-upgrade baseline: `7efa638 phase-7c-stat-upgrade-system`

Purpose: prove the intended Ashenreach table setup works on real devices before adding new mechanics, assets, UI redesigns, or deeper bundle work.

Core doctrine:
- TV is the public command table: map, shared state, spectacle, table prompts, public results.
- Phone is the private controller: prompts, decisions, hidden/private data, fast actions.

Phase 7A is checklist and diagnostics only. One discovered blocker should become one focused Phase 7B commit.

## Must-Pass Command Checks

Run from the repository root:

```powershell
npm.cmd run validate:content
npm.cmd run typecheck
npm.cmd run test:engine
npm.cmd run test:client
npm.cmd run test
npm.cmd run build
npm.cmd run audit:assets
```

Expected:
- All commands pass.
- `audit:assets` reports `402/402 present`, `0 missing`, `0 invalid`, `0 placeholders`, `0 releaseBlocking`.
- `npm.cmd run build` does not show the Vite large chunk warning.
- Three.js / React Three / Canvas / WebGL are not reintroduced.

## Host Setup

- [ ] Host computer is on the same Wi-Fi as all phones.
- [ ] Host computer is not on a guest network with client isolation.
- [ ] Start the local stack with `npm.cmd run dev -- --host 0.0.0.0`.
- [ ] Confirm the TV route loads on the host desktop: `/tv`.
- [ ] Confirm `?debug` is available when needed: `/tv?debug`.
- [ ] Confirm `VITE_PUBLIC_CLIENT_ORIGIN` or the dev script exposes a LAN URL, not only `localhost`.
- [ ] Confirm Windows firewall allows the client/server port.
- [ ] Confirm no old dev server is already occupying the expected port.

## Network Checklist

- [ ] QR and displayed join URL use a LAN IP, not `localhost`.
- [ ] Phone can open the LAN URL directly in the browser.
- [ ] Phone can reach the same HTTP origin shown by TV.
- [ ] WebSocket diagnostics use the LAN host, not the phone's own `localhost`.
- [ ] HTTP/HTTPS are not mixed.
- [ ] Guest Wi-Fi, AP isolation, VPN, or captive portals are disabled for the test.
- [ ] If phone connection fails, open phone URL with `?debug=1` and record:
  - page URL
  - API base URL
  - WebSocket URL
  - room code
  - connection status
  - last socket error

## Diagnostics Already Available

Use only during development/debug sessions:

- `/tv?debug=1` shows the TV debug drawer.
- `/?debug=1` shows the phone debug drawer.
- Connection diagnostics include page/API/WebSocket origin data through `src/client/shared/network.ts`.
- Socket debug events are captured through `useRoomSubscription`.
- Debug drawers must not expose private rivalry agenda text on TV or to the wrong phone.

No extra diagnostics were added in Phase 7A because the current debug layer already covers URL origin, socket status, and recent server/client events.

## Manual QA Matrix

Devices:
- [ ] Desktop Chrome host.
- [ ] iPhone Safari, if available.
- [ ] Android Chrome, if available.
- [ ] Tablet browser, if available.
- [ ] Desktop browser mobile viewport only as fallback.

Viewports:
- [ ] TV `1920x1080`.
- [ ] TV `1366x768`.
- [ ] Phone portrait around `390x844`.
- [ ] Smaller phone width, if available.

Modes:
- [ ] Solo.
- [ ] Co-op.
- [ ] Rivalry.

Player counts:
- [ ] 1 player.
- [ ] 2 players.
- [ ] 4 players, if practical.

## Browser Smoke Before Real Device

- [ ] `/tv` at `1920x1080` loads without console/page errors.
- [ ] `/tv` at `1366x768` loads without console/page errors.
- [ ] `/tv?resetAuth=1` loads without console/page errors.
- [ ] `/` at `390x844` loads phone controller.
- [ ] `/?room=TEST1` at `390x844` preserves the room code.
- [ ] Direct image URLs for threat, anomaly, and scenario art return valid images.
- [ ] `canvasCount` is `0`.

## Join Flow

- [ ] TV creates or loads a room.
- [ ] QR card appears with room code.
- [ ] QR encodes a LAN URL.
- [ ] Phone scans QR and opens controller.
- [ ] Phone room code is prefilled from the URL.
- [ ] Manual room-code fallback works.
- [ ] Player name entry works.
- [ ] Character selection loads.
- [ ] Phone can join without visible connection error.
- [ ] Phone debug drawer can be opened with `?debug=1` if connection fails.

## Character Selection And Ready

- [ ] Character cards show role and complexity.
- [ ] Character cards show starting gear and contract summaries.
- [ ] MASTER ALPHA does not appear in normal player selection.
- [ ] Solo player selects an operative and presses Ready.
- [ ] Solo game starts immediately after Ready.
- [ ] Multiplayer rooms wait until required players are ready.
- [ ] TV waiting copy names who is not ready or who must act.
- [ ] Inactive phones show watch/wait copy, not another player's action controls.

## Solo Flow

1. [ ] Open `/tv`.
2. [ ] Create Solo room.
3. [ ] Join with phone through QR or LAN URL if using phone controller for solo.
4. [ ] Choose operative.
5. [ ] Press Ready.
6. [ ] Confirm game auto-starts.
7. [ ] Roll movement.
8. [ ] Confirm phone says the rolled value and exact-distance requirement.
9. [ ] Choose a legal glowing destination.
10. [ ] Confirm TV route preview and route glow match the phone options.
11. [ ] Resolve sector.
12. [ ] Confirm sector exploration math explains printed icons, blockers, and draw counts.
13. [ ] If shop appears, test Skip / Continue without transaction.
14. [ ] If battle appears, resolve it and test Continue.
15. [ ] Confirm no state waits forever without a required actor or reason.

## Co-op Flow

1. [ ] Open `/tv`.
2. [ ] Choose Co-op.
3. [ ] Two phones join.
4. [ ] Both choose operatives.
5. [ ] Both press Ready.
6. [ ] Confirm TV shows table-level objective, Win Progress, Loss Pressure, and Global Escalation.
7. [ ] Active phone shows the required action.
8. [ ] Inactive phone says who is acting and points to the TV.
9. [ ] Complete at least one movement choice.
10. [ ] Resolve at least one sector or threat.
11. [ ] Trigger or observe scenario pressure/progress if practical.
12. [ ] Confirm result delta chips explain what changed.

## Rivalry Flow

1. [ ] Open `/tv`.
2. [ ] Choose Rivalry.
3. [ ] Two phones join.
4. [ ] Both choose operatives.
5. [ ] Both press Ready.
6. [ ] Phone A sees only Phone A private agenda.
7. [ ] Phone B sees only Phone B private agenda.
8. [ ] TV does not show private agenda description, trigger, reward, or private progress.
9. [ ] Reveal an agenda if available.
10. [ ] TV shows only public-safe reveal summary.
11. [ ] Progress or complete an agenda if the current state supports it.
12. [ ] Owner phone shows private progress/completion details.
13. [ ] Other phone does not show owner-private details.

## Movement Checks

- [ ] Movement roll appears on phone.
- [ ] TV movement value matches the rolled value.
- [ ] Roll 1 shows adjacent exact-distance legal destinations.
- [ ] Roll 2 shows two-step legal destinations.
- [ ] Roll 3+ shows longer legal destinations.
- [ ] Route glow appears on TV.
- [ ] Phone route cards show destination, steps, danger, threat lanes, tags, and rewards.
- [ ] Illegal/no-route cases show a reason.
- [ ] No teleport movement is possible.

## Sector Exploration Checks

- [ ] Sector brief shows printed threat icons.
- [ ] Sector brief shows unresolved blockers.
- [ ] Sector brief shows draw due by lane.
- [ ] Sector brief explains locked/unlocked state.
- [ ] Shop or sector text stays locked until blockers are cleared.
- [ ] Last trigger/cause appears when scenario progress or pressure changes.

## Shop Checks

- [ ] Shop Buy section appears on phone when shopping is available.
- [ ] Shop Sell section appears on phone when held items are sellable.
- [ ] Insufficient salvage disables Buy with a readable reason.
- [ ] Non-sellable items are excluded or explained.
- [ ] Buy confirmation appears.
- [ ] Sell confirmation appears.
- [ ] Salvage changes correctly after buy/sell.
- [ ] Inventory changes correctly after buy/sell.
- [ ] Skip / Continue is available.
- [ ] Shop skip changes no salvage or inventory.
- [ ] Blocked shops can be skipped but cannot buy/sell.
- [ ] TV shows public shop open/blocked state and public result only.

## Battle And Resolution Checks

- [ ] Battle overlay overrides sector brief during battle/resolution.
- [ ] TV shows operative vs enemy/event.
- [ ] Only the relevant stat is shown.
- [ ] Dice are readable and do not cover portraits.
- [ ] Math row is readable: base + gear + temporary modifier + roll = total vs target.
- [ ] Success/defeat/failure result banner appears.
- [ ] Result delta chips show wounds, heat, trophy, threat defeated/remains, contract/scenario progress if applicable.
- [ ] Continue appears if acknowledgement is required.
- [ ] Post-battle continue advances to the next state.
- [ ] No prompt says waiting forever after resolution.

## Stat Upgrade Progression Checks

- [ ] Defeating a threat grants trophy value and adds the defeated threat to the trophy pile.
- [ ] Phone shows stat upgrade availability once the player has enough trophies.
- [ ] Upgrade choices show current stat, next stat, trophy cost, and disabled reasons.
- [ ] Stat upgrades are unavailable during movement choice, active battle, unresolved threat, and pending resolution.
- [ ] Performing an upgrade deducts trophies equal to the next stat value.
- [ ] Performing an upgrade increases the selected printed/base stat by +1.
- [ ] Phone result chips show `-N Trophies` and `+1 Stat`.
- [ ] TV public result says `[Player] upgraded [Stat] to [Value]`.
- [ ] A later battle/test uses upgraded base stat + gear modifier + temporary modifier + roll = total.
- [ ] Gear remains visible as a modifier and does not merge into the base stat.
- [ ] MASTER ALPHA / QA-only characters cannot use the normal stat upgrade flow.

## Scenario Checks

- [ ] TV scenario panel shows scenario title.
- [ ] TV scenario panel shows public objective.
- [ ] TV scenario panel shows Win Progress.
- [ ] TV scenario panel shows Loss Pressure.
- [ ] TV scenario panel shows Global Escalation separately.
- [ ] Phone Quest tab shows matching public scenario summary.
- [ ] Last trigger/cause explains pressure/progress changes.
- [ ] Scenario art or fallback renders.
- [ ] Scenario status changes to completed/failed when rules trigger it.

## Result Delta Checks

- [ ] TV shows public deltas after major actions.
- [ ] Phone shows public deltas plus owner-private deltas.
- [ ] Deltas answer what changed, who was affected, and why.
- [ ] Example chips appear where applicable:
  - `+1 Heat`
  - `-1 Wound`
  - `+1 Trophy`
  - `Contract +1`
  - `Scenario +1`
  - `Agenda +1`
  - `Item bought`
  - `Item sold`

## Privacy Checks

- [ ] TV never shows private agenda description.
- [ ] TV never shows private agenda trigger text.
- [ ] TV never shows private agenda reward text.
- [ ] Phone A never sees Phone B private agenda details.
- [ ] Phone B never sees Phone A private agenda details.
- [ ] Public reveal summary is safe.
- [ ] Private agenda progress/points stay owner-phone-only unless explicitly public-safe.
- [ ] Debug drawers do not leak private rivalry data to TV or other phones.

## Refresh And Reconnect Checks

- [ ] Phone refresh preserves or cleanly restores seat.
- [ ] TV refresh preserves or cleanly restores host state.
- [ ] `/tv?resetAuth=1` resets host auth intentionally.
- [ ] Rejoining with saved seat does not create duplicate active seats.
- [ ] Reconnecting stale phone is replaced cleanly.
- [ ] Connection errors explain same Wi-Fi, firewall, and localhost/LAN URL issues.

## Image And Rendering Checks

- [ ] Threat art direct URLs load.
- [ ] Anomaly art direct URLs load.
- [ ] Scenario art direct URLs load.
- [ ] Card images render in UI where visible.
- [ ] Scenario art renders in TV/phone scenario surfaces.
- [ ] No broken image icon appears in core flow.
- [ ] No canvas elements are rendered.
- [ ] No WebGL surfaces are rendered.

## Softlock Checks

- [ ] Shop can be skipped.
- [ ] Blocked shop can be skipped.
- [ ] Post-battle can continue.
- [ ] Solo Ready starts the game.
- [ ] Multiplayer Ready waits correctly.
- [ ] Movement no-route state explains why.
- [ ] Disabled actions explain why.
- [ ] No action button silently fails.
- [ ] TV and phone agree on who must act.

## Issue Logging Rule

For every issue, create one entry from `reports/phase-7-playtest-issue-template.md`.

Use one focused fix commit per blocker. Do not combine unrelated playtest fixes.

Severity:
- P0: blocks play, causes softlock, corrupts state, or leaks private data.
- P1: major confusion or broken core flow.
- P2: visual/readability issue.
- P3: polish or nice-to-have.

## Phase 7A Result Notes

- Existing diagnostics were sufficient; no new diagnostic code was added.
- Browser smoke can verify route behavior, images, console errors, and canvas count.
- Real physical phone scan/join must be recorded separately when a device is available.
