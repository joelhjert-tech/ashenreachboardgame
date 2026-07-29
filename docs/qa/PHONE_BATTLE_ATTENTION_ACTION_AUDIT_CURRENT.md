# Current Phone Battle Attention and Action Audit

Date: 2026-07-28  
Scope: current production phone battle interface, after the coordinated phone/TV
battle-attention refinements  
Change policy: report and evidence only

Production code, mechanics, payloads, assets, and styles changed: **0**

## Executive finding

The current battle interface is materially better than the earlier audited version:

- A normal roll result no longer exposes an intermediate Continue action.
- The transient result does not reveal totals or a verdict while consequences are
  still applying.
- The primary roll action now sits 6.7 CSS px below `View Details` at every tested
  size instead of being separated by a growing empty field.
- The settled verdict presents one Continue action immediately after the applied
  consequence.
- There is no horizontal overflow, document overflow, default battle scrolling,
  console error, or page error in any of the 18 captures.

The primary remaining decision problem is that the interface still has no enemy-intent
region. `Difficulty 12` tells the player how hard the battle is, but not what failure
will do. The largest visual object is the enemy portrait, while the information needed
to judge risk is absent.

The player and enemy score seals also remain 284–330 px above the primary action.
The action is now grouped with its disclosure control, but the full-height portrait
stage still separates the decision evidence from the decision control.

## Method

- Started an isolated QA server from the current working tree with QA fixtures
  enabled.
- Joined and completed setup through ordinary visible phone controls.
- Captured 6 authoritative stages at each requested viewport:
  - Encounter.
  - Battle setup.
  - Pending enemy roll.
  - Roll result while consequences apply.
  - Settled success.
  - Settled defeat.
- Recorded rendered bounding boxes, visible controls, font sizes, images, scrolling,
  overflow, console errors, and page errors.
- Inspected the current source paths for conditional gear, abilities, required
  choices, optional reactions, rerolls, and the unified result gate.
- Stopped the task-created QA server and confirmed ports 5183 and 8090 closed.

Raw evidence:

` .tmp-playtest/phone-battle-attention-audit-current/measurements.json `

## Current state and action summary

| State | Primary action | Other visible actions | Decision state |
|---|---|---|---|
| Encounter | Enter Combat | View Details; Operative; Gear; Battle Log | Operative, enemy, stat, and difficulty are visible. Enemy consequence is not. |
| Battle setup | Roll Grit | View Details; Operative; Gear; Battle Log | Same comparison; roll is legal. |
| Pending enemy roll | Roll for Enemy | View Details; Operative; Gear; Battle Log | Assigned roller is actionable, but the reason for rolling for the enemy is not explained in the battle surface. |
| Roll result | None | Operative; Gear; Battle Log | Correct non-actionable wait while authoritative consequences settle. |
| Settled success | Continue | Review Lore | One stable result, applied changes, and one acknowledgement. |
| Settled defeat | Continue | Review Lore | One stable result, applied changes, and one acknowledgement. |

## Visible information-region inventory

