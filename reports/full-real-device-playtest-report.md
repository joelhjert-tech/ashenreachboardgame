# Full Real-Device Playtest Report

Date: 2026-07-09  
Branch: cleanup/remove-threejs  
Commit tested: 40a6b3d  
Report type: release-blocker playtest report

## Scope

This pass tested the intended Ashen Reach play setup as far as Codex can execute it locally:

- TV/desktop host through Chromium/Playwright.
- Phone controller through Chromium/Playwright at 390x844 using the LAN URL.
- Solo browser-controlled setup and early play loop.
- Co-op and Nemesis TV smoke creation/rendering.

Important limitation: no physical phone was available to Codex. The LAN URL and phone-sized browser path were verified, but QR scanning, mobile browser persistence, and real device reconnect remain unproven.

## Devices And Browsers Tested

- Desktop host: Chromium via Playwright, 1920x1080.
- Desktop host: Chromium via Playwright, 1366x768.
- Phone controller emulation: Chromium via Playwright, 390x844.
- Physical phone: not tested in this Codex run.

## Network Setup

- Dev API: http://192.168.50.238:8080
- Dev WebSocket: ws://192.168.50.238:8080
- TV host: http://192.168.50.238:5173/tv
- Phone controller: http://192.168.50.238:5173/
- QR/join URL pattern verified in browser: http://192.168.50.238:5173/?room=ROOMCODE

## Commands Run

All baseline commands passed:

```txt
git status --short
npm.cmd run validate:content
npm.cmd run typecheck
npm.cmd run test:engine
npm.cmd run test:client
npm.cmd run test
npm.cmd run build
npm.cmd run audit:assets
```

Results:

- validate:content passed.
- typecheck passed.
- test:engine passed: 14 files, 229 tests.
- test:client passed: 23 files, 212 tests.
- test passed: 57 files, 624 tests.
- build passed with no Vite large chunk warning.
- audit:assets passed: 397/397 present, 0 missing, 0 invalid, 0 placeholders, 0 release-blocking.

Note: the prompt expected 402/402 assets. The current repository audit reports 397/397, and that audit is green.

## Solo Result

Status: partial browser-controlled pass.

Verified:

- Phone join screen loads from LAN URL with room code prefilled.
- Player can enter name and join.
- Character selection appears after join.
- Starting mission selection appears after character selection.
- Ready state appears after selecting a mission.
- Active phone controller appears after setup.
- Header shows wounds/scars only; Heat did not appear.
- Move tab shows Current Tile card before roll.
- Current Tile card showed Ashwalk Bridge, printed icons, blockers, mission relevance, draw state, and Roll Movement.
- Movement roll produced authoritative post-roll state in phone UI.
- A yellow printed lane drew a yellow blocker in the browser-controlled run.
- Once blocked, phone copy changed to "No new draw: printed lane occupied; clear blockers first."
- Battle tab displayed an active encounter card when a card was drawn.
- Battle card included name, type, stat/target, rules copy, and art/fallback area.
- No movement/shop bleed was observed in the Battle tab.
- Phone canvasCount remained 0.

Not fully proven in this run:

- Full destination select/Confirm Move after a clean movement roll, because the observed random path hit a blocker.
- Full battle roll/Continue completion, because the deterministic browser run did not pin a repeatable battle fixture.
- Physical phone touch behavior.

## Co-op Result

Status: TV smoke pass only; full multiplayer controller play remains unproven.

Verified:

- Co-op room creation returned 200.
- TV host rendered at 1366x768.
- TV canvasCount was 0.
- No console/page errors were captured.

Not proven:

- Two real controllers joining, choosing missions, readying, starting, and handing off turns.
- Real-phone reconnect in Co-op.

## Nemesis Result

Status: TV smoke pass only; private controller flow remains unproven in live browser QA.

Verified:

- Nemesis room creation returned 200.
- TV host rendered at 1366x768.
- TV canvasCount was 0.
- No console/page errors were captured.

Not proven:

- Two controllers with owner-private agenda visibility.
- Reconnect restoring private agenda view.
- Real phone privacy behavior.

## Reconnect Result

Status: browser-controller path partially verified; physical-phone reconnect unproven.

Verified:

- Browser controller setup reached active phone state after join, character, mission, and ready.
- Existing reconnect implementation is covered by automated tests from the baseline suite.

Not proven:

- Closing a real phone browser and reopening/rescanning QR to reclaim the same seat.
- Mobile localStorage persistence under the actual phone browser.

## Movement Result

Status: partial live browser pass.

Verified:

- Move tab starts with explicit Roll Movement button.
- Movement dice/result state appears after roll.
- Current Tile explains printed icons, blockers, draw due, mission relevance, and action state.
- Lane-specific blocker copy is correct when the lane is occupied.
- No duplicate "Draw due" copy appeared while the matching blocker was present.

Not fully proven:

- End-to-end Confirm Move and TV token animation in a live browser run.
- Legal destination count under multiple rolls/sectors in real play.

