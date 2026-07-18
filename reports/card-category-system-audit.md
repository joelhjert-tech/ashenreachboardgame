# Card Category System Audit

## Executive boundary

Enemies fight; Hazards test survival; Anomalies distort rules and information; Escalations worsen the shared world; authored Events use an immediate tested-event lifecycle; persistent Tile Challenges remain on the board until their own removal rule resolves. Player-owned and scenario-controlled cards stay outside ordinary Threat draws.

## Canonical inventory

| Category | Count | Primary role | Source / pool | Normal play | Runtime | Phone | TV |
|---|---:|---|---|---|---|---|---|
| Threat (Enemy/Hazard/Event/Encounter/Asset) | 109 | Immediate encounter | Sector Threat decks / tile challenge art | Yes | Fully implemented | Fully implemented | Fully implemented |
| Anomaly | 20 | Immediate distortion encounter | Sector Anomaly pools | Yes | Fully implemented | Fully implemented | Fully implemented |
| Escalation | 16 | Public shared-world deterioration | Sector Escalation pools | Yes | Fully implemented | Fully implemented | Fully implemented |
| Tile Challenge | 1 | Persistent board encounter | Authored sector attachment | Yes | Fully implemented | Fully implemented | Fully implemented |
| Equipment | 71 | Player-owned progression | Shops, loadouts, rewards | Yes | Fully implemented | Fully implemented | Public summary |
| Artifact | 30 | Rare player-owned reward | Contract exchange / approved rare source | Yes | Fully implemented | Fully implemented | Public result only |
| Follower | 24 | Player-owned companion | Canonical acquisition manifest | Yes | Fully implemented | Fully implemented | Public-safe summary |
| Contract | 36 | Owner-private objective / completed currency | Starting and sector Contract offers | Yes | Fully implemented | Owner-private | Redacted summary |
| Scar | 15 | Persistent operative consequence | Wound-recall-Scar lifecycle | Yes | Fully implemented | Fully implemented | Public-safe result |
| Affliction | 30 | Persistent/temporary operative condition | Typed authored effects | Conditional | Fully implemented | Fully implemented | Public-safe result |
| Character | 17 | Operative identity | Setup / late join / replacement | Yes | Fully implemented | Fully implemented | Public identity |
| Scenario | 6 | Scenario-controlled progression | Lobby selection | Yes | Fully implemented | Selection/progress | Public command state |

## Threat presentation categories

| Category | Count | Mechanic |
|---|---:|---|
| enemy | 67 | Opposed battle; Trophy eligible |
| hazard | 33 | Operative test; never a Trophy |
| asset | 3 | Operative test; never a Trophy |
| encounter | 3 | Operative test; never a Trophy |
| event | 3 | Operative test; never a Trophy |

Lane totals remain Red 26, Blue 35, Yellow 48; total 109. The canonical sector graph has 49 sectors. No card count, lane assignment, probability, topology, or authored effect changed.

## Root-cause finding

The additional families were not absent from canonical content or normal-play pools. Anomaly and Escalation sector resolvers selected and consumed cards authoritatively but discarded their identity before creating activeResolution. Threat projection also discarded resolutionType, and the TV inferred “battle” from a populated enemy-name convenience field. That combination visually collapsed Event, Encounter, Asset, Anomaly, and Escalation into Hazard/Battle presentation.

## Placement decisions

- Threat presentation categories stay in Threat decks and keep their existing enemy/test mechanics.
- Anomalies and Escalations remain in their separate sector pools; they are not mixed into ordinary Threat probability.
- Tile Challenges remain sector-authored and persistent.
- Equipment, Artifacts, Followers, Contracts, Scars, Afflictions, and Characters remain player-owned/progression systems.
- Scenarios, objectives, preparation, and confrontation stages remain scenario-controlled.
- Event/Choice was not expanded into a new schema: the three canonical Event cards are tests, while existing owner-private decisions remain typed pending choices in their owning mechanics.