| Visible region | Gameplay purpose | Actionable in current state? | Attention value |
|---|---|---:|---|
| Player identity rail | Confirms player, operative, sector, Wounds, and Salvage | No | Useful orientation. Wounds can affect risk; Salvage is irrelevant unless a visible option spends it. |
| Required-action rail | Announces `Your Turn` or `Result Ready` | No | Strong full-width band. `Result Ready` is premature during `Applying Battle Consequence`. |
| Cinematic background | Establishes battle atmosphere | No | Decorative and low contrast; does not compete heavily. |
| `Battle · Grit` header | Names the current challenge stat | No | Useful and concise after the prior duplicate-copy reduction. |
| Operative portrait | Identifies the acting operative | No | Cinematic identity; visually dominant. |
| Operative caption | Shows operative and player names | No | Useful in multiplayer; player name repeats the top rail. |
| Operative score seal | Shows ready stat before rolling and final total when applicable | No | Decision-critical pre-roll evidence. |
| Enemy portrait | Identifies the opposition | No | Cinematic and dominant, but does not explain enemy behavior. |
| Enemy caption | Shows Threat category and enemy name | No | Useful identity. |
| Enemy `Difficulty` seal | Shows the target value | No | Decision-critical difficulty, but not enemy intent. |
| Rift/VS seam | Establishes opposition | No | Decorative; the side-by-side portraits already communicate opposition. |
| Equipment alert | Announces timing-valid gear and opens Gear | Conditional yes | Useful when present; absent in the captured battle. |
| Operative ability panel | Presents a timing-valid ability | Conditional yes | Useful only when it changes the current choice. |
| Required-choice panel | Presents an authoritative reaction or choice | Conditional yes | Essential; correctly blocks generic continuation. |
| Optional battle-option panel | Presents rerolls or optional Scar adaptations | Conditional yes | Essential when present and positioned before details/action. Not rendered in the sampled enemy battle. |
| View Details | Opens dice, modifiers, formula, and flavor | Yes, disclosure | Secondary. It is visually adjacent to the primary action. |
| Expanded details | Provides an auditable breakdown | No, except close | Useful on demand and correctly collapsed by default. |
| Primary action | Enter, roll, wait, or acknowledge | Yes when legal | Correct action anchor; 44+ px target. |
| Operative context tab | Opens operative status | Yes, navigation | Secondary and repeats identity/counters. |
| Gear context tab | Opens eligible battle gear | Yes, navigation | Remains enabled when the main view says no gear is eligible. |
| Battle Log context tab | Opens stage, roll, opposition, and modifiers | Yes, navigation | Overlaps with View Details. |
| Resolution-wait panel | Prevents an early result reveal while effects settle | No | Correct lifecycle safeguard. |
| Resolution-wait signal dots | Communicates processing | No | Atmospheric feedback; continuous animation carries no exclusive meaning and is removed by reduced motion. |
| Verdict title | Announces success or defeat cinematically | No | Clear and appropriately dominant after resolution. |
| Verdict portraits | Re-establishes actor and challenge | No | Cinematic; repeats the preceding battle pairing. |
| Verdict total seal | Shows the authoritative player total | No | Strong focal point. Target total remains available semantically rather than visually. |
| Consequence heading and copy | Explains what happened | No | Essential result information. |
| Applied-change list | Shows reward, Wound, persistence, and other deltas | No | Essential and limited to meaningful changes. |
| Review Lore | Opens optional flavor text | Yes, disclosure | Correctly secondary to Continue. |
| Continue | Acknowledges the stable result | Yes | Correct single primary action. |
| Reconnect footer | Shows player name, no countdown, and reconnect safety | No | Technical reassurance that does not help the current decision. |

## Distance measurements

All values are rendered CSS pixels. Edge gap is empty edge-to-edge space. Center
distance is the Euclidean distance between region centers.

### Ready-to-roll comparison

The pre-roll “player total” is the ready stat seal (`Grit Ready 5`). Because no
enemy-intent component exists, the enemy `Difficulty 12` seal is the only measurable
proxy.

| Viewport | Player seal ↔ difficulty center | Seal ↔ action vertical edge gap | Seal ↔ action center distance | Details ↔ action edge gap | Action ↔ bottom navigation empty gap |
|---|---:|---:|---:|---:|---:|
| 360×800 | 252.4 px | 284.0 px | 364.4 px | 6.7 px | 195.0 px |
| 390×844 | 278.0 px | 301.9 px | 385.6 px | 6.7 px | 221.2 px |
| 430×932 | 318.0 px | 329.9 px | 419.0 px | 6.7 px | 279.1 px |

The score comparison is internally well grouped. The remaining distance comes from
the portrait stage between the seals and the action. Taller screens enlarge this
distance by 45.9 px from the smallest to largest viewport.

### Relevant counters

Wounds and Salvage are in the top identity rail. Their bottom edge is:

| Viewport | Counter rail → primary action edge gap |
|---|---:|
| 360×800 | 454.3 px |
| 390×844 | 471.5 px |
| 430×932 | 501.1 px |

- Wounds is relevant if failure can cause a Wound.
- Salvage is relevant only when a current option spends or changes Salvage.
- The battle surface does not show possible failure consequences, so the player
  cannot connect current Wounds to enemy risk without prior card knowledge.
- Neither counter moves next to a timing-valid gear, reroll, or consequence.

### Reroll information

No reroll was available in the standard opposed-enemy fixture at any captured size.
An honest rendered distance therefore cannot be reported for this state.

Current source ordering places optional reroll/Scar actions immediately above
`View Details`, followed by the primary action. From the current CSS, the minimum
bottom-edge distance from an optional panel to the primary action is approximately
57.4 px: a 6.7 px margin, the 44 px details control, and another 6.7 px gap. This is
a source-derived estimate, not screenshot evidence.

