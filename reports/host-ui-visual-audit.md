# Host UI Visual Audit

## Outcome

The host display already had a strong map-first command-board foundation. The audit focused on defects visible in real captures rather than replacing the established design. The main corrections were movement HUD containment, battle outcome consolidation, shop instruction consolidation, startup QR readability, and reconnect priority.

## Baseline findings

### Hierarchy and readability

- Idle board: strong. The board, active operative, Win Progression, Loss Pressure, live status, sector brief, and scenario art form a useful command hierarchy.
- Movement at 1366x768: broken. A late CSS rule overrode the centered HUD layout, leaving a large empty slab and placing roll data outside the viewport.
- Battle: cinematic art and side-by-side math were effective, but the center repeated the enemy name, used `No margin` for a successful tie, and rendered duplicate Threat-state chips.
- Shop: atmosphere and service cards were appropriate, but `Choose on player phone` and equivalent waiting copy appeared three times.
- Startup: room code and QR were prominent, but the raw LAN URL wrapped one character at a time.
- Disconnect: the active operative could be marked disconnected while the top status still instructed that player to choose a shop action.

### Website-like elements

The shop used a grid, but its worn card frames, large location identity and presentation-only controls remained within the game language. The audit removed redundant dashboard-like footer cells rather than redesigning the whole overlay.

### Couch readability

At both target sizes, combatant names, totals, scenario outcome, room code, and progression values remain readable. Small operative metadata and individual tile text are secondary by design; the sector brief owns readable tile rules.

## Screenshot-led corrective iterations

1. Baseline review identified clipped movement panels, battle duplication, vague wait text, shop repetition and QR wrapping.
2. First implementation centered movement panels and consolidated battle/shop content.
3. First after-capture review showed the map had become too dim beneath the corrected HUD and a long defeated chip could exceed the center column.
4. Second pass restored full map visibility, constrained result chips, gave the shop sector a full-width status row, and prioritized reconnect state over shop state.
5. Final captures confirmed no horizontal overflow at 1920x1080 or 1366x768.

## Design scores

| Area | Before | After | Evidence |
|---|---:|---:|---|
| Board hierarchy | 4/5 | 4/5 | Map remains the default dominant surface. |
| Movement clarity | 2/5 | 5/5 | Centered HUD, visible canonical route, bounded layout. |
| Battle clarity | 3/5 | 5/5 | One opponent identity, explicit tie rule, one encounter-state result. |
| Shop clarity | 3/5 | 4/5 | One public instruction; result footer only when meaningful. |
| Waiting/reconnect | 3/5 | 5/5 | Actor and exact next action override stale event framing. |
| Privacy | 5/5 | 5/5 | Automated private-string checks stayed clean. |
| Reduced motion | 4/5 | 5/5 | Dedicated browser capture and computed animation assertion. |

## Four critique seats

### New player

The active event and actor are clear. Movement now says what was rolled and that the phone chooses. Battle totals and tie behavior are explicit. Must-fix issue resolved: reconnect no longer asks a disconnected player to keep shopping.

### Optimizer

Animation does not alter rules or hide the authoritative route. Reconnect restores settled state. Private Artifact and Rivalry information remained absent. No gameplay exploit was introduced.

### Family / casual player

The large battle art and clear success/failure result work from across the room. Shop animation remains restrained. The 1.38 second card reveal is the longest cinematic and can be bypassed by reduced motion.

### Rules lawyer

All visible totals come from active resolution and outcome projections. The TV does not claim private selections or become an input surface. `Tie succeeds` is shown only when the authoritative success result is true and totals are equal.

## Deferred visual opportunities

- Dedicated deterministic captures for every hazard, anomaly, reaction, Scar, recall and multi-Threat sequence.
- Original sound assets for existing hooks.
- A four-phone browser fixture for stacked operative and congestion layouts.
- Human couch-distance playtesting; automated screenshots are not a substitute.
