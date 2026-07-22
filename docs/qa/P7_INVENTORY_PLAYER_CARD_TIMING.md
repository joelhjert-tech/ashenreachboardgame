# P7 Inventory and Player-Card Timing

Measurements come from the final Playwright run on the local QA server. They measure fixture response and deliberate tab-opening latency, not gameplay animation duration.

| Measurement | Result |
|---|---:|
| Player Card open | 266 ms |
| Inventory open | 324 ms |
| Basic fixture response | 100 ms |
| Battle relevance fixture | 250 ms |
| Movement relevance fixture | 47 ms |
| Wounds/Scars fixture | 24 ms |
| Equipped fixture | 32 ms |
| Carried fixture | 57 ms |
| Consumable fixture | 24 ms |
| Charged fixture | 25 ms |
| Exhausted fixture | 248 ms |
| Wrong-timing fixture | 24 ms |
| Many-object fixture | 132 ms |
| Long-copy fixture | 61 ms |
| Reconnect fixture | 37 ms |

The capture harness intentionally waits 300 ms after a fixture response so the authoritative WebSocket projection settles before it deliberately leaves the required-action tab. This wait belongs only to QA capture sequencing; it was not added to production interaction logic.

Inventory command controls lock synchronously on click. Ownership, charge, equip, and result changes remain dependent on the next authoritative server projection. Reduced-motion mode introduces no gameplay delay.
