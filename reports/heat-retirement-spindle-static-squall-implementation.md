# Spindle Static Squall Heat retirement implementation

Date: 2026-07-14

Status: implemented on `phase/heat-retirement-1x`. This slice changes `spindle-static-squall` only. Glass-Chime Swarm remains unchanged, and the other seventeen Heat-linked Threat IDs remain blocked.

## Old Heat intent

Spindle Static Squall is an outer/common Blue Hazard with a Signal 6 test. Its former failure was `gain_heat 1`, an inactive compatibility consequence. The authored pressure was corrupted navigation and bearing, not bodily injury, permanent Scarring, material loss, Equipment damage, forced movement, shared escalation, or topology change.

The implementation removes the legacy Heat effect and `heat` resource tag without changing the stable ID, Hazard type, Blue lane, Signal 6 test, severity 2, outer/common placement, art identity, success note, graph membership, or deck count.

## Final approved rule

> The squall corrupts your bearing. On failure, reduce your next movement roll by 1, to a minimum of 1.

After a confirmed failed Spindle Static Squall check resolves, its owner receives `-1` on their next accepted normal movement roll. The final allowance cannot fall below `1`.

## Eligible normal-movement definition

Eligibility is the authoritative `MOVEMENT_ROLL_REQUESTED` to `MOVEMENT_ROLLED` lifecycle that determines voluntary turn movement allowance for the active operative. UI opening and the request action do not consume the effect; the accepted result action does.

Forced displacement, clockwise/counterclockwise Threat movement, recall, teleportation, scenario or encounter relocation, route correction, movement-related checks, another seat's roll, previews, rejected/stale actions, and QA-only calculations are excluded. The modifier does not alter movement legality, graph connectivity, sector costs, destination selection, or stored character stats.

## Typed modifier model

The failure uses fixed `next_normal_movement_roll_modifier` content with amount `-1`, minimum `1`, and source card `spindle-static-squall`. Session state stores one narrow owner record plus resolved-source and consumed-movement-resolution ledgers. Creation and consumption are idempotent; clients do not supply ownership, amount, minimum, or eligibility.

The accepted movement record stores a public-safe resolution ID internally and exposes only raw roll, modifier labels/values, and final allowance through the ordinary movement projection.

## Minimum-one handling and ordering

The server resolves raw movement first, adds the Spindle modifier exactly once, then applies the final `Math.max(1, total)` clamp. Examples are `6 -> 5`, `2 -> 1`, and `1 -> 1`. Raw die-trigger behavior remains keyed to the raw roll rather than the reduced allowance.

Ashen Route Compass remains a legal post-roll adjustment against the already committed allowance. Route Star continues to choose among legal routes for that allowance. Neither item is spent, disabled, or otherwise changed by Spindle.

## Reroll behavior

The current runtime has no player-facing normal-movement reroll intent. The calculation is therefore side-effect-free until one final `MOVEMENT_ROLLED` result is committed. Discarded or replacement candidates can reuse the same modifier and stable resolution ID without consuming state; only the accepted action consumes it. This prevents double subtraction without adding a new reroll mechanic here.

## Refresh, reconnect, and cleanup

An owner can have at most one pending Spindle modifier. A later distinct failure replaces the pending record at `-1`; it never stacks to `-2` or queues multiple rolls. Reprocessing one source creates nothing.

Pending state and both ledgers persist in version-2 snapshots. Reconnect before commitment retains one modifier; reconnect after commitment retains the consumed ledger and cannot restore it. Recall, replacement, and session end clear the pending record. Other turns, phase changes, shops, encounters, UI navigation, and reconnect do not clear it.

## Phone and TV presentation

The owner phone shows `Spindle Static Squall`, `Next normal movement roll: -1`, and `Minimum result: 1` as passive status with no Use, Cancel, charge, exhaust, or targeting control. Other phones receive no pending record.

After commitment, phone and TV use the same public movement projection: raw roll, `Spindle Static Squall -1`, and final allowance. The TV receives no pending private status or internal source-event ID, and no focus mode or layout was added.

## Tests and playtest risks

Focused coverage proves content identity/totals, confirmed-failure creation, forged/success rejection, replay protection, refresh-not-stack, owner scope, `6 -> 5`, `2 -> 1`, `1 -> 1`, invalid and preview retention, forced-movement separation, stable reroll candidates, one-use consumption, topology preservation, Compass ordering, reconnect, phone privacy, TV safety, and recall/session cleanup.

Final verification on 2026-07-14:

- `npm.cmd run validate:content` — passed with 109 Threats and all canonical totals unchanged.
- `npm.cmd run typecheck` — passed.
- Focused Spindle, movement, phone, and TV run — 4 files and 150 tests passed.
- `npm.cmd run test:engine` — 40 files and 499 tests passed.
- `npm.cmd run test:client` — 26 files and 255 tests passed.
- `npm.cmd test` — 92 files and 980 tests passed.
- `npm.cmd run audit:assets` — 404/404 assets present; zero missing, invalid, placeholder, or release-blocking assets.
- `npm.cmd run build` — passed.
- `git diff --check` — passed.

Playtest risks:

- The floor can make rolls of 1 and 2 feel identical; confirm the penalty remains legible without feeling arbitrary.
- A later Compass adjustment can offset the penalty at its normal charge cost; this is approved and should remain a meaningful choice.
- Cross-turn persistence can be forgotten; owner status and the accepted public breakdown mitigate that.
- If a movement-reroll item is added later, it must reuse one resolution ID and commit only its final candidate.

## Scope confirmation

This implementation does not change Glass-Chime Swarm, the other seventeen blocked Heat-linked IDs, Wounds, Scars, Salvage, Equipment definitions, Global Escalation, forced displacement, Rift Anchor Spike, map topology, scenarios, missions, Contracts, items, or card counts. It does not authorize the +116-card expansion.
