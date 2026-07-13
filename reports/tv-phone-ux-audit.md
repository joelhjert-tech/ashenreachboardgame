# Ashenreach TV / Phone UX Audit

Date: 2026-06-30

Doctrine: the TV shows the battle; the phone gives orders. The TV should be public, readable, and dramatic. The phone should be private, prompt-first, and fast.

## Phase Audit

| Phase | TV currently shows | Phone currently shows | Player action | Confusing drift | Public/private split | Recommended change |
| --- | --- | --- | --- | --- | --- | --- |
| Host setup | Scenario, mode, player count, create buttons | Not joined yet | Host creates room | Host setup can read like a generic dashboard | TV public setup only | Keep setup on TV; phrase banner as host selecting Co-op/Rivalry |
| Lobby | Room code, QR, player list, ready/start gating | Join/name/operative/ready flow | Players join and ready | Waiting reason can be too implicit | TV room code and ready state, phone identity and character choice | Keep QR large in lobby, keep start locked, show clear waiting text |
| Character select | Joined seats and ready state | Operative selection and ready | Pick operative, press Ready | TV should not require players to read full operative detail | TV public roster, phone detailed choice | Keep operative detail on phone; TV shows roster status |
| Turn start | Active player, phase, board, scenario state | Personal sheet and action tabs | See turn ownership | Phone can feel like a small dashboard instead of a controller | TV public turn owner, phone private command prompt | Show phone CurrentPrompt above tabs |
| Movement roll / destination | Board route glow and legal markers when planner payload exists | Movement planner destination list | Choose legal destination | Without a prompt, players may hunt through tabs | TV public reachable spaces, phone exact destination choices | CurrentPrompt: rolled value, choose destination, route count |
| Tile event | Encounter context and resolution overlay | Event/check action controls | Resolve check or choice | Event choice should feel like a required action | TV public stakes, phone player choice and confirmation | CurrentPrompt: resolve event; TV waiting on active player |
| Battle / engagement | HostBattleOverlay with current duel totals | Battle controls and result continue | Roll/resolve/continue | Permanent stats can distract during resolution | TV public duel result only, phone controls and private item choices | Keep duel-only overlay; CurrentPrompt points to battle |
| Shop | Public shop overlay and services summary | Shop services, revealed stock, purchase buttons | Buy/sell/use service | TV should not duplicate all inventory decisions | TV shop availability, phone purchases | CurrentPrompt: choose shop action; TV waiting on shopper |
| Quest / objective | Public scenario progress and pressure | Player/contract action controls | Advance objective if available | Rivalry/private objective payload is not first-class yet | TV public objective, phone private objectives when payload exists | Document missing private payload; do not invent mechanics |
| Turn end | Turn transition banner | End-turn action or standby state | Confirm end turn or wait | Inactive phones need clear standby language | TV public transition, phone private standby | CurrentPrompt: confirm end turn or waiting for active player |
| Game over | Winner and scenario outcome | Session complete | Review final result | None critical | Public outcome on TV, personal wrap on phone | Keep phone completion prompt simple |

## Changes Applied In This Pass

- Added a phone CurrentPrompt card above turn action content so the required action is primary.
- Added prompt states for waiting, movement, event, battle, shop, objective, resolution, and end turn.
- Refined host state banner copy to say what the table is waiting on.
- Preserved bottom tabs, board overlays, route glow, movement rules, reducer logic, and WebSocket behavior.

## Missing Payload Data / Future TODOs

- Rivalry private objective text should be a first-class private phone payload before building hidden-agenda UI.
- Public action-result history could use a compact typed payload so the TV can show "action chosen" and "result revealed" without parsing log text.
- Movement roll is currently server-authoritative; if a future phone roll button is added, it should write through the same movement roll lifecycle rather than a UI-only value.
- Shop buy/sell confirmations are available as button actions, but a richer "sending/resolving/result" handshake would need transient client intent status.
