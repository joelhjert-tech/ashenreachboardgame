# Ashen Reach MVP Rules

This document is the short-form rules reference for the current repository implementation.

## Goal

Win by advancing the active scenario and completing its confrontation before escalation overtakes the table.

Lose if escalation reaches the collapse threshold for the current session mode.

## Session Modes

- `single-player`: one seat, tuned with a higher escalation threshold
- `multiplayer`: two to six seats, shared escalation pressure

## Setup

1. Create a session.
2. Pick `single-player` or `multiplayer`.
3. Join available seats from phones.
4. Start the session from the host screen.
5. The default scenario is `The Broken Seal` unless changed in code.

## Turn Structure

Each active seat rotates through these phases:

1. `navigation`
2. `sector`
3. `action`
4. `resolution`
5. `broadcast`

At the end of a full round, escalation increases from round pressure.

## Core Actions

During play, a seat can:

- move to a connected sector
- resolve a hazard check
- resolve combat against an enemy
- accept a contract
- complete a contract if its objective is met
- stabilize escalation when the action window is clear
- attempt the scenario confrontation from the core chamber

## Movement

- Moving into a sector triggers a movement check based on local danger.
- Failure still moves the operative, but usually adds Heat.
- Threat cards in the destination sector can be drawn and resolved.

## Threats

Threat cards are either:

- `hazard`: resolved with a stat check
- `enemy`: resolved with combat, sometimes using an assigned enemy roller in multiplayer

Threat outcomes can:

- add Heat
- deal Wounds
- grant Gear
- add Notes
- advance scenario progress

## Heat and Wounds

- Heat represents mounting exposure and instability.
- Wounds represent direct harm.
- If wounds hit the wound threshold, the operative is recalled and gains a scar.
- Recalled operatives must recruit a replacement before acting again.

## Gear

Gear grants a stat bonus in one slot:

- `weapon`
- `armor`
- `utility`

Gear can be earned through combat rewards or contract completion.

## Contracts

- Each contract has a defeat-count objective in the current MVP.
- Seats can hold one active contract at a time.
- Completing a contract grants its defined reward.

## Scenarios

Implemented scenarios:

1. The Broken Seal
2. The Throne of Ash
3. The Mirror of False Heroes
4. The Devourer Beneath
5. The Labyrinth Engine
6. The Dying Star

Each scenario has:

- setup rules
- ambient pressure rules
- a confrontation sequence
- a victory threshold

## Escalation

Escalation rises from:

- round pressure
- wounds taken

Escalation can be reduced by stabilizing the breach.

Mode thresholds:

- `single-player`: collapse at `8`
- `multiplayer`: collapse at `6`

Difficulty modifier:

- escalation adds `+1` difficulty at levels `2-3`
- `+2` at `4-5`
- `+3` at `6-7`
- and so on

## Host / Phone Roles

Host TV:

- shows the tactical map
- shows the active operative
- shows room and session state

Phone:

- portrait mode is limited info
- landscape mode shows the full character card
- active players submit actions from the phone

## Current MVP Boundaries

The following are intentionally partial in the current milestone:

- board text is not yet fully effect-driven
- character abilities exist in data but are not fully implemented as a system
- anomaly, artifact, scar, and escalation content is validated and authored, but not all are fully surfaced in gameplay resolution yet
