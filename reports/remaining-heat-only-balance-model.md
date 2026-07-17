# Remaining Heat-only balance model

All values model the pending Phase 1W recommendations against the current runtime, where all 38 Heat outcomes are no-ops. They are balance deltas, not implemented behavior.

## Recommendation totals

| Model | IDs | Maximum authored units per one resolution of every relevant branch |
|---|---:|---:|
| Removed outcomes | 4 | 4 blank clauses deleted |
| Salvage gains | 2 | +2 Salvage |
| Automatic Salvage losses | 5 | −5 Salvage, each independently floor-zero |
| Direct Wound gains | 7 including Lantern’s failure | 8 Wounds |
| Direct healing | 4 including Lantern’s success | 4 Wounds healed |
| Conditional Wound fallbacks | 3 | +3 only for no-route/no-note/duplicate-Scar cases |
| New Scar | 1 | Bell-Deafened, duplicate becomes 1 Wound |
| Loss Pressure | 2 | +2 |
| Global Escalation | 2 | +2 |
| Equipment losses | 2 | up to 2 equipped normal items |
| New typed tests | 1 | Signal 7; +1 Salvage only on success |
| Temporary-modifier entries | 3 | two −1 Signal; paired +1/−1 Command |
| Movement displacement | 1 | one outward step or 1 Wound fallback |
| Bespoke entries | 4 | paired Wound card, note choice, payment discount, public scouting |
| Required/optional payments | 0 / 0 | none added |
| Retirements | 0 | none |

Primary treatments sum to 36. Two paired cards explain why outcome-unit totals exceed primary IDs.

## Wound and recovery pressure

The direct model adds eight possible Wounds across seven IDs, plus three conditional fallbacks. Six direct branches inflict one; Ashen Doppelganger inflicts two. Four success branches can heal one each. This is not an expectation that all cards appear once per session: outer threats repeat more often than inner threats, unresolved enemies can remain, and canonical deck selection is mode/route dependent.

- Early game: Ash-Cinder Runt, Grave-Silt Press, Mirror-Mite Bloom, Relay Pilgrim Riot, Choir-Static Burst, and Lantern-Moth Swarm create the main recovery demand. The four healing successes partially offset but do not guarantee recovery.
- Late game: Ashen Doppelganger is the largest single increase and can trigger recall from two below threshold; it requires isolated approval.
- Prevention remains valuable without becoming multiplicative. Existing prevention runs once per authored Wound effect; it cannot prevent the same consequence twice after reconnect.
- High-encounter routes through outer blue/yellow sectors become measurably harsher. Playtest telemetry should track Wounds per resolved card, recalls by source ID, and healing actually applied rather than authored healing.

## Economy

Two guaranteed/conditional gains add at most 2 Salvage. Five automatic losses remove at most 5, but each floors at zero and is not a payment. Bellrain adds a further conditional +1 only after a Signal 7 success. The net authored ceiling is therefore +3/−5, with low-resource protection reducing actual loss.

No recommendation creates a shop transaction, Salvage Ledger trigger, Contract completion, relic trade, or recursive reward. Contract Equipment Requisition’s +1 is paid only by `COMPLETE_CONTRACT`. The economy tightens chiefly on yellow threats and Marrow Surgery Debt, so early-game opening Salvage and shop access need observation.

## Shared pressure

Two Loss Pressure and two Global Escalation effects each advance exactly one. In a session that sees all four once, shared defeat clocks accelerate by four total track steps, but the tracks remain distinct. Group effects no longer scale with player count; one card resolution creates one shared increment. Rivalry cannot target or redirect the step.

These are the highest systemic changes after the Scar and Ashen Doppelganger. Approval requires scenario tests at maximum−1, maximum, repeated resolution, and all supported modes.

## Equipment, Scar, and persistent state

- Equipment loss can remove only equipped normal utility/weapon instances. Artifact-grade state is excluded. At zero eligible items the effect does nothing, preventing malformed choices but allowing a legitimate low-inventory defense.
- Bell-Deafened is an existing Scar, avoiding a new content ID. Its persistent penalty already has normal privacy/relief behavior. Duplicate fallback adds one Wound, making repeat exposure serious.
- Three temporary modifiers and two follower uses add persisted lifecycle state. They must survive reconnect and expire/reset only at their named authoritative boundary.

## Mode and session assessment

| Context | Expected impact |
|---|---|
| Typical session | Several newly meaningful minor outcomes; moderate Wound/economy increase; shared tracks move only if matching escalation/gate cards appear |
| High-encounter session | Recovery and shop pressure rise; repeated outer cards are the main risk; no positive economy loop identified |
| Single-player | Personal Wounds/Salvage are concentrated on one operative; shared pressure is not diluted |
| Cooperative | More card exposure but recovery and Equipment support can be distributed; shared pressure remains one step per event |
| Rivalry | Personal consequences remain owner-scoped; public pressure can affect all seats but cannot be aimed; private note/Equipment choices must not leak |
| Early game | Floor-zero economy protects bankruptcy, but one-Wound failures and item loss matter most before recovery access |
| Late game | Inner Doppelganger, Gateblind, Cinder Gate, and persistent Scar dominate difficulty |

## Exploit analysis and approval gates

- Farming: healing gives no substitute at zero; Bellrain reward requires a resolved test; Contract reward uses normal completion; no repeated no-cost action directly grants Salvage.
- Avoidance: zero Salvage legitimately nullifies automatic loss; this is intentional floor-zero loss, not a bypassed payment. No-item/no-note fallbacks are explicitly defined.
- Replay: every decision/mutation uses current server continuation and resolved-decision guards. Reconnect never resets round use, temporary state, or pending choices.
- Choice quality: Equipment targets cannot be diverted to carried junk. Memory Tax permits any existing note, so note value variance is an explicit balance concern.
- Difficulty: the recommended set is materially harder than current runtime. Batches 4–7 must not ship from this report alone; each requires the named approval and focused implementation phase.

Recommended telemetry for playtests: outcome frequency by ID; actual Salvage/Wound deltas; prevented Wounds; recalls; pressure maxima reached; discarded item value; prompt duration; reconnect/replay rejections; and mode/player-count distribution.
