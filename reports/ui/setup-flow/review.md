# Setup and Phone Flow Screenshot Review

Date: 2026-07-18

Viewport coverage:

- Phone: 390x844
- Host TV: 1920x1080

## Reviewed states

- `final/phone-scenario-selection-390x844.png`
- `final/tv-scenario-selection-1920x1080.png`
- `final/phone-character-selection-390x844.png`
- `final/phone-mission-selected-one-click-390x844.png`
- `final/battle/390x844-encounter.png`
- `final/battle/390x844-battle-setup.png`
- `final/battle/390x844-pending-enemy-roll.png`
- `final/battle/390x844-rolled-result.png`
- `final/battle/390x844-success.png`
- `final/battle/390x844-defeat.png`
- expanded battle details and Operative, Gear, and Battle Log contextual states

## Findings and corrective iteration

The first phone scenario screenshot showed only the dark top of the scenario image. The image used `height: 100%` inside an auto-height grid card, so its rendered box inherited the full card height and the artwork row clipped the wrong area. The scenario artwork now uses the canonical asset path as a centered, cover-sized artwork layer in a bounded 8.75rem frame. The card was also shortened from 25rem to 22rem to make the next setup controls easier to reach.

The first TV screenshot faintly exposed the room-code lobby panel beneath the scenario window. The full-screen scenario surface now uses an opaque layered background, keeping the current setup decision visually dominant.

The character screenshot confirms a single `Select operative` heading, one full-width card column, no duplicate `Choose Character` kicker, and no stat block in the selection card.

The mission screenshot was captured after one `Select Mission` click and shows the authoritative selected mission plus an enabled `Ready` control. The picker remains open while the request is pending, preventing the previous false impression that an ignored tap had closed it.

The battle screenshots confirm that the focused phone battle shell is active for encounter, roll, enemy-roll, success, and defeat states. Both combatants, totals, one primary action, contextual navigation, and consolidated consequences remain visible without horizontal overflow.

No console errors or horizontal overflow were detected by the capture scripts.
