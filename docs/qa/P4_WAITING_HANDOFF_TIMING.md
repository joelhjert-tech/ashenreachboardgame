# P4 Transition Timing

## Measured and configured behavior

| Transition | Before P4 | Final behavior | Notes |
|---|---:|---:|---|
| Result becomes visible | Same authoritative result patch | Same authoritative result patch | No client-authored completion. |
| Result to Continue available | 0 ms | 0 ms | Continue is server-described in the same patch; no decorative delay blocks input. |
| Continue submission feedback | Next React render | Next React render (normally under one 60 Hz frame) | Fieldset disables immediately and shows `CONTINUING`. |
| Continue to End Turn available | Server processing + WebSocket round trip | Unchanged | Only canonical advancement and `canEndTurn` can expose it. |
| End Turn submission feedback | Next React render | Next React render (normally under one 60 Hz frame) | Shows `FINISHING ACTIONS` or `ENDING TURN`. |
| Turn closing | Unspecified generic confirmation | Authoritative round trip | Phone remains locked until action identity changes. |
| Handoff announcement | None | 900 ms | TV-only, non-blocking, timer cleared on change/unmount. |
| Next required action available | Authoritative next patch | Authoritative next patch | Not delayed by handoff animation. |
| AI-turn announcement | Not implemented | Not implemented | No canonical AI-seat turn exists. |

## Reduced motion

The TV removes the 180 ms entrance animation under `prefers-reduced-motion: reduce`; it keeps the same names and 900 ms readable state. Phone information, command availability, and server timing are identical.

## Evidence

- 60 viewport captures recorded zero horizontal overflow.
- Four WebM recordings cover result/continue, result/end-turn, human handoff, and reduced-motion handoff.
- Browser console and page-error count: zero.
- The handoff does not cover or disable the next player’s authoritative controls.

The suggested timing bands were treated as evaluation guidance. The 900 ms handoff is within the suggested 500–1,000 ms range. Artificial result or next-action delays were rejected because they would slow gameplay without adding authority or information.
