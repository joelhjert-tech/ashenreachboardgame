# Ashen Reach MVP Rules

This document is the short-form rules reference for the current repository implementation.

## Goal

Win by advancing the active scenario and completing its confrontation. Most scenarios must finish before escalation overtakes the table; an authored pressure-free scenario explicitly disables that loss condition.

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
6. The server shuffles the private Edge deck and deals exactly 1 random Edge Card to every starting player. Players never choose an awarded card.

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
- commit an Edge Card during battle or Hazard setup

## Movement

- Moving into a sector triggers a movement check based on local danger.
- Failure still moves the operative.
- Threat cards in the destination sector can be drawn and resolved.

## Threats

Threat cards are either:

- `hazard`: resolved with a stat check
- `enemy`: resolved with combat, sometimes using an assigned enemy roller in multiplayer

Threat outcomes can:

- deal Wounds
- grant Gear
- add Notes
- advance scenario progress

## Wounds, Recall, and Scars

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
- Completing a contract also awards the next random Edge Card if the player's Edge hand has room.

## Edge Cards

- Start with exactly 1 random card.
- Base hand limit: 2.
- Completing 2 Contracts raises the limit to 3.
- Owning at least 1 Artifact raises the limit by 1, to a maximum of 4.
- Awards are server-random and never present a card-selection screen.
- If the hand is full, the award is skipped; no discard choice interrupts play.
- Use at most 1 Edge Card in a resolution, either by committing its value or activating its ability.
- During an enemy battle or Hazard setup, its printed value may become one die of the upcoming 2d6 roll; the server rolls the other die.
- The committed die cannot be rerolled.
- Pre-roll abilities are committed during the matching setup, after assistance is locked where required, or before a paid shop action.
- Post-roll abilities open as a private blocking reaction after the authoritative dice result but before rewards, wounds, mission triggers, and scenario triggers are finalized.
- A player may decline a post-roll reaction and keep the card.
- The used card is publicly revealed on TV and then discarded. Unplayed cards remain owner-private.

## Scenarios

Implemented scenarios:

1. The Broken Seal
2. The Throne of Ash
3. The Mirror of False Heroes
4. The Devourer Beneath
5. The Labyrinth Engine
6. The Dying Star
7. The Broken Concordance
8. The Grinning Tithe

Each scenario has:

- setup rules
- ambient pressure rules
- a confrontation sequence
- a victory threshold

The Grinning Tithe is the pressure-free exception: Global Escalation cannot rise or cause defeat. The normal Red, Blue, and Yellow Threat pools remain active, with one matching Pallid Retinue minion shuffled into each lane per bag cycle. At every round end, one random card from the separate four-card Retinue assault deck attacks one server-selected random active operative; the deck contains the three minions and Tithe-Lock Audit hazard and reshuffles only after all four cards have appeared. The only shared scenario objective is dealing 6 wounds to the Pallid Curator at the Cinder Gate.

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
