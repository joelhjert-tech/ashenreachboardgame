# Movement UI Option A — Production Review

## Decision

Option A, the Tactical Destination List, is now the production phone movement presentation. The temporary `movementUi` query switch and Option B runtime branch were removed. Movement legality, route planning, preview, roll, and confirmation continue to use the existing server-authoritative projection and intents.

## Final flow

- Roll required: compact movement header and one `ROLL MOVEMENT` action.
- Rolled: movement value, current sector, legal-route count, and tactical destination list.
- Selected: gold-framed destination, concise danger/reward/mission signals, collapsed route details, and `CONFIRM {DESTINATION}`.
- Confirmed: compact locked-route state while the server advances into arrival resolution.
- Active movement navigation: `OPERATIVE | INVENTORY | MORE`; `MORE` expands the existing global tabs without changing gameplay state.

## Screenshot review

Final captures are stored in `reports/ui/movement-phone/final/`:

- `01-roll-required-390x844.png`
- `02-four-routes-390x844.png`
- `03-selected-390x844.png`
- `04-details-expanded-390x844.png`
- `05-special-route-390x844.png`
- `06-selected-360x800.png`
- `06-selected-390x844.png`
- `06-selected-412x915.png`
- `06-selected-430x932.png`
- `07-confirmed-390x844.png`

## Corrections after visual review

1. The production shell initially missed the prototype's edge-to-edge scroll overrides. This left the sticky action/navigation dock above an empty bottom strip. The production movement class now owns those layout rules.
2. The shared phone header changed to a cramped four-column layout above 400 px, causing `Movement` to split at 412–430 px. The compact two-row phone header now remains active through 480 px.
3. The roll-required and travel-confirmed states repeated their messages in both the header and body. The body repetition was removed; the header carries the current state and the travel card carries the destination and route once.
4. Capture timing could precede tile-image decoding. Browser QA now waits for visible images to finish loading before each screenshot.

## Browser results

- No horizontal overflow at 360×800, 390×844, 412×915, or 430×932.
- Primary action remains inside the viewport.
- Action and contextual navigation occupy separate non-overlapping regions.
- No browser console or page errors were recorded.
- Long destination names wrap within the selected action and card.
- Route details remain collapsed by default.
