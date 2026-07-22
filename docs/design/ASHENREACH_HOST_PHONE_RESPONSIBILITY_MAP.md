# Host and phone responsibility map

| State | Server owns | Phone shows/controls | TV shows |
|---|---|---|---|
| lobby | seats, host authority, setup stage | private selection and confirmation | room code, public setup progress |
| movement | roll, legal graph routes, destination | roll/list/select/confirm | map, route, public journey |
| tile arrival | ordered mandatory/optional rules | exact required action | concise public resolution stack |
| assistance | request, seats, responses, base values | private selector/accept/decline | public-safe request and accepted helpers |
| battle/test | skill, dice, modifiers, result | owner timing actions | art, totals, outcome, public consequence |
| shop | stock, prices, transaction | private purchase/service controls | stock and public result |
| mission | ownership, options, completion/reward | private mission choice | public ownership/waiting only |
| Scar | offer, choice, uses, activation | owner choice/activation | public result after resolution |
| reconnect | authoritative pending state | restored correct tab/action | connection/restoration status |

## Invariants

- TV is never required for input.
- Phone never authors outcomes, routes, resources, dice, inventory objects, or turn order.
- Private options never enter the TV projection.
- Both surfaces share the same context and next-action vocabulary.
- Animation completion never dispatches gameplay.
