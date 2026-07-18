# Tile-Challenge Content Migration

## Safely migrated

| Challenge ID | Previous category | Target sector | Type | Test | Difficulty | Trigger | Previous removal | Migration |
| --- | --- | --- | --- | --- | ---: | --- | --- | --- |
| `rift-whispers-ashen-chapel` | `rift-whispers` hazard threat | `ashen-chapel` | Anomaly | Signal | 8 | On arrival | Removed from the local threat deck when drawn | Removed only from Ashen Chapel's threat list and attached there as a recurring tile challenge; original authored note/scar outcomes and art ID retained |

This migration is non-arbitrary: `rift-whispers` had exactly one canonical sector-deck placement, at Ashen Chapel, and already authored a Signal 8 environmental test with no enemy/trophy behavior.

## Not automatically migrated

- The other hazard threat cards remain Threats until their intended permanence and sector ownership are explicitly approved.
- The anomaly-card decks remain one-shot sector-text draw content. Their cards currently have resolution effects but no authored test stat or difficulty, so converting them would invent mechanics.
- `choir-static-burst` remains a threat hazard. It appears in multiple sector decks and therefore has no single approved owning tile.
- Unassigned anomaly art/content is not attached to sectors by inference.

## Placement decisions still needed

Future migrations must choose a single sector (or explicitly authored per-sector instances), define test stat/difficulty, confirm success/failure effects, and state authored order. Cards with legacy Heat effects require separate supported consequence approval before migration; this pass introduces no new Heat mechanic.

## Current implementation scope

One canonical recurring anomaly is sufficient to establish and test arrival ordering, persistence, revisit behavior, projections, and the narrow Choir Lantern pre-roll window without converting the entire encounter catalog.
