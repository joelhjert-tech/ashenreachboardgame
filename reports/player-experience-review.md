# Ashenreach Player Experience Review

Date: 2026-07-05

Reviewer lens: average first-time player using the TV host screen plus a phone controller.

Evidence:
- Screenshots: `reports/player-experience-review/`
- Metrics: `reports/player-experience-review/metrics.json`
- Viewports checked: phone `390x844`, TV `1920x1080`, TV `1366x768`
- Browser metrics: no console errors, no horizontal overflow, `canvasCount: 0`

## What Already Works Well

- The staged phone onboarding is much clearer than the earlier mixed join/character screen. `02-phone-join-prefilled.png` shows the player starts with just room code, name, and Join.
- The grimdark visual identity is strong. Portraits, board tiles, battle art, and warm metal framing feel like a board game rather than a generic app.
- The phone CurrentPrompt usually tells the player the next required action in plain terms.
- Movement endpoint glow on TV is much calmer. In navigation, 28 legal destinations were highlighted while route lines stayed at 0 until a destination was selected.
- The TV battle overlay is dramatic and readable at a glance. `17-tv-after-move-1366.png` communicates VS, result, dice, and target better than most other surfaces.
- Inventory now communicates usable timing better than before. `12-phone-inventory.png` clearly shows `USABLE NOW` and `USE NOW`.
- The Quest tab gives a useful long-term objective summary without leaking private rivalry content.

## Issues

### 1. Character selection starts with an advanced character

- Screen/state: phone character selection, `03-phone-character-selection.png`
- What feels wrong: the first visible choice is Joss Var, tagged `ADVANCED`, while the first-game picks are below the fold.
- Why it matters: a new player is likely to choose the first card they see. This can make the first session harder before the player understands the system.
- Severity: P1
- Recommended fix: sort first-game picks to the top, or add a compact first-game recommended row before the full roster.

### 2. Character cards are too dense for a first choice

- Screen/state: phone character selection, `03-phone-character-selection.png`
- What feels wrong: every card includes role, complexity, summary, gear, contract, good at, watch out, five stats, and the select button.
- Why it matters: a first-time player is trying to answer "who should I play?" but gets a mini character sheet per card.
- Severity: P2
- Recommended fix: make the list compact by default: portrait, name, role, first-game marker, one-line playstyle, Select. Move full details behind expand/tap.

### 3. Ready screen feels like a stat spreadsheet

- Screen/state: phone ready/waiting, `04-phone-ready-waiting.png`
- What feels wrong: the screen shows large separate stat rows before the player has done anything. Special abilities continue below the fold.
- Why it matters: after picking a character, the player mainly needs "Ready" and reassurance that the character is reserved.
- Severity: P2
- Recommended fix: prioritize selected character summary, Ready, and "watch the TV". Collapse stats/abilities below a `View sheet` section.

### 4. Join and character screens still feel like web forms on top of board art

- Screen/state: phone join and character selection, `02-phone-join-prefilled.png`, `03-phone-character-selection.png`
- What feels wrong: the form styling is functional but plain. It reads more like a web login than a board-game controller.
- Why it matters: first contact sets expectations. The background is strong, but the form panels are still generic.
- Severity: P3
- Recommended fix: keep the clear layout, but add game-specific command copy and stronger controller styling: "Enter table code", "Claim seat", "Choose operative".

### 5. Movement list is mechanically clear but choice overload is high

- Screen/state: phone movement list, `09-phone-movement-list.png`
- What feels wrong: the player sees 28 legal routes at once, each with multiple tags and a truncated route preview.
- Why it matters: legal does not mean understandable. A first player does not know how to choose between `Danger Reward Threat`, `Danger Hazard Threat`, and `Danger Anomaly Threat`.
- Severity: P1
- Recommended fix: add lightweight grouping or filters: `Safe`, `Shop`, `Quest`, `Reward`, `Danger`. Default-sort recommended/safer destinations first.

### 6. Movement route previews are too truncated to teach route logic

