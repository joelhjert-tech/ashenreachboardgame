# P2 Movement Comprehension Report

## Outcome

Movement now reads as one server-owned sequence across phone and TV: result, destinations, preview, confirmation, journey, arrival, and next required action. Exact-distance rules, topology, command handling, save/replay formats, and encounter authority were not changed.

## Previous architecture

- `movementRolls` and the canonical movement planner owned roll storage, exact-distance destination generation, graph routes, gates, bridges, cross-ring rules, and command validation.
- The phone rendered the authoritative planner through the production tactical destination list.
- The TV cached the accepted projected route before movement and rendered a map token plus focused journey.
- Preview was server-validated, but the P1 submission shell mistakenly treated the preview intent as final submission and could disable Confirm permanently.
- Phone and TV had no shared short marker for locating a destination quickly.
- Two presentation clocks disagreed: a 360–900 ms map-token animation and a 550/1,050/1,450/900 ms focused journey.

## Final presentation architecture

### Authority and payload

- The existing movement planner remains the only legality and route source.
- The server sorts projected destinations by public sector name and stable sector ID, then assigns A–Z/AA markers only to selectable destinations.
- Phone and TV consume the same `markerLabel` field. Clients do not calculate or renumber destinations.
- Void Key alternatives remain server-validated and may be previewed without presenting the route as generally unlocked.
- Visible route fallback text uses public labels such as `Route step 2`; raw topology IDs are not rendered.

### Phone

- Header copy states `Move N sectors`; raw roll is included only when it differs from final distance.
- Destination count excludes genuinely blocked entries while retaining server-offered keyed alternatives.
- Each selectable card shows the same letter used on the TV, sector name, exact distance, public danger/reward/mission signals, and collapsed details.
- Preview is explicitly non-committing. Confirm remains enabled after preview; only `MOVE_REQUESTED` starts the immediate P1 submission lock.
- Existing one-preview/one-confirm semantics remain unchanged.
- Reconnect before submission restores the same authoritative destination ordering and marker assignment. Reconnect after acceptance restores the final authoritative state and does not reopen the move.

### TV

- Legal destinations receive compact text markers; selected and special markers add border/shape treatment rather than relying on color.
- The header identifies the active player and final movement distance without a fake modifier row.
- The selected route uses exact projected route sectors. Unselected routes remain visually quiet to avoid a route web.
- Journey copy no longer falls back to raw sector IDs.
- Movement presentation owns the live-status header and suppresses battle/shop focus until the token settles, preventing early encounter framing.
- The board remains fixed and map-first; no camera rotation, zoom, or client route calculation was added.

## P0/P1 compatibility

- P0 remains the source for actor, required action, waiting copy, and tab routing.
- P1 remains the source for one primary action, immediate commit locking, stale-action recovery, and public-safe waiting states.
- The P2 correction only distinguishes a non-committing preview intent from a committing move intent.

## Reconnect behavior by stage

| Stage | Restoration |
|---|---|
| Result / destination selection | Same roll, exact distance, public destinations, ordering, route payload, and marker labels. |
| Preview before acceptance | Server preview remains available to the TV while connected; reconnect safely restores the selectable planner and stable markers rather than inventing a committed move. |
| Submission / after acceptance | Destination controls do not reopen. Current stable destination, arrival, challenge, or encounter projection wins. |
| Local journey animation | Reconnect favors authoritative final state; it never resubmits movement or retriggers arrival. |
| Arrival / encounter handoff | Next P0 action is restored once; movement is not replayed as gameplay. |

## Privacy and regression protection

- Marker labels disclose no hidden state.
- Destination copy uses only already-public tags, warnings, occupants, shop availability, mission relevance, and visible threats.
- Hidden encounter contents and Rivalry information are not added to the planner.
- Server validation still rejects unavailable destinations, stale movement revisions, and duplicate submissions.
- Exact-distance route tests and all canonical topology data are unchanged.
- Save version and replay format are unchanged.

## Four-seat critique

### New player

The move distance is the primary heading, and the same A/B marker appears on phone and TV. The selected route and arrival are now distinct. Corrective finding: the TV initially announced the following challenge too early; movement now retains header ownership until arrival.

### Optimizer

All server-legal destinations remain available with public risk/reward/mission signals and expandable route details. Unselected routes are not drawn at equal visual strength, but no legal information is removed from the phone.

### Family/casual player

The 520 ms edge pace is readable without the previous one-second-per-step drag. Phone targets exceed 44 px and sticky confirmation remains visible at 360×800. Letter markers reduce reliance on dense board reading.

### Rules lawyer

Markers are assigned after authoritative exact-distance planning; selected lines use the projected route; keyed and cross-ring routes retain server requirements. Reconnect and animation cancellation cannot execute movement or arrival effects.

## QA evidence

- 56 screenshots across 390×844, 360×800, 1920×1080, and 1366×768.
- Four 1920×1080 recordings: short, medium, long, and special connection.
- Zero horizontal overflow and zero browser errors.
- Screenshot index: `docs/qa/P2_MOVEMENT_SCREENSHOT_INDEX.md`.
- Measurements: `docs/qa/P2_MOVEMENT_MEASUREMENTS.md`.

## Concrete remaining risks

- The server does not persist an intermediate animation step because movement resolves atomically; reconnect therefore restores the stable authoritative destination/next action rather than attempting to resume decorative interpolation.
- Route videos include browser-page startup and teardown around the focused movement; scripted timing tokens, screenshots, and component tests provide the precise beat measurements.

## Verification

- Content validation: PASS (18 operatives, 71 Gear, 109 Threats, 36 Missions, 20 Anomalies, 30 Artifacts, 24 Followers, 24 Scars, 16 Escalations, and 30 Afflictions).
- TypeScript typecheck: PASS.
- Focused movement presentation tests: PASS (36/36).
- Movement/server/reconnect and phone submission tests: PASS (including deterministic shared markers and preview-to-confirm regression coverage).
- Engine and rules suites: PASS (763/763).
- Integration suite: PASS (345/345).
- Client suite: PASS (395/395).
- Asset audit: PASS (435/435).
- Production build: PASS (550 modules transformed).
- Browser QA: PASS (56 screenshots, four recordings, zero overflow findings, zero browser-console errors).
- `git diff --check`: PASS; line-ending notices only.
- `git diff --cached --check`: PASS; nothing staged.
- Aggregate `npm.cmd run test`: exceeded the 10-minute command window without reporting an assertion failure. Every constituent suite was run independently and passed with the exact results above.
- Ports 5173 and 8080 were confirmed closed after QA.
