# Phone Action Encounter-Start Debug

## Scope

This report records the pre-prototype functional audit. It was completed before Action-tab prototype code was changed. The completed map-tile repair remains the authority for arrival order and current-rule projection.

## Reproduction

1. A movement resolves and updates the operative location.
2. The server creates `ENCOUNTER_DRAWN` for the next unfilled printed lane or recurring challenge.
3. The reducer stores `currentEncounter`, changes the phase to `action`, and creates an `activeResolution` at `card_reveal`.
4. Phone projection exposes `encounter`, `activeResolution`, `pendingTileChallengePrivate` where applicable, and the public tile-arrival stack.
5. `PhoneActionPanel` correctly creates a Hazard/Event/Challenge `CHECK_REQUESTED` action or Enemy `COMBAT_REQUESTED` action in `threatActions`.
6. Those controls are rendered only by the Encounter/Battle tab.
7. If the phone's locally selected tab remains `action`, `canShowSelectedTab` currently accepts that selection even though the Action tab is disabled by the encounter.
8. The Action tab renders `Resolve encounter first` and exposes no start control. The displayed encounter is therefore real, but the visible tab has no executable route into it.

## Root cause

The primary defect is presentation routing, not tile generation or encounter resolution:

- stale local tab selection is accepted with `Boolean(tab)` instead of requiring the selected tab to remain enabled;
- encounter-start controls are isolated in the Battle/Encounter presentation rather than represented through a shared canonical action model;
- the current `CHECK_REQUESTED` and `COMBAT_REQUESTED` client commands identify only seat and stat. The server derives the current encounter, but the request does not prove which revealed encounter the client intended to start.

## Canonical lifecycle discovered

| Category | Ready state | Current start path | First executable state |
|---|---|---|---|
| Hazard | `currentEncounter.cardType = hazard`, `activeResolution.stage = card_reveal` | `CHECK_REQUESTED` | `battle_setup`, followed by the authoritative roll request |
| Recurring Hazard/Anomaly Challenge | Same Hazard path plus `pendingTileChallenge` | `CHECK_REQUESTED` | `battle_setup`; challenge identity remains server-owned |
| Event / Encounter / discovery card | Runtime `cardType = hazard` with public `presentationType` | `CHECK_REQUESTED` | Canonical check, effect, or generated owner choice |
| Enemy / fixed enemy | `currentEncounter.cardType = enemy`, `card_reveal` | `COMBAT_REQUESTED` | `battle_setup`, then authoritative battle roll lifecycle |
| Fixed board-space text | No `currentEncounter`; typed board action | `RESOLVE_SPACE_TEXT` | Canonical board effect or owner choice |

The server already validates the active seat, normal-turn eligibility, phase, encounter family, tested stat, assistance timing, prompts, and replayed phase. The repaired end-turn guard already blocks both ready and active mandatory encounters.

## Required repair

1. Introduce one typed encounter-start intent carrying owner identity plus the projected encounter ID and stable encounter revision.
2. Derive family, tested stat, difficulty, tile, and first resolution action exclusively on the server.
3. Reject wrong owner, inactive seat, wrong tile, stale revision, replay, already-started encounter, and blocking prompt.
4. Project the same start command into one shared `PhoneActionViewModel` used by all three prototypes.
5. Treat disabled stale tab selections as invalid so ordinary production routing returns to the canonical Encounter tab.
6. Preserve legal pre-roll Gear, Item, Follower, and assistance actions beside the start action.

## Modes and reconnect

- Single-player, co-op, and Rivalry use the same current encounter and reducer path.
- Owner-private event choices remain in the phone projection; TV receives only public encounter state.
- Server encounter state already survives save/reconnect. The missing part is reconstruction of an actionable view rather than retention of browser-local tab state.
- End Turn is omitted while `currentEncounter` exists and is independently rejected by `canEndTurn`.

## Release blocker

A mandatory encounter may never remain visible with only a locked Action-tab placeholder. It must expose a working canonical start command or a server-derived reason that the start is currently blocked.

## Implemented repair

The release blocker is closed in the working tree:

- `START_TILE_ENCOUNTER` carries `seatId`, the projected `encounterId`, and the current `resolutionId`.
- The server validates active seat, active phase, current encounter identity, current resolution revision, resolution owner, and `card_reveal` timing.
- The server alone derives whether the canonical next action is `CHECK_REQUESTED` or `COMBAT_REQUESTED`, along with tested stat and difficulty.
- A valid start moves `card_reveal` to `battle_setup`; it does not roll dice or resolve the encounter.
- A repeated start is rejected as already started. Stale IDs and wrong owners are rejected without mutating the encounter.
- Recurring Challenge art-card IDs are permitted to differ from their executable Challenge ID; the resolution revision remains the replay boundary.
- Disabled locally selected tabs no longer mask the enabled Encounter/Battle surface in production.
- Each prototype receives the exact same typed start command from `PhoneActionViewModel`.

## Verified transition

```text
Before click
phase = action
currentEncounter.id = suture-storm
activeResolution.id = qa-action:resolution:suture-storm
activeResolution.stage = card_reveal

START_TILE_ENCOUNTER
seatId = seat-1
encounterId = suture-storm
resolutionId = qa-action:resolution:suture-storm

After server acceptance
phase = action
currentEncounter.id = suture-storm
activeResolution.id = qa-action:resolution:suture-storm
activeResolution.stage = battle_setup
roll = absent
```

The browser archive contains matching before/after pairs for Hazard, recurring Challenge, and Event in all three layouts. Single-player was used for the visual run; the server guard and projection path are shared by co-op and Rivalry, with owner-private choices remaining phone-only.