The missing fixture coverage is itself an audit finding: a deterministic enemy battle
with a legal after-roll reroll is required to evaluate how the optional action competes
with `Keep Current Result`.

### Settled verdict

| Viewport | Outcome | Total seal → action edge gap | Total seal → action center | Consequence → action edge gap |
|---|---|---:|---:|---:|
| 360×800 | Success | 285.0 px | 373.8 px | 6.7 px |
| 360×800 | Defeat | 260.3 px | 349.1 px | 6.7 px |
| 390×844 | Success | 282.0 px | 362.3 px | 6.7 px |
| 390×844 | Defeat | 256.2 px | 336.4 px | 6.7 px |
| 430×932 | Success | 280.5 px | 360.7 px | 6.7 px |
| 430×932 | Defeat | 270.2 px | 350.5 px | 6.7 px |

The result action is correctly grouped with the consequence rather than the arithmetic.
This is appropriate because the decision is acknowledgement, not calculation.

## Findings ranked by attention cost

### P1 — Enemy intent is absent

The enemy portrait is one of the two largest regions, but the only associated rule
information is `Difficulty 12`. The phone does not state the known public consequence
of failure before the roll.

The player therefore sees how hard the battle is without seeing why the difficulty
matters. Wounds in the header cannot support a risk decision without an intent or
stakes statement.

Source: `src/client/phone/PhoneBattleDuelStage.tsx:61` and
`src/client/phone/PhoneBattleDuelStage.tsx:75`.

### P1 — `Result Ready` conflicts with the consequence-processing state

During the transient roll-result capture, the outer required-action rail says
`Result Ready`, while the battle surface says `Applying Battle Consequence` and
offers no action. The battle surface is correct; the outer status attracts attention
with a state that is not yet actionable.

Source: `src/client/phone/PhoneBattleView.tsx:502`.

### P2 — Portraits separate evidence from action

The score seals are easy to compare with each other, but remain 284–330 px above the
roll action. The portrait stage carries identity and atmosphere, not additional
decision evidence. At 430×932 the seal/action center distance reaches 419 px.

Source: `src/client/styles.css:28174` and `src/client/styles.css:28262`.

### P2 — No reroll-ready visual fixture

Optional rerolls have a defined component position and server authority, but the
current browser fixture cannot render a legal opposed-battle reroll. This prevents
repeatable visual regression checks for the precise decision that most needs the
player total, reroll text, and primary action grouped together.

Source: `src/client/phone/PhoneBattleView.tsx:594` and
`src/client/phone/PhoneActionPanel.tsx:4470`.

### P2 — Always-visible secondary navigation

`Operative`, `Gear`, and `Battle Log` remain enabled throughout the battle and during
the non-actionable consequence wait.

- Operative repeats the identity rail.
- Gear remains openable when no eligible gear alert exists.
- Battle Log overlaps with View Details.

The controls are valid escape hatches, but attract equal attention regardless of
whether they can change the current decision.

Source: `src/client/phone/PhoneBattleView.tsx:257`.

### P2 — Several gameplay labels are roomier than they are readable

Current authored sizes include:

- Score-seal label: `0.46rem` (about 7.4 px).
- Portrait category/player labels: `0.58rem` (about 9.3 px).
- View Details: `0.6rem` (about 9.6 px).
- Battle navigation: about `0.54–0.64rem` (8.6–10.2 px).
- Result consequence body/effects: `0.72rem` (about 11.5 px).
- Result technical footer: `0.6rem` (about 9.6 px).

The principal number and action remain legible, but secondary labels require more
visual effort than their generous surrounding regions suggest.

Source: `src/client/styles.css:28290`, `src/client/styles.css:28247`,
`src/client/styles.css:12152`, `src/client/styles.css:12244`,
`src/client/styles.css:9962`, and `src/client/styles.css:10014`.

### P3 — Technical reconnect copy remains visible in the verdict

`BattleAu · no countdown · reconnect-safe` is not a gameplay result, choice, or next
step. It occupies the final line of the consequence card while the important deltas
already explain the stable state.

Source: `src/client/phone/PhoneResultReadyGate.tsx:188`.

### P3 — Large unused lower field after the roll action

The empty space between the action and bottom battle navigation grows from 195 px to
279.1 px. This no longer separates evidence from the action, so it is not a primary
defect. It does make the primary action appear to float in the upper half of taller
phones while three secondary navigation controls remain anchored at the bottom.

