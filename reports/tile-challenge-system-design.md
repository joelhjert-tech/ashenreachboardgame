# Persistent Board-Tile Challenge System

## System distinction

Ashen Reach now treats recurring environmental tests as `tileChallenge` records attached to sectors. Threats remain encounter-deck cards: enemies can be defeated, removed, and awarded as trophies under existing rules. Tile challenges are never placed in trophy piles or inventory and are not removed after success or failure.

Player-facing terminology:

| Authored type | Player label | Persistent | Trophy |
| --- | --- | --- | --- |
| Enemy | Threat | Usually no | Sometimes |
| `hazard` | Hazard Challenge | Yes | Never |
| `anomaly` | Anomaly Challenge | Yes | Never |

## Authored schema

Each challenge declares a stable ID, owning sector, `hazard` or `anomaly` type, test stat, difficulty, narrow trigger, authored order, success/failure effects, recurring flag, tags, lore, and art-card ID. The initial supported runtime trigger is `onArrival`; other enumerated triggers are schema-ready but not activated automatically.

Sector attachment validates that the sector exists and that authored order is unique within a sector.

## Authoritative lifecycle

After successful movement, arrival enters the existing sector phase. Before threat exploration, the server selects the first unresolved `onArrival` challenge for that visit and creates `pendingTileChallenge`. It contains a unique resolution ID, challenge and sector IDs, acting seat, type, stat, difficulty, source tags, effects, order, total count, rolled state, and test-scoped modifier sources.

The existing hazard check flow performs the roll and failure-reaction handling. After the outcome is applied and acknowledged, the challenge ID is recorded only in visit-scoped `tileChallengeProgress`; the challenge remains attached to the sector. The next authored challenge then opens, or normal threat exploration continues. A later successful arrival clears visit progress and makes the recurring challenge eligible again.

## Choir Lantern

Choir Lantern is eligible only when the exact pending record is an unrolled `tileChallenge` with `challengeType: anomaly` and `testStat: signal`. The request binds the owning seat, exact item instance, and pending challenge ID. A valid activation spends one exact-instance charge atomically and adds `Choir Lantern +2` to that test only. The base/resting Signal stat is unchanged, duplicate Lanterns cannot stack on the same test, and reconnect persistence comes from serialized pending-test and owned-instance state.

## Presentation and authority

TV receives public challenge summaries and pending test identity, never private inventory or remaining charges. Phone receives the same public challenge plus the owning seat's pending resolution ID for an eligible server request. Selected-sector context labels the records as recurring and separates them from threats. The existing check display supplies public stat, difficulty, modifier, roll, total, and result.

## Deliberate boundaries

- No general Signal check is an anomaly test.
- No Signal hazard becomes an anomaly without authored `challengeType: anomaly`.
- Threat trophies, enemy removal, movement rules, reaction windows, and mission progress are unchanged.
- Success does not suppress or remove a recurring challenge.
- Temporary challenge suppression and non-arrival triggers remain future explicit systems.
