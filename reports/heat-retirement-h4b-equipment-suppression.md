# Heat Retirement H4B — Exact-instance Equipment suppression

Status: IMPLEMENTED for `relay-husk` and `signal-rotted-engineer`. `siren-relay-echo` remains approved and unimplemented for its separate modifier commit.

## Final rules

- Relay Husk: “If you fail, choose one equipped normal Equipment. It provides no effects through your next Threat.” The failed Relay lifecycle is excluded; the chosen instance becomes inactive from the next owner Threat reveal through that Threat's complete resolution.
- Signal-Rotted Engineer: “If you lose, choose one equipped normal Equipment. It provides no effects during your next battle.” The lost Engineer battle is excluded; the chosen instance becomes inactive from the next owner battle setup through its complete resolution.
- With no eligible item, the source closes normally with `No eligible Equipment to suppress.` and no substitute penalty.

## Shared authoritative contract

Eligibility is derived by the server from exact owned instances. An item must be currently equipped; have a non-empty instance ID; be non-QA normal `starter`, `standard`, or `advanced` Equipment; and have a meaningful stat, passive, conditional, exhaust, or activated effect. Artifacts, carried items, consumables, depleted charged items, removed items, and inert definitions are excluded. Starting Equipment remains eligible.

The pending choice stores owner, source Threat, source event, source resolution, approved mode, and the eligible exact instance IDs. Only the owner phone receives revalidated instance IDs, display names, slots, and Equipped status. The phone submits only choice token plus instance ID. The server revalidates the seat, token, ownership, equipped state, tier, and continued eligibility before creating one suppression.

The suppression record stores owner seat, source Threat ID, source event ID, source resolution ID, exact item instance ID, catalog ID for display, typed mode, qualifying lifecycle reservation, status, sequence, and time. Item definitions and printed stats are not mutated. Ownership, equip state, charges, uses, exhaustion, and consumption remain intact.

## Evaluation and lifecycle

All canonical Threat check/battle source construction and normal Equipment activation use the centralized exact-instance suppression check. While the qualifying lifecycle is active, the selected instance contributes no passive or conditional source and cannot activate or react. A duplicate catalog-matching instance remains independent.

Relay reserves at the next authoritative owner Threat reveal, for either a hazard or enemy, and clears only when that Threat leaves full resolution. Movement, shops, tile challenges, ordinary non-Threat tests, turns, rounds, and another owner's Threat do not reserve or clear it.

Engineer reserves at the next authoritative owner battle setup. Current canonical qualifying paths are enemy Threat combat and Nemesis combat; non-battle Threats, movement, checks, and another owner's battle do not reserve it. Nemesis combat reserves before modifier construction and clears after the committed battle result. Scenario/mission/check flows were not changed or reclassified as battles.

Unequip/re-equip retains the exact suppression and never transfers it. Normalization clears a suppression when its item leaves inventory, its owner recalls or is replaced, or the session ends. Room reset creates fresh empty state. Cleanup and lifecycle completion are idempotent. Serialized state preserves a pending choice, committed target, reservation, and active suppression across reconnect.

## Presentation and privacy

The owner phone reuses the action list for the mandatory picker and inventory cards for authoritative disabled status. Duplicate inventory/action keys use instance IDs. Active cards show `Suppressed` with either `through this Threat` or `during this battle`; charges and ownership remain visible. There is no cancel or automatic timeout.

TV and other phones receive no eligible list, item name, or exact instance ID. Public resolution says only that the operative's Equipment was disrupted. No new TV focus mode was added.

## Tests and risks

Focused H4B coverage proves stable content and totals, exact eligibility, owner-only projection, invalid/stale/duplicate rejection, no-target fallback, duplicate-instance isolation, source exclusion, owner/lifecycle qualification, idempotent completion, unequip/re-equip persistence, reconnect-shaped projection, and item/recall/session cleanup. Existing item-effect, battle, Threat, server privacy, engine, client, content, asset, and build suites remain the regression gates.

Playtest risks remain the approved ones: low-value equipped Equipment can absorb the choice; a no-target loadout avoids the consequence at the opportunity cost of normal Equipment; and a queued duration may span turns. Exact-instance presentation and named expiry are intended to keep that bookkeeping visible without exposing inventory publicly.

The six blocked IDs remain unchanged: `ashen-doppelganger`, `false-route-procession`, `gateblind-pulse`, `hymn-scarred-zealot`, `marrow-tax-auditors`, and `memory-tax-gate`.
