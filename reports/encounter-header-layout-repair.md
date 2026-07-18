# Encounter Header Layout Repair

The old Battle/Test context panel repeated player, operative, location, and region above information already present beside the operative portrait. It also wrapped at 1366×768.

The shared host chamber now uses one fixed-height line:

`CATEGORY | TESTED SKILL + DIFFICULTY | RESOLUTION STAGE`

Player display name remains in the operative participant area. The old location/name panel and its empty space are gone. Battle, Hazard, Anomaly, and recurring tile challenges derive the same shell from authoritative encounter/resolution data.

QA: `reports/live-play-ui-repair-qa/encounter-header-battle-1920x1080.png` and `encounter-header-battle-1366x768.png`. Both passed overflow and console checks.
