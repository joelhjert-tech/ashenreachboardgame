# Salvage Resolution Browser QA Index

All captures use a real single-player room, authenticated phone, public TV projection, WebSocket updates, canonical reducers, and environment-gated server QA fixtures. The phone viewport is 390x844. TV verification covers 1920x1080, 1440x900, and 1280x720.

## Captures

| Screenshot | State | Result reviewed |
|---|---|---|
| `salvage-resolution/payment-required-390x844.png` | Required payment | Balance and exact cost visible; Pay is actionable |
| `salvage-resolution/payment-reconnect-390x844.png` | Reconnected payment | Same authoritative choice restored |
| `salvage-resolution/payment-resolved-390x844.png` | Paid | Exact deduction shown once; balance 3 -> 2 |
| `salvage-resolution/payment-optional-390x844.png` | Optional payment | Pay and Decline are both available |
| `salvage-resolution/payment-declined-390x844.png` | Declined | No deduction; decline result visible |
| `salvage-resolution/payment-insufficient-390x844.png` | Required payment at zero | No negative value and no debt |
| `salvage-resolution/battle-reward-390x844.png` | Enemy victory reward | `+1 Salvage` shown once; no stale payment row |
| `salvage-resolution/event-reward-390x844.png` | Anomaly reward | `+1 Salvage` shown once |
| `salvage-resolution/battle-reward-1920x1080.png` | TV battle reward | Public result visible |
| `salvage-resolution/battle-reward-1440x900.png` | TV battle reward | Layout contained |
| `salvage-resolution/battle-reward-1280x720.png` | TV battle reward | Layout contained |
| `salvage-resolution/event-reward-1920x1080.png` | TV event reward | Public result visible |
| `salvage-resolution/event-reward-1440x900.png` | TV event reward | Layout contained |
| `salvage-resolution/event-reward-1280x720.png` | TV event reward | Layout contained |

Machine-readable metadata is in `salvage-resolution/index.json`.

## Corrective screenshot pass

The first end-to-end pass found two defects that lower-level tests had not exposed:

1. Reconnecting while a payment was open left a delayed auto-continue callback able to submit through the decision and crash the server.
2. A completed payment appeared both as the active-resolution delta and recent event-log delta, then remained visible in the next battle reward.

The timer was made continuation-aware, payment events gained stable source identity, and projection now suppresses the duplicate/current and stale/mismatched rows. All affected screenshots were recaptured after the correction.

## Review findings

- Primary actions remain within the 390x844 viewport.
- No horizontal overflow at any requested viewport.
- Cost and current balance are visible together.
- Required, optional, declined, insufficient, and completed states are distinguishable.
- Phone and TV show the same public outcome.
- TV contains no private payment controls or decision IDs.
- No duplicate or stale Salvage results remain.
- Browser console and page-error collection returned zero errors.