- Screen/state: phone movement list, `09-phone-movement-list.png`
- What feels wrong: rows show `Ashwalk Bridge -> Votive Engine Room -> D...`, so the route preview starts useful and then becomes cut off.
- Why it matters: players need to understand why a destination is legal and what path they are taking.
- Severity: P2
- Recommended fix: keep rows compact, but show either a small numbered route summary or `via 4 sectors` plus full route in the detail screen.

### 7. Movement detail can open mid-detail instead of at the destination header

- Screen/state: phone movement detail, `10-phone-movement-detail.png`
- What feels wrong: the captured detail view starts around sector effects/intel. The destination title, back button, and route context are above the visible area.
- Why it matters: after tapping a destination, the player should immediately see "I selected X" and the confirm action path.
- Severity: P1
- Recommended fix: reset the active scroll container to the top when opening destination detail, or keep destination title/confirm as sticky anchors inside the tab.

### 8. Confirm Move sits too low in a long destination detail

- Screen/state: phone movement detail, `10-phone-movement-detail.png`
- What feels wrong: `Confirm Move` is below a long rules/intel block and competes with bottom navigation.
- Why it matters: the required action should be obvious after reviewing the selected destination.
- Severity: P2
- Recommended fix: place a compact confirm footer immediately after the route steps, then put sector intel and Useful Now below it.

### 9. Result state mixes movement success with battle assist

- Screen/state: after confirm move, `11-phone-after-move.png`
- What feels wrong: the top says `Confirm result` for a successful movement check, but the same screen also shows `Battle Assist`, `Enemy Movement 4`, and combat-card help.
- Why it matters: a first player may not know whether they are confirming movement, using items, or resolving battle.
- Severity: P1
- Recommended fix: split the state into clearer steps: `Movement result` -> `Continue` -> `Threat revealed / Battle setup`. Do not show combat assist until the battle/check step is active.

### 10. Battle state appears under Shop and Action tabs

- Screen/state: phone shop/action tabs during battle, `14-phone-shop-tab.png`, `15-phone-action-tab.png`
- What feels wrong: tapping Shop while a battle is active still shows battle resolution content, while the bottom Shop tab is disabled.
- Why it matters: disabled tabs should explain why they are disabled, not silently keep the player on another command screen.
- Severity: P2
- Recommended fix: if a disabled tab is tapped, show a small locked-state message or do not switch focus. Example: `Shop locked: clear Marrow-Tax Auditors first`.

### 11. Shop promise and shop availability conflict

- Screen/state: move destination detail and later battle/action, `10-phone-movement-detail.png`, `14-phone-shop-tab.png`, `15-phone-action-tab.png`
- What feels wrong: the destination says shop services are available, but after moving, a threat blocks the sector and Shop is unavailable.
- Why it matters: this can feel like the game contradicted itself.
- Severity: P1
- Recommended fix: phrase destination rewards as conditional: `Shop if clear`. After arrival, show `Shop locked until Marrow-Tax Auditors is cleared`.

### 12. Inventory is usable but still visually heavy

- Screen/state: phone inventory, `12-phone-inventory.png`
- What feels wrong: timing summary, category headers, card text, timing text, stat chips, charges, and buttons are all visible at once.
- Why it matters: in battle, the player wants to know "which item should I use now?" and "what happens if I tap it?"
- Severity: P2
- Recommended fix: in active timing windows, show usable items first as compact action cards with effect and cost. Keep full card text expandable.

### 13. Useful Now duplicates inventory state instead of helping decide

- Screen/state: inventory and battle assist, `12-phone-inventory.png`, `13-phone-battle-tab.png`
- What feels wrong: Useful Now lists item names, but does not explain which one is best for the current roll.
- Why it matters: a first player sees options but not priorities.
- Severity: P3
- Recommended fix: add short because-copy: `Choir Static Censer: usable after this roll; can reduce heat/anomaly. Grave Scribe: use after hazard to bank route support.`

### 14. TV map is impressive but hard to read at 1366x768

