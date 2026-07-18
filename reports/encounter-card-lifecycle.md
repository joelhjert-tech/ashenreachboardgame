# Encounter Card Lifecycle

## Authoritative arrival sequence

Movement completes → destination entry/gate resolves → persistent tile challenge resolves → named sector text resolves → authored sector action selects a deck → server draws deterministically → identity and origin enter activeResolution → category mechanic resolves → typed effects apply once → card is consumed/discarded/persisted by its owner system → broadcast completes.

Intermediate route nodes and startup do not draw encounters.

## State diagrams

| Lifecycle | Reveal | Action | Result | Cleanup / persistence | Trophy |
|---|---|---|---|---|---|
| Enemy | Threat deck → public enemy | Authoritative opposed battle and reactions | Reward/failure once | Defeat discards or authored persistence remains | Eligible when value > 0 |
| Hazard | Threat deck → HAZARD | Operative test and reactions | Typed success/failure | Discard unless authored persistence says otherwise | Never |
| Anomaly | Sector Anomaly pool → ANOMALY | Typed effect/test; owner data remains private | Distortion result once | Consumed from that sector pool | Never |
| Escalation | Sector Escalation pool → ESCALATION | Public typed shared effect | Global track/effect once | Consumed from that sector pool | Never |
| Event | Threat deck → EVENT | Existing authored operative test | Typed result once | Discard | Never |
| Choice | Owning mechanic creates private pending choice | Owner submits stable option ID | Server validates stale/wrong-seat input | Pending choice clears once; reconnect restores | Never by category |
| Persistent challenge | Sector-authored challenge | Resolves on its defined entry/revisit trigger | Typed success/failure | Remains until its authored removal condition | Never unless separately an Enemy |
| Scenario encounter | Scenario state/source only | Preparation or confrontation reducer | Public scenario result | Scenario lifecycle owns cleanup | Only if explicitly an Enemy reward |

## Queue and source authority

Mixed Threat engagement ordering remains Event → Enemy → Nemesis → Encounter → Asset. Unsupported categories now fail loudly instead of receiving an accidental sort position. Every projected resolution may carry source deck, sector, event identity, queue position, actor, and privacy; clients only render this state.

## Reconnect and replay

Card selection, consumed sector-deck membership, active resolution, pending choice, and event identity are serialized in save version 2 state. Reconnect reads that state and never redraws or rerolls. Legacy v0–v2 parsing remains unchanged.
