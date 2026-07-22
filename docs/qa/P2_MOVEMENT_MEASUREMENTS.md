# P2 Movement Measurements

## Runtime timing comparison

| Beat | Before | After | Purpose |
|---|---:|---:|---|
| Initial operative emphasis | 550 ms | 300 ms | Makes acceptance visible without delaying the first step. |
| Normal route segment | 1,050 ms | 520 ms | Keeps each authoritative edge readable while avoiding long-route drag. |
| Cross-ring segment | 1,450 ms | 680 ms | Distinguishes a ring transition without implying a different rule. |
| Arrival hold | 900 ms | 760 ms | Preserves a clear destination settle before the next presentation. |
| Reduced-motion route settle | 120 ms per step | 90 ms to final route position + 90 ms arrival + 360 ms hold | Avoids replaying every decorative step while retaining destination identity. |

The underlying map token now uses `300 + (520 × exact route distance)` milliseconds, capped at 2,600 ms. The focused journey reaches the destination on the same timing boundary, then retains the 760 ms arrival explanation.

## Calculated normal-motion totals

| Route | Exact distance | Presentation total | Notes |
|---|---:|---:|---|
| Short | 1 | 1,580 ms | 300 ms departure + 520 ms authoritative edge/settle + 760 ms arrival. |
| Medium | 2 | 2,100 ms | Two visible route-edge beats plus arrival. |
| Long | 4 | 3,140 ms | Four visible route-edge beats; remains bounded and substantially shorter than the previous 5,050 ms sequence. |
| Cross-ring, distance 1 | 1 | 1,740 ms | 300 ms departure + 680 ms cross-ring edge + 760 ms arrival. |
| Reduced motion | any | 540 ms | Jumps to the authoritative final route position and preserves one short arrival summary. |

## Browser measurements

- Phone viewports: 390×844 and 360×800.
- TV viewports: 1920×1080 and 1366×768.
- Screenshots inspected: 56.
- Recorded journeys: short, medium, long, and special connection.
- Horizontal overflow: 0 px in every capture.
- Browser console/page errors: 0.
- Camera behavior: board orientation and framing remain fixed; route and token emphasis carry the movement.
- Route rendering: exact projected sector order; no inferred diagonals or skipped route nodes.

The raw browser measurements are stored in `docs/qa/p2-movement/capture-metrics.json`.

## Corrective review pass

The first rendered journey exposed a presentation race: the global live-status header announced the destination challenge while the route animation was still active. Movement presentation now temporarily owns that public header and suppresses battle/shop framing until the token has settled. The next server-required action is shown after the journey closes.
