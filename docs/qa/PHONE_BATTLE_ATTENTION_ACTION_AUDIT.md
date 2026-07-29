# Phone Battle Attention and Action Audit

Date: 2026-07-28  
Scope: current production phone battle presentation, report-only  
Code, mechanics, payloads, artwork, and styles changed: **0**

## Executive finding

The battle interface is visually coherent and keeps its primary action visible at all
three tested sizes. It has no horizontal overflow, no default-state scrolling, and no
browser console or page errors.

The principal attention problem is spatial separation. The operative and enemy values
sit near the top of the battle stage while the primary action is pinned immediately
above the battle navigation. The empty region between `View details` and the primary
action grows from 167 px at 360×800 to 251 px at 430×932. The evidence needed for the
decision therefore becomes farther from the decision control on a taller phone.

The current interface also presents two result experiences:

1. The roll-result view announces `Success`, `Threat defeated`, and exposes
   `Continue`.
2. The settled verdict then announces the result and consequence again and exposes a
   second `Continue`.

That intermediate result state attracts attention and asks for action before the final
consequence presentation. It is the highest-priority action-flow concern found in this
audit.

## Method

- Started an isolated QA server with the current working tree and QA fixtures enabled.
- Followed the current four-step setup through visible browser controls.
- Captured these authoritative battle fixture stages:
  - Encounter.
  - Battle setup.
  - Pending enemy roll.
  - Rolled result.
  - Settled success.
  - Settled defeat.
- Repeated the sequence at 360×800, 390×844, and 430×932.
- Recorded bounding boxes, button state, text, image behavior, scrolling, overflow,
  and console/page errors.
- Inspected the render paths for conditional battle choices, gear, abilities, rerolls,
  and settled results.

The temporary server was stopped after capture. The existing development server was
not changed or stopped.

Raw measurements:
`.tmp-playtest/phone-battle-attention-audit/measurements.json`

## State and action summary

| State | Primary gameplay action | Other visible actions | Decision completeness |
|---|---|---|---|
| Encounter | Enter Combat | View details; Operative; Gear; Battle Log | Enemy and operative shown, but no explicit enemy intent or possible consequence |
| Battle setup | Roll Grit | View details; Operative; Gear; Battle Log | Operative base value and enemy difficulty shown |
| Pending enemy roll | Roll for Enemy | View details; Operative; Gear; Battle Log | Same comparison; responsibility changes in header and action |
| Rolled result | Continue | View details; Operative; Gear; Battle Log | Final totals and success shown, but consequence is not yet the settled verdict |
| Settled success | Continue | Review lore | Total, consequence, and applied changes shown |
| Settled defeat | Continue | Review lore | Total, consequence, and applied changes shown |

## Visible information-region inventory

| Region | Gameplay purpose | Actionable in the current state? | Attention assessment |
|---|---|---:|---|
| Player identity rail | Confirms player, operative, sector, Wounds, and Salvage | No | Useful persistent orientation; Wounds can matter to risk, while Salvage is usually not a battle decision input |
| Required-action rail | Announces `Your Turn` or `Result Ready` | No | Duplicates the duel/result heading and consumes a strong full-width attention band |
| Cinematic backdrop | Establishes battle atmosphere and stat colour | No | Decorative; low information value |
| Duel header | Names the challenge stat and current stage | No | Useful, but `Battle`, `Roll required`, and `Enemy roll` repeat information already communicated by the primary action |
| Operative portrait | Identifies the acting operative | No | Useful identity, but one of the two dominant visual regions |
| Operative identity caption | Operative and player name | No | Useful in multiplayer; player name repeats the top identity rail |
| Operative seal | Pre-roll base stat or post-roll operative total | No | Decision-critical; highly visible and correctly adjacent to the enemy seal |
| Enemy portrait | Identifies the opponent | No | Useful and cinematic, but consumes the same area as all decision controls combined |
| Enemy identity caption | Threat category and enemy name | No | Useful |
| Enemy seal | Displays difficulty | No | Decision-critical, but it is not an enemy-intent description |
| Rift and `VS` marker | Communicates opposition | No | Purely decorative after the two-column layout already establishes comparison |
| Duel prompt | Tells the player to roll or says totals are locked | No | Repeats the primary action or settled state |
| Equipment-available alert | Tells the player eligible gear exists and opens Gear | Conditional | Useful only when present; absent in the captured Grit battle |
| Operative ability panel | Presents a timing-valid operative ability | Conditional | Useful when it changes the current decision |
| Outcome strip | Announces defeated, tied, or failed | No | In the roll-result state it duplicates the duel header and precedes the final consequence |
| Consequence list | Shows authoritative deltas/effects | No | Essential after resolution |
| Required battle choice | Presents a mandatory reaction or choice | Conditional yes | Essential; correctly blocks generic continuation |
| Optional battle option | Presents optional rerolls or Scar adaptations | Conditional yes | Essential when present; not rendered in the captured enemy states |
| View details | Opens dice, formula, modifiers, flavor, and summary | Yes, disclosure only | Secondary information, but visually much closer to the comparison than the primary action |
| Expanded battle details | Auditable roll and modifier breakdown | No, except close | Useful on demand; correctly hidden by default |
| Primary action dock | Enter, roll, wait, or continue | Yes when legal | The correct action anchor; too distant from the evidence above it |
| Operative context tab | Opens operative status | Yes, navigation only | Secondary; repeats identity and counters already in the header |
| Gear context tab | Opens battle-eligible inventory | Yes, navigation; gear inside may act | Always visible even when no gear is eligible |
| Battle Log context tab | Opens full roll, opponent, modifiers, and stage | Yes, navigation only | Secondary audit information; overlaps conceptually with View details |
| Settled result title | Announces success/defeat and opponent | No | Clear, but `Result ready` repeats the outer status rail |
| Settled portraits | Re-establishes operative and challenge | No | Cinematic identity; repeats the immediately previous duel composition |
| Settled total seal | Shows the operative total | No | Clear focal point; challenge total is only present in its accessible label |
| Settled consequence panel | Shows outcome and up to four changes | No | The most useful result information |
| Review lore | Opens optional flavor text | Yes, disclosure only | Appropriately secondary, though it shares the action row |
| Settled Continue | Acknowledges the applied result | Yes | Correct primary action once the consequence is stable |
| Reconnect footer | Says player name, no countdown, reconnect-safe | No | Technical reassurance rather than a gameplay decision; lowest-value visible text |

