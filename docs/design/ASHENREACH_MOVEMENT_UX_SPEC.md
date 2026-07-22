# Movement UX specification

## Phone flow

`ROLL → CHOOSE → CONFIRM → MOVING`

- Roll: current tile, one instruction, one button.
- Choose: compact result, legal route count, Option A tactical destination list.
- Selected: gold industrial frame, danger/reward/mission markers, collapsed details, sticky confirmation containing destination name.
- Moving: disable resubmission and show origin → destination.

## TV journey

- Keep full board visible; dim unrelated paths.
- Lift active marker 200–350 ms.
- Traverse exact planner segments at 300–500 ms, cross-ring at 450–700 ms.
- Mark travelled vs remaining route.
- Arrival pulse 300–500 ms; then hand off to the canonical tile-arrival pipeline.

## Edge cases

Reconnect renders the authoritative segment or settled destination without replaying completed effects. Forced movement is labelled. Long names wrap without changing the sticky action height.