## Confirmed improvements since the previous audit

- Double Continue: **fixed**. The transient roll result is a non-actionable wait.
- Early result reveal: **fixed**. No dice, total, verdict, or consequence is shown in
  the wait state.
- Action/disclosure separation: **fixed**. View Details and the roll action are 6.7 px
  apart at all sizes.
- Repeated duel status copy: **reduced** to one `Battle · Stat` heading.
- Unified result: **working**. One settled verdict, one consequence block, one
  Continue.
- Result hierarchy: **working**. Consequence is 6.7 px above its actions.

## Web-interface guideline review

### `src/client/phone/PhoneBattleView.tsx`

- `src/client/phone/PhoneBattleView.tsx:257` — secondary navigation remains enabled
  during a non-actionable processing state.
- `src/client/phone/PhoneBattleView.tsx:594` — reroll/optional-action path lacks a
  deterministic rendered visual regression fixture.

### `src/client/phone/PhoneBattleDuelStage.tsx`

- `src/client/phone/PhoneBattleDuelStage.tsx:61` — high-salience enemy region exposes
  difficulty but no intent/stakes information.

### `src/client/phone/PhoneResultReadyGate.tsx`

- `src/client/phone/PhoneResultReadyGate.tsx:187` — technical reconnect copy attracts
  attention without helping result acknowledgement.

### `src/client/styles.css`

- `src/client/styles.css:28290` — 0.46rem score labels are exceptionally small.
- `src/client/styles.css:12244` — battle navigation text is 0.54–0.64rem.
- `src/client/styles.css:9962` — consequence body and effect copy is 0.72rem.
- `src/client/styles.css:10014` — reconnect footer is 0.6rem.

Accessibility positives:

- All battle actions use semantic buttons.
- Visible action targets are at least 44 px.
- Focus-visible styles exist for battle navigation and disclosures.
- Images have alternative text or are explicitly decorative.
- Reduced motion disables the battle-shell animations.
- The consequence wait uses `role="status"` and `aria-live="polite"`.

## Evidence index

### 360×800

- `.tmp-playtest/phone-battle-attention-audit-current/360x800-encounter.png`
- `.tmp-playtest/phone-battle-attention-audit-current/360x800-battle-setup.png`
- `.tmp-playtest/phone-battle-attention-audit-current/360x800-pending-enemy-roll.png`
- `.tmp-playtest/phone-battle-attention-audit-current/360x800-rolled-result.png`
- `.tmp-playtest/phone-battle-attention-audit-current/360x800-success.png`
- `.tmp-playtest/phone-battle-attention-audit-current/360x800-defeat.png`

### 390×844

- `.tmp-playtest/phone-battle-attention-audit-current/390x844-encounter.png`
- `.tmp-playtest/phone-battle-attention-audit-current/390x844-battle-setup.png`
- `.tmp-playtest/phone-battle-attention-audit-current/390x844-pending-enemy-roll.png`
- `.tmp-playtest/phone-battle-attention-audit-current/390x844-rolled-result.png`
- `.tmp-playtest/phone-battle-attention-audit-current/390x844-success.png`
- `.tmp-playtest/phone-battle-attention-audit-current/390x844-defeat.png`

### 430×932

- `.tmp-playtest/phone-battle-attention-audit-current/430x932-encounter.png`
- `.tmp-playtest/phone-battle-attention-audit-current/430x932-battle-setup.png`
- `.tmp-playtest/phone-battle-attention-audit-current/430x932-pending-enemy-roll.png`
- `.tmp-playtest/phone-battle-attention-audit-current/430x932-rolled-result.png`
- `.tmp-playtest/phone-battle-attention-audit-current/430x932-success.png`
- `.tmp-playtest/phone-battle-attention-audit-current/430x932-defeat.png`

## Verification

- Requested viewports captured: **3/3**
- Authoritative battle stages per viewport: **6**
- Total screenshots: **18**
- Horizontal overflow: **0**
- Vertical document overflow: **0**
- Default duel/wait scroll distance: **0 px**
- Console errors: **0**
- Page errors: **0**
- Canvas/WebGL nodes: **0**
- Production code modified: **0**
- Mechanics/payloads modified: **0**
- Assets/styles modified: **0**
- Task-created ports 5183/8090: **closed**
