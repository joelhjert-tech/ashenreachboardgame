# P9 Cross-System Transition Map

This map records the continuous experience observed across the fresh P5, P8, P4, P6, and P7 campaigns. P2/P3 partial runs are used only where explicitly noted.

## Setup transitions

| Previous → new state | Authoritative trigger | Active phone | Host TV | Waiting phone | Focus / announcement | Result |
|---|---|---|---|---|---|---|
| Join Room → operative selection | Server accepts room/name and creates seat | Join surface becomes operative list; no tabs | Seat becomes occupied | Not applicable | Setup focus remains on document rather than first operative | **P2:** focus gap |
| Operative → mission selection | Server accepts operative ID | Character lock stays visible; mission cards appear; Select Mission is primary | Public setup progress only | Public waiting | No duplicate live message | Pass; page is long but primary first-card action is visible |
| Mission → ready | Server accepts mission ID | Ready becomes primary | Player slot gains setup progress | Waiting for setup | State copy is clear | Pass |
| Ready → Start available | All configured active seats ready | Host Phone alone receives Start Game | TV says Ready to Begin and shows 2/2 | Other phone waits | Start blocker/availability announced | Pass |
| Start → first required action | Server starts game and publishes phase/actor | Auto-routes to required action | Lobby becomes command board | Inactive player gets actor/action wait | One authoritative revision | Pass; no decorative block |

## Turn, movement, encounter, and battle

| Previous → new state | Authoritative trigger | Phone tab before → after | Host before → after | Waiting phone | Primary action | Focus / timing | Result |
|---|---|---|---|---|---|---|---|
| Turn ready → movement roll | Required-action projection changes | Action → Move | Board remains dominant | Names actor and movement | Roll Movement | Focus once | Pass |
| Roll result → destinations | Server publishes movement value/routes | Move → Move | Matching letter markers and route context appear | Waits for actor to choose | Select destination | No duplicate command | Pass |
| Destination → confirmation | Owner selects legal projected ID | Move → Move | Selected route emphasized | Public wait only | Confirm named destination | Immediate local selection only; no gameplay mutation | Pass |
| Confirmation → journey | Server accepts move and updates authoritative location | Move locked | TV journey begins | Movement status | None while moving | 300 ms start, 520/680 ms edges | Pass until arrival boundary |
| Journey → arrival | Presentation reaches final route step | Move resolving | Expected destination arrival hold | Waiting | None | Configured 760 ms was not observed in two current P2 runs | **P1:** encounter replaces arrival presentation |
| Arrival → encounter | Server projection already contains tile encounter | Battle/Action as required | TV switched directly to Hazard result in current P2 screenshot | Waits for encounter | Encounter action | Abrupt | Same authority, weak continuity |
| Encounter → battle ready | Server battle setup | Battle | Focused participant comparison | Public-safe wait | Ask for Help / Roll | Stage focus once | Pass |
| Battle ready → result | Server resolves player/enemy dice and modifiers | Battle locked → result | Same totals/outcome publicly | Waits for review | Continue | Result persists | Pass |
| Result → Continue | Result patch exposes continuation | Battle | Result remains visible | Public result/wait | Continue | 0 ms decorative delay | Pass |

## Consequence, End Turn, and handoff

| Previous → new state | Authoritative trigger | Active phone | Host | Waiting phone | Pacing | Result |
|---|---|---|---|---|---|---|
| Result → private consequence/reward | Canonical effect opens owner prompt | Owner sees choices | Says awaiting operative decision only | Says actor is resolving private choice | Immediate, private | Pass; no option leakage |
| Private choice → public result | Owner submits legal choice | Choice locks, result appears | Public consequence/reward only | Public-safe result | Authoritative round trip | Pass |
| Continue → End Turn | Cleanup completes and `canEndTurn` becomes true | Action tab shows End Turn above fold | Board/public context returns | Waits for actor | No decorative delay | Pass |
| End Turn → handoff | Server accepts end turn and changes actor | Submitting lock then next owner action | 900 ms handoff | Next player becomes active | 900 ms, non-blocking | Pass |
| Handoff → next required action | Next authoritative patch | Correct next tab/action | Board and next context visible | Previous actor waits | Available before handoff animation ends | Pass |

## Shop and inventory

