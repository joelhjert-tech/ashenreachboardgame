# TV animation and movement QA

## Shared timing tokens

| Stage | Duration |
|---|---:|
| Encounter reveal | 460 ms |
| Card flip | 840 ms |
| Encounter settle | 420 ms |
| Participant entrance | 620 ms |
| Dice roll | 1,200 ms |
| Modifier reveal | 340 ms |
| Total settle | 520 ms |
| Result emphasis | 900 ms |
| Journey start | 380 ms |
| Normal route segment | 620 ms |
| Cross-ring segment | 850 ms |
| Arrival settle | 650 ms |

These values are presentation tokens. They never control reducer progress or dispatch actions. `prefers-reduced-motion` retains the complete state and uses a short 120 ms step/fade treatment.

## Movement

The TV uses only `movementJourney.destination.route` from the server projection. Each projected sector becomes the visible current step; completed and remaining route segments stay distinguishable. Ring tier is read only to select the longer cross-ring presentation duration, not to reconstruct or authorize the path.

The reviewed QA route was:

`Scorched Road -> Red Lantern Trenches -> Customs Gate`

The map remained visible, the active token advanced in order, and arrival framing did not masquerade as combat.

## Shared encounter chamber

Enemy, hazard, anomaly, and persistent tile-challenge resolutions now share the core reveal/comparison/result chamber. Their mechanical labels remain explicit. Enemy battles retain enemy dice and Trophy semantics; checks retain their own difficulty and consequence semantics.

The TV reads server-projected `effectiveStats` for the acting operative, falling back to base stats only for older compatible payloads. Winner, totals, and tie-success wording remain explicit, and duplicate Threat outcome rows stay absent.

## Six-player presentation

The startup lobby applies a compact layout at five or six joined seats. At 1366x768 all six names remain in-frame, the active/host context remains legible, and no horizontal overflow was found. At 1920x1080 the normal larger composition remains available.

## Screenshot review

- Corrected general host states: `reports/host-ui-qa/live-play-after/`
- Live-play defect states: `reports/ui/live-play-defects/after/`

Visual review found two first-pass defects and prompted a correction:

1. Six lobby rows exceeded the 1366px frame; the crowded layout now compacts spacing and typography.
2. Phone guidance narrowed the battle shell; global guidance is now suppressed while the dedicated battle shell owns its instruction and sticky action.

QA reported no viewport overflow or browser console errors. Reduced-motion captures retained all essential totals and outcomes.

## Critique seats

- New player: route order, tested stat, totals, and outcome are immediately visible.
- Optimizer: visual steps cannot cause arrivals or rewards, and reconnect does not rerun completed movement.
- Family/casual: durations are readable from across the room without adding long blocking pauses.
- Rules lawyer: projected route and authoritative totals are displayed verbatim; presentation never decides state.