## Distance measurements

Measurements use rendered CSS pixels. Vertical gap is the empty edge-to-edge distance;
center distance is the Euclidean distance between region centers.

### Ready-to-roll battle

The “player total” position is a base-stat seal before the roll (`Grit ready 5`), then
becomes `Operative total` after the roll.

| Viewport | Player seal ↔ enemy seal center | Horizontal gap between seals | Enemy seal → action vertical gap | Player seal → action vertical gap | Detail control → action empty gap |
|---|---:|---:|---:|---:|---:|
| 360×800 | 252.4 px | 194.0 px | 472.6 px | 472.6 px | 167.0 px |
| 390×844 | 278.0 px | 219.6 px | 516.6 px | 516.6 px | 193.1 px |
| 430×932 | 318.0 px | 259.6 px | 602.5 px | 602.5 px | 251.0 px |

The empty detail-to-action area occupies 20.9%, 22.9%, and 26.9% of the viewport
height respectively. Taller screens increase separation instead of using the space to
keep evidence and action perceptually grouped.

### Relevant counters

Wounds and Salvage remain in the top identity rail. Their bottom edge is 649.3 px,
692.6 px, and 780.1 px above the primary-action dock at the three viewports.

- Wounds is relevant when deciding whether a known failure consequence is survivable.
- Salvage is relevant only for a battle option that spends or changes Salvage.
- Neither counter is repeated near a timing-valid option or the action dock.
- The default battle view does not show possible failure consequences, so the player
  cannot connect the Wound counter to risk without opening secondary information or
  already knowing the card.

### Settled result

| Viewport | Result | Total seal → action gap | Consequence → action gap | Total seal/action center distance |
|---|---|---:|---:|---:|
| 360×800 | Success | 262.2 px | 6.7 px | 350.9 px |
| 360×800 | Defeat | 237.6 px | 6.7 px | 326.2 px |
| 390×844 | Success | 259.3 px | 6.7 px | 339.6 px |
| 390×844 | Defeat | 233.4 px | 6.7 px | 313.8 px |
| 430×932 | Success | 257.7 px | 6.7 px | 338.0 px |
| 430×932 | Defeat | 247.4 px | 6.7 px | 327.7 px |

The settled result groups the consequence and Continue action well. The total remains
farther away, but the applied consequence—not the arithmetic—is the immediate input
to acknowledgement.

### Reroll information

No reroll option was present in any of the 18 current enemy-battle captures, so a
rendered pixel distance cannot be reported honestly for that region.

The current source inserts optional battle options after the outcome and before
`View details`. Only the solo emergency reroll and eligible Scar adaptations are
forwarded into this optional battle region. The solo emergency reroll itself is
limited to failed solo Hazards, so it does not appear in this opposed enemy fixture.

This is marked **not observed**, not passed or failed. A future visual audit should use
a deterministic opposed battle with an eligible after-roll Scar adaptation and record
the option/action relationship directly.

## Attention that does not help the current decision

### P1 — Intermediate result and second Continue

The roll-result view already presents:

- `Success` in the duel header.
- Both final totals.
- `Authoritative totals locked`.
- `Threat defeated`.
- A `Continue` action.

The next settled state repeats the verdict, portraits, total, defeat/reward wording,
and `Continue`. This creates an intermediate acknowledgement without a player choice.
It is the clearest source of action noise.

Evidence:
`PhoneBattleView.tsx:528-533`, `PhoneBattleView.tsx:634-647`, and the separate settled
gate at `PhoneBattleView.tsx:470-484`.

### P1 — Primary action is detached from its evidence

The primary action remains visible, but the layout grows an empty field above it.
`View details` is closer to the player/enemy comparison than `Roll Grit`, so the
secondary disclosure can become the more perceptually connected action.