- Screen/state: TV navigation, `07-tv-navigation-1366.png`
- What feels wrong: tile names, icon legend, operative stats, and right-side sector text are small. The map looks good, but reading it from couch distance is hard.
- Why it matters: the TV should support table awareness without requiring players to walk up to the screen.
- Severity: P2
- Recommended fix: increase TV-distance hierarchy: larger active sector label, larger current prompt, and fewer small text blocks during movement.

### 15. TV current prompt truncates secondary instruction text

- Screen/state: TV navigation, `05-tv-navigation-1920.png`, `07-tv-navigation-1366.png`
- What feels wrong: the right side of the banner shows `LEGAL DESTINATIONS GLO...`
- Why it matters: clipped text weakens trust and makes the TV look more like a constrained web dashboard.
- Severity: P2
- Recommended fix: shorten or wrap the banner meta. Example: `Legal destinations glow`.

### 16. TV selected route line is visible but not strongly tied to destination detail

- Screen/state: selected TV route, `06-tv-selected-route-1920.png`
- What feels wrong: the dashed route appears, but the right rail still focuses on Ashwalk Bridge, not the selected destination.
- Why it matters: observers may not know what endpoint the active player is considering.
- Severity: P2
- Recommended fix: when a destination is selected, change the sector brief title to the destination and show route length, tags, and endpoint reward/risk.

### 17. TV lobby still exposes long join URLs

- Screen/state: TV lobby, `01-tv-lobby-1920.png`
- What feels wrong: lobby shows full LAN URL and seat links in the compact QR module.
- Why it matters: useful for setup, but visually noisy and less board-game-like.
- Severity: P3
- Recommended fix: keep full URL available behind a `Trouble joining?` line or host-only detail. Main lobby should emphasize QR and room code.

### 18. Scenario and quest info is clear but mechanically abstract

- Screen/state: phone quest, `16-phone-quest-tab.png`
- What feels wrong: `Win Progress 0/3`, `Loss Pressure 0/8`, and `Next: Attempt the Star Core...` are clear, but the player may not know what actions advance these.
- Why it matters: players need to connect immediate choices to long-term goals.
- Severity: P2
- Recommended fix: add one line of because-copy: `Progress comes from relay anomalies, artifacts, and contracts.`

### 19. Some copy uses internal/system phrasing

- Screen/state: multiple phone states, especially `11-phone-after-move.png`, `15-phone-action-tab.png`
- What feels wrong: phrases like `Waiting for the server to resolve the current step`, `Sector Math`, and `Draw due` sound implementation-facing.
- Why it matters: these break the board-game tone.
- Severity: P2
- Recommended fix: rewrite system copy into table language: `Resolving result`, `Sector threats`, `Threat draw`.

### 20. Grimdark style is strong but not always interaction-specific

- Screen/state: phone bottom tabs and inactive tabs across captures
- What feels wrong: the same rectangular button language is used for navigation, disabled tabs, action buttons, and utility controls.
- Why it matters: the style is consistent, but first-time players need action hierarchy more than visual sameness.
- Severity: P3
- Recommended fix: differentiate command actions, locked tabs, and passive navigation more strongly through iconography, tone, and disabled reason labels.

## Top 5 Fixes

1. Put first-game recommended characters first and collapse advanced character detail by default.
2. Improve movement choice hierarchy: filter/group destinations and make recommended/safe/shop/quest routes obvious.
3. Reset movement detail scroll to the destination header and move Confirm Move higher.
4. Split movement result from battle setup so the player is not shown battle assist during a movement confirmation step.
5. Add locked-state explanations for disabled bottom tabs, especially Shop and Action after a threat blocks the sector.

## Evidence Limits

- The review reached join, character selection, ready/waiting, movement, movement detail, inventory, quest, battle reveal/result, TV navigation, TV selected route, and TV battle overlay.
- The playthrough selected a shop-tagged destination, but a threat blocked shop access. The open buy/sell transaction flow was not fully reached in this run. The review therefore flags shop availability and explanation issues rather than judging the complete buy/sell transaction UI.
- Screenshots can identify visible hierarchy, clipping, density, and copy issues. They do not prove full keyboard or screen-reader accessibility.
