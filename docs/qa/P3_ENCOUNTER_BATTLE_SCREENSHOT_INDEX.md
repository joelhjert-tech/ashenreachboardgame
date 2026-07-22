# P3 Encounter and Battle Screenshot Index

## Capture environment

- Root: `docs/qa/p3-encounter-battle/`
- Phone: 390×844 and 360×800
- TV: 1920×1080 and 1366×768
- Source: real room creation and WebSocket projections with environment-gated canonical QA fixtures
- Browser findings: 84 screenshots, zero horizontal overflow, zero console errors
- Motion evidence: five WebM recordings

Each row below represents matching files for both listed viewports, using the filename pattern shown.

## Owner phone

| State | Files | Review result |
|---|---|---|
| Encounter entry | `phone/01-encounter-entry-{viewport}.png` | Identity, art, and Enter combat action visible |
| Long encounter text | `phone/02-long-encounter-text-{viewport}.png` | Mechanical action remains above long details |
| Battle ready | `phone/03-battle-ready-{viewport}.png` | Tested skill and Roll action clear |
| Two-die battle | `phone/05-two-die-battle-{viewport}.png` | Canonical two dice and total visible |
| Roll submitting | `phone/06-roll-submitting-{viewport}.png` | Duplicate submission disabled |
| Rolling | `phone/07-rolling-{viewport}.png` | State change visible without authoring result |
| Reaction available | `phone/08-reaction-available-{viewport}.png` | Owner-only reroll timing visible |
| Reroll cost | `phone/09-reroll-cost-{viewport}.png` | One-charge cost and replacement behavior explicit |
| Reroll submitting | `phone/10-reroll-submitting-{viewport}.png` | Repeat submission disabled |
| Modifier breakdown | `phone/11-modifier-breakdown-{viewport}.png` | Named components and arithmetic readable |
| Final totals | `phone/12-final-totals-{viewport}.png` | Result equation fits without overflow |
| Success | `phone/13-success-{viewport}.png` | Success and Continue unmistakable |
| Failure | `phone/14-failure-{viewport}.png` | Failure distinct from operative defeat |
| Damage consequence | `phone/16-damage-consequence-{viewport}.png` | Exact public consequence visible once |
| Private reward choice | `phone/17-private-reward-choice-{viewport}.png` | Owner controls present; not projected to TV |
| Private Scar choice | `phone/18-private-scar-choice-{viewport}.png` | Owner-only blocking choice visible |
| Result with Continue | `phone/19-result-with-continue-{viewport}.png` | One primary action remains |
| Reconnect during battle | `phone/20-reconnect-during-battle-{viewport}.png` | Authoritative stage restored |
| Reconnect private choice | `phone/21-reconnect-private-choice-{viewport}.png` | Choice ownership restored without replay |
| Reduced motion result | `phone/23-reduced-motion-result-{viewport}.png` | Same information, no motion dependency |

Phone viewport values are `390x844` and `360x800`.

## TV / host

| State | Files | Review result |
|---|---|---|
| Board before encounter | `host/01-board-before-encounter-{viewport}.png` | Normal planning context preserved |
| Encounter focus | `host/02-encounter-focus-{viewport}.png` | Board recedes and encounter dominates |
| Battle entry | `host/03-battle-entry-{viewport}.png` | Opposing participants and art contained |
| Combatant comparison | `host/04-combatant-comparison-{viewport}.png` | Player and encounter identity clear |
| Raw dice | `host/05-raw-dice-{viewport}.png` | Both authoritative rolls readable |
| Modifier presentation | `host/06-modifier-presentation-{viewport}.png` | Named modifiers shown once |
| Final totals | `host/07-final-totals-{viewport}.png` | Totals dominate calculation stage |
| Success result | `host/08-success-result-{viewport}.png` | Winner and consequence hierarchy clear |
| Failure result | `host/09-failure-result-{viewport}.png` | Failure distinct and legible |
| Public damage | `host/11-public-damage-{viewport}.png` | Public consequence only |
| Private decision waiting | `host/12-private-decision-waiting-{viewport}.png` | Generic waiting; no private options |
| Public reward result | `host/13-public-reward-result-{viewport}.png` | Reward shown once after confirmation |
| Persistent encounter | `host/14-persistent-encounter-{viewport}.png` | Persistent status remains understandable |
| Return to board | `host/15-return-to-board-{viewport}.png` | Focus closes cleanly to canonical board |
| Result before reconnect | `host/16a-result-before-reconnect-{viewport}.png` | Baseline for replay comparison |
| Reconnect restored result | `host/16-reconnect-restored-result-{viewport}.png` | Restored state does not masquerade as a new effect |
| Reduced motion result | `host/17-reduced-motion-result-{viewport}.png` | Full outcome retained without animation |

TV viewport values are `1920x1080` and `1366x768`.

## Non-owner phone privacy states

| State | Files | Review result |
|---|---|---|
| Waiting for roll | `waiting-phone/01-waiting-for-roll-{viewport}.png` | No owner roll control |
| Waiting for reaction | `waiting-phone/02-waiting-for-reaction-{viewport}.png` | No private reaction options |
| Waiting for private reward | `waiting-phone/03-waiting-for-private-reward-{viewport}.png` | No item candidates or private values |
| Public result | `waiting-phone/04-public-result-{viewport}.png` | Public outcome only |
| Reconnecting | `waiting-phone/05-reconnecting-{viewport}.png` | Clear connection status, no stale controls |

Waiting-phone viewport values are `390x844` and `360x800`.

## Motion recordings

- `recordings/straightforward-combat.webm`
- `recordings/two-die-modified-combat.webm`
- `recordings/reroll-reaction-flow.webm`
- `recordings/private-consequence-reward-flow.webm`
- `recordings/persistent-encounter-flow.webm`

## Machine-readable evidence

`capture-results.json` records every screenshot, viewport, measured horizontal overflow, visible buttons, unsupported states, warnings, and browser errors.

## Unsupported rather than fabricated

- One-die battle: canonical combat uses two operative dice.
- Draw: canonical ties follow the existing success policy.
- Stale-action recovery: covered by the P1 required-action capture because that banner is outside the P3 focused battle shell.

## Manual correction pass

The first visual review found cached TV art hidden at zero opacity, stale private fixture state, shared-context phone authentication, duplicate result labels, and a legacy modifier presentation ambiguity. These were corrected and the affected captures were regenerated. The final archive is the reviewed after-state set.