Evidence:
`.phone-battle-shell__action` at `styles.css:12218-12237`; duel geometry at
`styles.css:28131-28260`.

### P2 — No explicit enemy-intent region

The enemy’s highest-salience informational element is labelled `Difficulty`. It says
how hard the roll is, not what the enemy will do or what failure costs. The large enemy
portrait communicates identity and threat, but not the decision consequence.

The audit therefore used the difficulty seal as the closest available proxy for
“enemy intent.” The interface has no distinct intent region.

Evidence: `PhoneBattleDuelStage.tsx:70-81`.

### P2 — Repeated status language

- The outer rail says `Your Turn`; the duel action says `Roll required`; the primary
  button says `Roll Grit`.
- The outer rail says `Result Ready`; the settled gate says
  `Result ready · waits for your choice`.
- The rolled-result header says `Success`; the outcome strip says
  `Threat defeated`.

The repetitions reinforce state but do not add decision information.

### P2 — Always-visible context navigation

`Operative`, `Gear`, and `Battle Log` each receive a 44 px target directly beneath the
primary action. In the captured battle:

- Operative repeats identity and counters.
- Gear opens even though the eligibility alert is absent.
- Battle Log overlaps with `View details`.

These are valid secondary destinations, but they remain equally present when they do
not help the current decision.

Evidence: `PhoneBattleView.tsx:257-263` and `PhoneBattleView.tsx:589-628`.

### P3 — Technical reconnect footer

`BattleAu · no countdown · reconnect-safe` is visible inside every settled verdict.
It is reassuring, but does not explain the result or help choose Continue versus lore.
It is low-salience noise rather than an urgent issue.

Evidence: `PhoneResultReadyGate.tsx:188`.

### P3 — Very small secondary labels

Several visible labels are below normal gameplay-body size:

- Duel seal label: 0.46 rem.
- Result seal label: 0.52 rem.
- Portrait category labels: 0.55–0.58 rem.
- Result footer: 0.6 rem.
- Battle navigation: approximately 0.54–0.64 rem.
- `View details`: measured at 9.6 px.

These labels are secondary and the core numbers/actions remain readable, but they
require disproportionate visual effort relative to their importance.

Evidence: `styles.css:28247-28259`, `styles.css:9871-9883`,
`styles.css:9922-9934`, `styles.css:10024-10027`, and
`styles.css:12254-12266`.

## What currently works

- Primary action is always in the viewport.
- Primary button and battle navigation meet the 44 px minimum target in all captures.
- Default duel states have no vertical scroll and no horizontal overflow.
- Operative and enemy seals are aligned and directly comparable.
- The current duel artwork uses `object-fit: contain`; both source images were fully
  represented in the measured 390×844 battle stage.
- The settled result puts consequence text immediately above Continue.
- Required choices block generic continuation in the component contract.
- Reduced-motion rules exist for the duel presentation.
- Images use asynchronous decoding; no duplicate request or console symptom appeared
  during this audit.
- No console or page errors were recorded.

## Evidence index

### 360×800

- `.tmp-playtest/phone-battle-attention-audit/360x800-encounter.png`
- `.tmp-playtest/phone-battle-attention-audit/360x800-battle-setup.png`
- `.tmp-playtest/phone-battle-attention-audit/360x800-pending-enemy-roll.png`
- `.tmp-playtest/phone-battle-attention-audit/360x800-rolled-result.png`
- `.tmp-playtest/phone-battle-attention-audit/360x800-success.png`
- `.tmp-playtest/phone-battle-attention-audit/360x800-defeat.png`

### 390×844

- `.tmp-playtest/phone-battle-attention-audit/390x844-encounter.png`
- `.tmp-playtest/phone-battle-attention-audit/390x844-battle-setup.png`
- `.tmp-playtest/phone-battle-attention-audit/390x844-pending-enemy-roll.png`
- `.tmp-playtest/phone-battle-attention-audit/390x844-rolled-result.png`
- `.tmp-playtest/phone-battle-attention-audit/390x844-success.png`
- `.tmp-playtest/phone-battle-attention-audit/390x844-defeat.png`

### 430×932

- `.tmp-playtest/phone-battle-attention-audit/430x932-encounter.png`
- `.tmp-playtest/phone-battle-attention-audit/430x932-battle-setup.png`
- `.tmp-playtest/phone-battle-attention-audit/430x932-pending-enemy-roll.png`
- `.tmp-playtest/phone-battle-attention-audit/430x932-rolled-result.png`
- `.tmp-playtest/phone-battle-attention-audit/430x932-success.png`
- `.tmp-playtest/phone-battle-attention-audit/430x932-defeat.png`

## Verification

- Requested viewports captured: **3/3**
- Battle states captured per viewport: **6**
- Total screenshots: **18**
- Horizontal overflow: **0**
- Default battle scroll distance: **0 px**
- Browser console errors: **0**
- Browser page errors: **0**
- Production code modified: **0**
- Mechanics or payloads modified: **0**
- Assets or styles modified: **0**
- Temporary QA ports 5183 and 8090: **closed**
