# Ashen Reach Host TV Motion System

## Authority contract

The server owns every presented fact. The host owns composition and
interpolation only. Animation never submits a command, creates a route, rolls a
die, predicts a result, repeats an effect, delays a resolver, or changes
gameplay timing.

The system consumes `StatePatch<PublicPatchPayload>`. Owner-private actions use
public `hostInstruction`/`waitingInstruction` copy or a generic wait statement.

## Presentation ownership

Only one focused narrator may own a state:

1. Endgame result overlay.
2. Focused movement HUD/journey.
3. Host Motion Cue for handoff, battle, encounter, arrival, shop, final stage,
   waiting, reward, penalty, or required action.
4. Persistent board, active-operative marker, progress tracks, and status strip.

The motion cue yields completely while movement is focused. The route journey
also hides the sector brief so route title, current step, destination, and
arrival state do not overlap.

## Functional motion

- Directs attention to an authoritative revision.
- Carries active-marker transfer and handoff context.
- Shows movement stage without changing movement duration mechanically.
- Frames encounter, arithmetic, result, and consequence order.
- Distinguishes public reward, penalty, and neutral change.
- Explains reconnect and waiting without exposing private data.

## Atmospheric motion

- Bounded cue entrance.
- Restrained map dimming for encounter/result focus.
- Existing board, dice, battle, progression, and endgame effects.
- No decorative motion may conceal text or carry exclusive meaning.

## State vocabulary

`turn`, `movement`, `arrival`, `encounter`, `battle`, `reward`, `penalty`,
`waiting`, `shop`, and `final`.

Each cue presents four textual sequence steps. The highlighted step is derived
from the public authoritative stage, never elapsed wall time.

## Timing classes

| Class | Duration | Use |
|---|---:|---|
| Instant | 80 ms | State response and reduced-motion settle |
| Quick | 140 ms | Small support transitions |
| Normal | 220 ms | Copy and board-filter transitions |
| Deliberate | 360 ms | Host cue entrance |

Cue copy uses 90 ms and 150 ms visual offsets inside the same 360 ms entrance.
Movement, dice, battle, progression, and endgame retain their existing tokens.
The `qaMovementHold` and `qaArrivalHold` query flags are development-only
capture aids and never affect production or server resolution.

## Cancellation and revision handling

Stable IDs are composed from public required-action, handoff, movement,
arrival/rule, resolution/stage, battle/revision/stage, shop, and final-stage
identities. A new authoritative ID renders immediately and replaces the old
CSS animation. No queue waits for a previous animation to finish.

The cue owns no timer, interval, requestAnimationFrame, event listener, network
request, or gameplay callback.

## Reconnect

Session storage records only whether a stable presentation ID has entered.
Reconnect/remount with the same ID renders the stable `--settled` frame.
Server state and effects remain the sole source of truth; completed motion and
public effects do not replay.

## Reduced motion

Reduced motion removes translation, staged entrance, pulse, and board-filter
interpolation. Actor, location, required action, arithmetic, outcome, public
change, reason, and next action remain visible immediately.

## Performance limits

- Transform and opacity for cue entrance.
- One bounded backdrop blur; no new full-screen blur stack.
- No canvas, WebGL, Three.js, generated art, audio, or new image source.
- One cue maximum.
- No duplicated image request introduced.
- No listener or timer accumulation.

## Feature exceptions

- Ended games suppress the cue and yield to the P14 result overlay.
- Focused movement suppresses the cue and uses the route journey.
- Arrival remains ahead of encounter focus while the canonical arrival stack
  is active.
- Battle results appear only after the public battle outcome exists.
- Owner-private decisions never render their option text.
