# Lobby UX specification

## Goal

Move a group from room join to ready play with no ambiguity about ownership, remaining setup, or the next decision.

## TV

- Show room code and QR as the dominant join affordance until the first phone connects.
- After connection, compress QR and expose a six-seat status rail: player name, operative if confirmed, ready/setup stage, connection state.
- Show one lobby stage at a time: mode, scenario, operatives, missions, ready.
- Scenario browsing may use a cinematic carousel; selections remain phone-owned and TV-public only after confirmation.
- Keep the supplied lobby art visible under smoked translucent panels.

## Phone

- Use a single-column selection list.
- Separate inspect from select visually; the primary button always contains the selected name.
- Back returns to the prior setup stage, never the join screen while room membership remains valid.
- Hide host controls from all but the canonical Host Phone owner.

## Motion and accessibility

- Stage transition 220 ms; selected card emphasis 140 ms; game start 520 ms.
- Reduced motion uses crossfade only.
- Minimum 44 px targets and persistent safe-area padding.

## Acceptance

- Every seat displays a unique ready/setup state.
- No private mission/operative options appear on TV.
- Host ownership survives reconnect without silently transferring.
