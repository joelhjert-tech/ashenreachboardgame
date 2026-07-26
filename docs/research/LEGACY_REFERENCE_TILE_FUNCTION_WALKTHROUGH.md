# Reference Game Tile-Function Walkthrough

## Scope and originality boundary

This is a combined, sanitized behavioral report covering:

- the extended isolated-emulator walkthrough performed on 25 July 2026; and
- a first-pass walkthrough of the installed comparison game on a physical
  Samsung Galaxy S21+, completed through visible controls and ordinary gameplay
  only.

No repository file or game state was modified by the physical-device
walkthrough outside the consequences of normal play. The report deliberately
excludes proprietary names, fiction, card wording, board geometry, stat names
and values, artwork, icons, audio, and screenshots.

Raw evidence remains outside Git at:

`C:\Users\Joel_\Documents\Ashenboardgame\referance game\audit\tile-lifecycle-walkthrough`

No reference binary or asset was copied into Ashenreach.

## Environment and method

### Extended emulator walkthrough

- Emulator: `Legacy_Game_Audit_API30`, Android 11 / API 30.
- Restore point: `installed-baseline`.
- Installed build: verified primary APK, version 8.20.
- Network: airplane mode; no account or personal data.
- Match: default local match with one human and three automated seats.
- Control method: visible UI actions only.
- Prohibited methods not used: state injection, forged rolls, APK modification,
  memory inspection, internal game commands, or fallback APK installation.

The primary match was played with ordinary controls. A screenshot-driven helper
pressed only controls already visible on screen and sampled legal destinations
after rolls. It did not read or mutate application state.

### Physical S21+ first pass

- Device: Samsung Galaxy S21+ (`SM-G996B`).
- Application: the separately installed comparison game.
- Control method: visible controls and ordinary gameplay only.
- Repository mutation: none.
- Out-of-band game-state mutation: none.
- Evidence role: first-pass physical-device corroboration.

The S21+ pass is included as an execution source, but it does not silently add
new rule claims to the matrix. Only behaviors supported by retained evidence
or independently confirmed by both walkthroughs are classified as observed.
Device-only details without a retained lifecycle record remain unverified.

## Observed arrival model

The reference game separates four ideas that are easy to conflate:

1. A space determines whether an arrival has no draw, one draw, or multiple
   draws.
2. Some spaces contain a direct instruction instead of drawing.
3. Drawn cards create their own tests, battles, rewards, events, or persistent
   board encounters.
4. Optional services and player interaction can replace or follow a card
   encounter.

A movement choice is previewed before commitment. Once committed, the arrival
headline identifies the destination and the next mandatory operation. The turn
does not silently skip unresolved arrival work.

## Evidence-backed tile categories

| Generic category | Cards | Trigger and resolution | Persistence / turn behavior | Evidence |
|---|---:|---|---|---|
| Direct fixed challenge | 0 | Landing exposes a mandatory die-based instruction; roll and result resolve on the space | No persistent object was observed; resolution completes before later actions | `66`–`67` |
| Optional service and choice | 0 | Landing offers more than one service; a service can be inspected, cancelled, or selected | Applied recovery/training result persists; service remains within the visit | `72`–`81` |
| Single-card encounter | 1 | Landing announces an investigation, reveals one card, then resolves it | Accepted reward persists in inventory; turn advances only after outcome | `17`–`20` |
| Card-created enemy | 1 | A revealed enemy opens an opposed battle with visible rolls and totals | Defeat consequence is applied before handoff | `82`–`83` |
| Persistent card encounter | 1 | A revealed encounter uses a fixed check and conditional acquisition | Failed acquisition leaves a public encounter associated with the space | `89` |
| Multi-card encounter | 2 observed | Space announces multiple incoming encounters before reveal | Encounters resolve one at a time; each outcome stabilizes before the next | `92`–`93` |
| Player interaction | 0 | Sharing a space can isolate two player actors for a public interaction | Result returns to the board before the automated turn continues | `90` |
| Region crossing | Not isolated | Legal movement can cross into a harder region | Destination arrival begins after relocation; location persists | `92`–`94` |
| Progression reward | Not isolated | An authored objective can be completed when eligible and awards a visible gate-enabling key | The key remains attached to the player and later movement remains rule-gated | automated captures `0076`, `0081` |
| Inner restricted encounter preview | 1 prospective | An inward destination preview discloses a region movement restriction, one encounter, and two public resolution approaches | Arrival and persistence were not confirmed in the retained frame | `109` |
| Card-created event | Not retained with draw banner | An automated arrival reveals an explicit event category within its mandatory encounter sequence | Event remains associated with the public actor until resolution | `126` |
| Restricted-region arrival | Not asserted | An automated actor completes legal inward travel and stabilizes on an inner destination | Location persists and a public encounter control becomes available; the unresolved encounter rule is not inferred | automated capture `0061` |

