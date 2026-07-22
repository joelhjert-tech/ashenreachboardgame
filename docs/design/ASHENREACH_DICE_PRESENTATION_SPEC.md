# Ashen Reach dice presentation specification

## Authority and synchronization

Dice are resolved once by the server through `rollDice` and the existing movement,
check, combat, and reroll actions. Clients never select a face, infer a dice count,
or decide when gameplay advances. The presentation layer consumes only projected
server values.

The presentation sequence is:

1. The authoritative required action exposes one roll command to its owner.
2. The phone locks that command immediately after submission.
3. Phone and TV show an anticipation state without a fabricated face.
4. A new authoritative result revision supplies ordered faces, raw total,
   modifiers, final value, and result.
5. Clients may animate toward those supplied faces.
6. Gameplay handoff continues from server state, not an animation callback.

Reconnect restoration renders the stable current result immediately. A result is
animated only when an already-mounted presentation changes from pending to a new
authoritative result revision.

## Current architecture audit

- Randomness: `src/game/engine/dice.ts`, with server-owned crypto, seeded, or test
  sequence sources.
- Movement: `MOVEMENT_ROLL_REQUESTED` is validated by `RoomServer`, which rolls
  the canonical number of dice, records `MOVEMENT_ROLLED`, and stores a stable
  movement resolution ID, raw total, modifiers, and final allowance.
- Checks and battle: `DICE_ROLL_STARTED` creates the public rolling stage. The
  server later emits `CHECK_ROLLED`, `COMBAT_RESOLVED`, or an assisted equivalent.
  `activeResolution` and `battlePresentation` expose ordered raw faces and
  authoritative arithmetic.
- Rerolls: the server validates timing and cost, generates the replacement roll,
  and emits `SOLO_REROLL_RESOLVED` or the relevant canonical reaction. Existing
  action guards reject stale and duplicate requests.
- Existing rendering: movement used a numeric HUD, while battle used several
  independent numeric treatments and the legacy attack/defence dice component.
  Those presentations did not share roles, timing, reconnect suppression, or
  accessible result language.
- Existing sound: the audio manager already exposes a dice-roll cue. P13 does not
  add an audio subsystem.
- Existing haptics: phone turn feedback exists, but no canonical dice-specific
  haptic contract is available. P13 documents the hook and does not invent one.

## Presentation data

The shared client model contains:

- stable presentation ID and authoritative revision;
- context and public roll purpose;
- actor name;
- ordered dice with numeric value, role, previous value, and rerolled state;
- raw total;
- projected modifiers;
- final value and optional target;
- ready, submitting, rolling, result, reaction, or complete stage;
- public outcome wording.

Movement projection adds only the raw faces already present in its canonical
`MOVEMENT_ROLLED` event. It does not add or recalculate gameplay state.

## Visual identity

Dice are blackened alloy blocks with worn bone numerals, shallow industrial
bevels, restrained ember seams, and a dark iron casting plate. Every face also
has a visible numeric label. One and six are never represented by ornamental
symbols alone.

The phone uses 58–76 px dice so the required action and follow-up remain above
the navigation clearance. The TV uses 88–132 px dice, integrated with the
movement HUD or battle chamber rather than replacing the board or combatants.

## Motion

- Anticipation: 140 ms command response with hidden faces.
- Tumble: 560 ms transform and rotation toward predetermined values.
- Impact/settle: 220 ms.
- Result emphasis: 420 ms.
- Modifier reveal: 180 ms after the faces settle.
- Final value: 220 ms after modifiers.

No gameplay waits for these durations. A changed projection cancels stale visual
timers. Hidden or restored clients show stable values without replay.

The optional presentation variation is derived from the stable presentation ID
and die index. It changes only rotation direction and a small offset. It does not
use gameplay randomness or alter faces, order, totals, or outcomes.

## Movement

Before the roll, phone shows the purpose and explicit dice count with one roll
action. TV identifies the active player and movement context without a command.
After receipt, ordered faces, raw result, modifiers, and final movement remain
visible while legal destinations appear. No acknowledgement is added.

## Battles and tests

The dice row is part of the existing encounter chamber. Operative and opponent
dice remain separate and labelled. Fixed-difficulty tests do not fabricate an
opponent die. Raw totals, modifier sources, final totals, target, and outcome use
the existing auditable P3 arithmetic.

## Multi-die and rerolls

Every die keeps its projected order and a text label (`Die 1`, `Die 2`, or a
canonical role). A rerolled die may show its previous value with an arrow and a
`Rerolled` label. Non-rerolled dice remain stable. Cost and remaining uses remain
owner-private and come from existing legal-action projection. TV shows only a
public reaction wait.

## Reduced motion

Reduced motion replaces tumble and impact with a short opacity/face reveal. It
preserves every die, raw total, modifier, final value, target, outcome, and reroll
label. It adds no decorative delay.

## Accessibility

- Roll buttons name purpose and dice count.
- Each die exposes its index/role and value as text.
- Raw total, modifiers, final value, and target have explicit labels.
- A single polite status announces the completed result; tumble frames are
  hidden from assistive technology.
- Colour is never the only reroll distinction.
- Controls retain the shared 44 px minimum touch target.
- Focus remains governed by the existing required-action system and is not moved
  on unchanged projection revisions.

## Sound and haptic hooks

Existing audio may map request, impact, and settle to approved local assets and
must respect mute. Existing phone haptics may provide one activation and one
settle pulse in a future bounded pass. Neither channel is required to understand
the result, and neither replays on reconnect.

## Files expected to change

- shared dice presentation model/component and scoped CSS;
- movement and battle phone views;
- TV movement and battle presentation;
- public movement projection typing and raw-face projection;
- deterministic QA fixtures, tests, capture script, and P13 reports.

## Risks and controls

- Desynchronization: render only projected faces and totals; never calculate a
  gameplay result in the component.
- Replay: animate only a live pending-to-result transition.
- Privacy: keep owner reroll commands and balances out of TV/waiting projections.
- Accessibility: result text remains complete without motion, colour, sound, or
  haptics.
- Performance: DOM/CSS transforms only, bounded elements, no canvas, no Three.js,
  and no board-frame rerenders.