| Previous → new state | Authoritative trigger | Active phone | Host | Waiting phone | Result |
|---|---|---|---|---|---|---|
| Board/action → Shop | Server exposes shop availability | Auto-routes to Shop | Focused public shop | Names buyer/browsing | Pass |
| Shop → category/offer | Owner browses projected public offers | Category then focused offer | Same category/focused art, no private Salvage | Public browsing only | Pass |
| Offer → purchase result | Server validates price/stock/owner | Buy locks; result and updated Salvage | Public transfer/result | Public transaction only | Pass |
| Offer browsing → Leave Shop | Owner remains in Shop | Sticky Leave Shop overlaps Previous/Next at 390/360 | Public shop remains clear | Public browsing | **P1:** responsive control collision |
| Shop → Player Card/Inventory | Owner opens inspection | Inspection tab opens without changing gameplay | TV keeps public shop/board state | Other phones unaffected | Pass |
| Inventory → Return to Action | Owner selects Return to Action or required state retakes priority | Correct required tab restored | Public state unchanged | Public wait | Pass |
| Inventory action → updated inventory | Server accepts typed item/ability action | Result/usage changes once | Public-safe summary only where authored | No private details | Pass |

## Reconnect and stale recovery

| Previous → new state | Authoritative trigger | Phone | Host/waiting | Result |
|---|---|---|---|---|---|
| Setup selection → reload | Stored controller session reconnects | Same setup stage restored | Public setup unchanged | Pass in P5 |
| Battle result → reload | Current patch restored | Result marked/restored without replay | Public result stable | Pass in P4/P3 tests |
| Shop browsing → reload | Stored session reconnects | Same shop state restored | Public shop stable | Pass in P6 |
| Inventory state → reload | Stored session reconnects | Same owned state/relevance restored | No private inventory on TV | Pass in P7 |
| Stale Continue/End Turn → current state | Server rejects stale action and reprojects | Current legal action restored; no duplicate effect | Public state unchanged | Pass in P4 |
| P8 `reconnecting-restored` screenshot → Join Room | URL still contained `resetAuth=1` | Auth deliberately cleared | TV room remained | **Rejected as product finding:** capture-script misuse |

## Required-action continuity matrix

| Category | Actor/tab | Primary action | Waiting text | Host text | Reconnect / replay | Finding |
|---|---|---|---|---|---|---|
| Setup | Host/setup | Select/Confirm/Ready/Start | Actor/setup stage | Public blockers/progress | Restores selection | Setup focus gap only |
| Dice | Active/Move or Battle | Roll | Waiting for actor to roll | Public roll state | No reroll on restore | Pass |
| Movement | Active/Move | Select/Confirm destination | Waiting for route choice/movement | Markers, route, actor | Completed move does not resubmit | Arrival presentation issue |
| Event | Owner/Action or Battle | Authored choice/test | Public private-decision wording | Public category/context | Prompt identity preserved | Pass |
| Battle | Owner/Battle | Help/Roll/Reroll/Continue | Public stage | Public participants/math | Dice/result do not replay | Pass |
| Reroll | Owner/Battle | Reroll or decline | Public reaction wait | Public-safe reaction state | Usage protected | Pass by suite/current phone evidence |
| Consequence | Owner/Battle/Action | Resolve choice/prevention | Public private-decision wait | Public-safe consequence | One effect | Pass |
| Reward | Owner/Battle/Action | Select/Continue | Public private-reward wait | Public result only | One reward | Pass |
| Continue | Result owner/current tab | Continue | Waiting for review | Result remains | Stale action rejected | Pass |
| Shop | Active/Shop | Buy/Sell/Service/Leave | Buyer/action summary | Public shop | Transaction once | Control overlap |
| Inventory action | Owner/Inventory | Use/activate or Return | Other players keep public game wait | Public-safe summary | Usage once | Pass |
| End Turn | Active/Action | End Turn | Waiting for actor | Public phase | Stale action rejected | Pass |

## Information continuity summary

- No authoritative calculation or legal action disagreed between phone and TV.
- Private choices remained owner-only.
- Results persisted until Continue.
- Automatic tab routing consistently restored the required surface.
- Two continuity weaknesses remain: movement arrival disappears prematurely, and waiting context is repeated rather than lost.
