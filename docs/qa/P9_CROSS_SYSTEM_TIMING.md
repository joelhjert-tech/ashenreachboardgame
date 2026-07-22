# P9 Cross-System Timing

## Measurement policy

Server request timings are measured from fixture/action submission to authoritative acceptance. Presentation timing uses the current configured constants plus video/screenshot observation. Fixture latency is not claimed as LAN latency.

| Transition | Evidence | Duration / range | Classification |
|---|---|---:|---|
| Join submission to operative selection | P5 browser measurement | 189 ms | Appropriate |
| Lobby Start to board/first action | P8 real start path; 10 s guard not approached | Visually under 1 s; not separately instrumented | Appropriate, measurement gap |
| Board visible to first required action | Same authoritative start projection | Same render cycle | Appropriate |
| Dice result to destinations | P2/P8 server projection | No decorative wait; next authoritative patch | Appropriate |
| Destination confirmation to movement | P2 configured start emphasis | 300 ms | Appropriate |
| Normal movement edge | P2 configured segment | 520 ms/edge | Appropriate |
| Cross-ring movement edge | P2 configured segment | 680 ms | Appropriate |
| Arrival hold | Configured 760 ms | Not observed in two current P2 runs before encounter replacement | Inconsistent / likely skipped |
| Reduced-motion movement | P2 configured path | 540 ms total | Appropriate |
| Arrival to encounter | Current P2 run | Encounter visible before `.is-arrived` observation | Too fast to understand |
| Encounter to battle ready | P8 cross-feature recording | Same authoritative stage sequence; no blocking flourish | Appropriate |
| Roll submission to result | Authoritative round trip; no client delay | Not isolated in current script | Appropriate, measurement gap |
| Result to Continue | P4 | 0 ms beyond authoritative result patch | Appropriate |
| Continue submission lock | P4 | Next React render, normally <16.7 ms | Appropriate |
| Continue to End Turn | Server round trip | No decorative delay | Appropriate |
| End Turn submission lock | P4 | Next React render, normally <16.7 ms | Appropriate |
| End Turn to next actor | P4 host handoff | 900 ms visual handoff; next phone not blocked | Appropriate |
| Shop entry/category acceptance | P6 | 15 ms fixture acceptance | Appropriate |
| Equipment offer acceptance | P6 | 33 ms | Appropriate |
| Buy submission to result | P6 real action | 277 ms | Appropriate |
| Player card open | P7 | 267 ms | Appropriate |
| Inventory open | P7 | 370 ms | Appropriate |
| Inventory result update | P7 | 48 ms fixture acceptance | Appropriate |
| Reconnect to stable inventory state | P7 | 53 ms fixture acceptance plus reload/render | Appropriate |
| Reconnect result/end-turn restoration | P4 | No replay; authoritative patch on reconnect | Appropriate |

## Findings

- No gameplay control waits for decorative motion.
- The 900 ms handoff is readable and non-blocking.
- Shop and inventory server acceptance is consistently below 400 ms in the local campaign.
- The only evidence-backed pacing defect is the missing movement arrival beat. The following encounter can visually replace travel before the configured 760 ms arrival presentation becomes observable.
- The P3 harness’s `document.images.every(image.complete)` wait is not a user-facing delay. It is stale audit logic because intentional broken-image fallbacks can keep a source image incomplete.

## Recommendations for the next slice

Preserve existing dice, movement-edge, reduced-motion, and handoff durations. Repair presentation ownership so the already-configured arrival hold survives the immediate encounter projection. Instrument start-to-board and roll-to-result explicitly in the next campaign rather than changing their timings without evidence.