## Battle Result

Status: partial live browser pass.

Verified:

- Battle tab showed active encounter card.
- Encounter card showed readable name, card type, relevant stat/target, rules summary, and visual card area.
- Dice/math controls remained visible.
- No movement destination list appeared in Battle.
- No shop stock appeared in Battle.

Not fully proven:

- Complete roll/result/continue sequence from a deterministic encounter.
- Active item use in a live battle.

## Shop Result

Status: automated suite verified; live browser shop transaction unproven.

Verified indirectly:

- Shop tests passed in test:client and full test suite.
- Previous committed shop category icon work remained in baseline.

Not proven in this browser pass:

- Buy, sell, and skip in a live shop sector.
- Locked/open shop state on real phone.

## Mission Result

Status: browser-controlled phone and TV smoke pass.

Verified:

- Starting mission selection appeared after character selection.
- Mission relevance appeared in the Move tab Current Tile card.
- TV mode smoke rendered without errors.

Not fully proven:

- Mission image/art on every relevant phone surface.
- Mission progress from an actual completed objective.
- TV active mission panel after a fully started multiplayer room.

## Scars And Afflictions Result

Status: visible status confirmed; effect fixture needed.

Verified:

- Phone active controller header showed wounds/scars, not Heat.
- Heat did not reappear in the observed phone UI.
- Automated baseline tests covering scar/affliction display passed.

Not proven live:

- A player with a live scar card and active mechanical effect.
- Scar formula source during an affected roll.
- Scar-driven gear/action disabled reason in real browser.

## Item And Gear Result

Status: automated suite verified; live item use fixture needed.

Verified indirectly:

- Passive gear display tests passed.
- Item-use and gear source tests passed in baseline suites.
- Phone Battle tab separated encounter card from combat assist/usable items in the observed state.

Not proven live:

- Server-confirmed active item use changing a live formula/result.
- Active item charges/use count updating after a live use.
- Passive weapon source during a completed live battle formula.

## Layout Result

Phone 390x844:

- Join, character select, mission select, ready, active controller, Move tab, and Battle tab rendered without observed horizontal overflow.
- Bottom nav remained usable in observed screens.
- canvasCount remained 0.

TV:

- 1920x1080 and 1366x768 smoke screens rendered.
- canvasCount remained 0.
- No browser console/page errors were captured.

## P0 Issues

### P0-RD-001: Physical phone QR/reconnect remains unproven

Severity: P0 release validation blocker, not a confirmed product code bug.

The acceptance rule says the game is not playtest-ready until a real phone can join, act, disconnect, reconnect, and continue. Codex cannot physically scan QR or close/reopen a real mobile browser. Browser emulation and LAN URLs passed, but real-device validation still needs a human pass.

Recommended fix order:

1. Run a human real-phone QR test on the same LAN.
2. Join, select character, select starting mission, ready, start, roll movement.
3. Close the mobile browser, reopen/rescan the QR URL, and verify the same seat is reclaimed.
4. Record the phone model, browser, and screenshots.

## P1 Issues

### P1-RD-001: Deterministic full-loop fixture is missing for real-device QA

Severity: P1 validation gap.

The live random solo run reached movement and battle states, but it did not deterministically cover every core loop: clean movement confirm, shop buy/sell/skip, scar effect, active item use, and completed battle result/continue.

Recommended fix order:

1. Add or document a QA fixture route/state that starts with:
   - one legal movement destination,
   - one shop sector,
   - one active battle,
   - one scar effect,
   - one passive weapon,
   - one active usable item.
2. Re-run this report with physical phone and fixture coverage.

## P2 Issues

None confirmed from this pass.

## P3 Issues

None confirmed from this pass.

## Screenshots And Logs

Evidence folder:

```txt
.codex-run/real-device-playtest/
```

Screenshots:

```txt
recon-phone-join.png
recon-after-join.png
recon-after-character.png
recon-after-ready.png
recon-move-before-roll.png
recon-move-after-roll.png
recon-battle-after-draw.png
solo-phone-active-player-390x844.png
solo-tv-lobby-1920x1080.png
tv-coop-smoke-1366x768.png
tv-nemesis-smoke-1366x768.png
tv-solo-smoke-1920x1080.png
```

Logs:

```txt
dev.out.log
dev.err.log
mode-tv-smoke.json
```

## Recommended Fix Order

1. Human real-phone QR/reconnect pass.
2. Deterministic QA fixture for full loop coverage.
3. Re-run Solo full loop from join through one completed move, one completed battle/event, one shop interaction, and one mission progress event.
4. Re-run Co-op with two real controllers.
5. Re-run Nemesis with two clients and verify private agenda boundaries.

## Final Release Readiness

Not playtest-ready as a full real-device release candidate yet.

The automated and browser-controlled baseline is strong, but the hard acceptance rule is not satisfied until a physical phone can join, act, disconnect, reconnect, and continue.