The machine-readable companion matrix contains the per-observation state,
trigger, draw behavior, ordering, choice, persistence, revisit status,
turn-ending behavior, automated presentation, evidence, and confidence. Its
`landingLedger` also lists every semantically captured arrival retained during
this run; transient automated board frames without a readable arrival state are
not promoted into unsupported rule claims.

## Multiple-card ordering

The observed multi-card space announces the queue before revealing its
contents. Cards are not presented as one blended result. Each revealed
encounter receives its own resolution and consequence before the next queued
encounter begins.

This supports a general sequencing principle: draw count belongs to the space,
while challenge type and outcome belong to each drawn card.

No evidence showed an already-present card increasing or decreasing the printed
draw count. That behavior remains unverified.

## Direct challenges, rewards, penalties, and services

Direct fixed challenges use the space itself as the rule source and do not
require a card reveal. By contrast, the single-card reward and enemy battle
derive their behavior from the revealed card.

The service space demonstrated a true optional choice:

- inspect one paid recovery service;
- cancel without mutation;
- inspect another die-based service;
- resolve only the selected service.

The card-created battle showed the authoritative order clearly:

`reveal → opposing sides → rolls → totals → result → consequence`

The persistent encounter demonstrated that not every revealed card is consumed.
A failed conditional acquisition left the encounter associated with its space.
A later revisit of that exact encounter was not observed, so its repeat rule is
not asserted here.

## Automated-player presentation

Automated turns are public sequences, not silent waits. The display announces
the actor, movement, arrival, draw, test or battle, and applied result. When a
public card is inspected, automation pauses behind an explicit resume control.

This makes the state understandable, although it also means incidental
inspection can interrupt the cadence of an otherwise automatic turn.

## Save, restoration, and lifecycle defect

A force-stop and cold relaunch restored the saved match, including the stable
turn phase, location, and acquired object. Restoration itself did not advance
the turn or repeat the reward.

Ordinary background/resume can still return to a persistent black rendering
surface. When encountered, the safe recovery is force-stop, relaunch, and
restore. Ashenreach must not reproduce this defect.

The primary match reached a saved Round 35 state before encountering a second
late-game lifecycle failure. A visible movement roll resolved, but inspecting
the board never exposed the normal destination-confirmation action. This was
reproduced after force-stop, cold relaunch, and restore. The restored phase and
roll remained stable; no reward, penalty, arrival, or turn handoff repeated.
Because no ordinary visible control could advance that phase, the run did not
reach a natural terminal result.

The isolated package also attempted to initialize analytics, push, billing, and
cloud-save integrations. Airplane mode prevented network communication, and no
account or personal data was supplied. These blocked attempts did not alter the
local match, but they reinforce the need to keep legacy execution isolated.

## Coverage and limitations

Verified directly:

- zero-, one-, and multi-card spaces;
- direct fixed challenge;
- card-created battle, test, event, reward, and persistent encounter;
- resource/service and choice behavior;
- player interaction;
- an objective-awarded progression key;
- outer and middle-region play, an inner-destination preview, and a confirmed
  automated inner-region arrival;
- a cross-region movement;
- public automated turns;
- force-stop/relaunch save restoration.

Not yet evidenced strongly enough to assert a rule:

- an existing board card changing a later draw count;
- a revisit of the same persistent encounter;
- the exact gate requirement at every crossing;
- center-space arrival behavior;
- a natural terminal result.

Those items are marked `unverified` or `blocked-by-observed-input-deadlock` in
the companion matrix rather than inferred from familiarity with any related
game. One late frame appeared to reduce a player presentation, but the retained
evidence did not prove character defeat; that interpretation was deliberately
excluded.

## Cross-check against the earlier audit

The combined walkthrough agrees with all relevant earlier evidence:

- the 32 screenshots confirm setup, movement preview, one arrival, combat,
  inventory, save restoration, and the black-surface defect;
- the continuous recording confirms the same action order and public automated
  presentation;
- the earlier behavior matrix confirms inspect-before-commit movement, explicit
  state mutation, public combat arithmetic, and handoff;
- the sanitized UX findings identify the same strengths and lifecycle risk.
- the physical S21+ first pass confirms that the installed comparison game can
  be exercised through its normal visible interaction path without repository
  or out-of-band state mutation.

The retained emulator evidence adds direct fixed challenges, a cancellable
multi-service choice, a multi-card queue, a persistent board encounter, player
interaction, and cross-region play. No additional tile category is attributed
to the S21+ pass without a retained lifecycle record.

## Ashenreach verification

| Check | Result |
|---|---|
| Content validation | Passed: all canonical content families loaded |
| Typecheck | Passed |
| Tile-function tests | Passed: 6 |
| Board-space tests | Passed: 17 |
| Encounter-lifecycle regression | Passed: 2 in isolated rerun |
| Asset audit | Passed: 511 present, 0 missing, 0 invalid, 0 placeholders |

The first combined encounter-lifecycle run exceeded its five-second test limit
while the Android emulator and visible-control helper were consuming the same
machine. The same two tests passed in isolation with a 15-second runner limit;
no production file was changed.
