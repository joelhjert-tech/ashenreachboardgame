# P14 Progression and Endgame Timing

All timing is presentation-only. Server state changes first; animation cannot
complete, delay, or submit gameplay.

| Moment | Presentation | Nominal duration | Reconnect behavior |
|---|---|---:|---|
| Progress change | Compact map-preserving result strip | 4.2 s maximum | settled total only |
| Pressure change | Compact danger result strip | 4.2 s maximum | settled total only |
| Final-stage entry | Centered board-preserving announcement | 3.6 s, objective remains compact | compact objective only |
| Result entry | Bounded reveal of the structured result | 1.8 s | restored result, no replay |
| Post-game action | Present with result | immediate | remains available |

The browser harness used 420 ms observation points for ordinary projection
changes, 1.1 s for final-stage emphasis, and 1.2 s for results. These are QA
observation timings, not authoritative delays.

Reduced motion removes transforms and pulses. It retains all totals, text,
warnings, result fields, and actions.
