# Phase 4B: Ashen Route Compass Approval

## Scope and fixed architecture

This approval sheet covers only `artifact-ashen-route-compass`. It assumes the sealed Phase 4A exact-instance charge model: catalog maximum/starting/cost, owned `currentCharges`, atomic server resolution, no recharge, reconnect persistence, independent copies, and server-projected phone eligibility. It does not alter Void Key or approve any other charged Artifact.

The Compass must remain a navigation decision tool. It cannot legalize an otherwise invalid destination, bypass a gate or scenario lock, ignore threats/blockers, change adjacency, permanently alter the map, or recharge automatically.

## Option comparison

All options use maximum 2 charges, starting 2, cost 1 charge, recharge none, require the exact equipped Compass instance, and retain the depleted item at zero.

| | Option A — Route Recalculation | Option B — One-Step Correction | Option C — Controlled Movement Adjustment |
| --- | --- | --- | --- |
| **Exact player-facing rule** | “After rolling movement, spend 1 charge to recalculate legal routes using the same movement total. Choose one server-offered route. The destination and every step must satisfy all normal movement rules.” | “After selecting a legal destination, spend 1 charge to replace one intermediate route step with another adjacent legal sector. The route must keep the same length and destination, and every step must remain legal.” | “After rolling movement, spend 1 charge to increase or decrease your movement total by 1 for this movement. Choose a destination and route legal at the adjusted total. All normal movement requirements still apply.” |
| **Activation timing** | After movement roll, before destination confirmation | After a legal destination and route are selected, before confirmation | After movement roll, before destination selection/confirmation |
| **Route/destination restrictions** | Same rolled distance; no new legality override. Only complete routes returned by the authoritative planner. Destination must remain reachable at that exact distance. | Same route length and destination. Replacement step must be adjacent to both surrounding steps. Whole reconstructed route must pass ordinary step validation. | Effective total must be exactly rolled value −1 or +1 and remain within the legal movement range. Final route length must exactly equal that adjusted total. Destination and every step use ordinary validation. |
| **Server validation** | Exact seat/turn/instance/charge; unchanged roll and movement-state version; at least two distinct complete legal routes must exist or activation has no effect. Server returns route choices. | Exact seat/turn/instance/charge, selected route ID/version, replacement position and sector; validate both new edges and every ordinary requirement; reject loops/illegal topology according to existing planner rules. | Exact seat/turn/instance/charge, original stored roll, selected ±1 mode, adjusted range, and movement-state version. Rebuild the normal authoritative route plan for the adjusted exact distance; no gate override flag. |
| **Stale request** | Reject without spend if roll, phase, current sector, route set, or active seat changed. | Reject without spend if selected destination, route, graph-relevant state, phase, or seat changed. | Reject without spend if roll, phase, current sector, active seat, or movement-state version changed. |
| **Phone prompt** | `Recalculate routes — 1 charge`; show only if a meaningful alternate complete route exists; replace route list from server response. | On route detail, select one intermediate step, then `Correct this step — 1 charge`; preview full corrected route before confirm. | `Adjust movement — 1 charge`; explicit `−1` and `+1` choices show the resulting exact total and server-generated destinations. One-sentence explanation: “Spend 1 charge to move exactly one less or one more.” |
| **TV public presentation** | Concise “Ashen Route Compass recalculated the route” and existing route preview; no charge count. | Concise “Ashen Route Compass corrected the route” and existing preview; no private alternatives. | Concise “Ashen Route Compass adjusted movement to X” and existing route preview/die-result context; no charge count. |
| **Complexity** | 4/5 | 5/5 | 3/5 |
| **Power risk** | 2/5 | 3/5 | 3/5 |
| **Implementation requirements** | Planner must retain multiple routes to the same destination instead of its current first-route deduplication, issue route IDs, and make recalculation meaningfully different from the initial deterministic plan. | Planner needs arbitrary route reconstruction/validation, intermediate-step selection, stable route IDs, and a new phone editor. This is the largest route-engine change. | Add a server-owned temporary adjusted movement value or movement-plan override scoped to this turn; parameterize the existing planner by effective movement value; reuse destination list, preview, and normal `MOVE_REQUESTED` validation. |

## Recommendation

**Recommend Option C — Controlled Movement Adjustment.**

Option C can preserve the exact-distance rule: the Compass does not permit movement at an arbitrary distance; it authoritatively changes the effective movement total once to `roll ± 1`, after which the existing planner still requires a route whose length exactly equals that adjusted total. This is a new finite charged decision, not a weakening of route validation.

It is meaningfully different from Void Key. Void Key preserves the rolled distance and overrides one supported gate restriction for one movement. Compass changes distance by one but overrides no restriction at all. A gated, blocked, non-adjacent, scenario-locked, or otherwise illegal route remains illegal.

Option A sounds conservative but currently has no reliable gameplay value: the planner is deterministic and retains only the first route per destination. Making “recalculate” useful requires preserving alternate routes, stable route-choice identity, and different selection behavior. That is a broader planner change than parameterizing the existing exact-distance calculation.

Option B is not recommended because it creates a route-editing subsystem, arbitrary intermediate-step validation, and substantial phone complexity.

Recommended final text:

> **Ashen Route Compass — Controlled Movement Adjustment**
> After rolling movement, you may spend 1 charge to increase or decrease your movement total by 1 for this movement. Choose a destination and route legal at the adjusted total. All normal movement distance, adjacency, destination, gate, scenario, threat, blocker, and route requirements still apply.

## Route-engine impact of the recommendation

Option C should add a narrowly scoped server state such as an exact movement adjustment `{ instanceId, originalValue, adjustment: -1 | 1, effectiveValue }`, tied to the owner’s current navigation turn. `buildMovementRoutePlan` should accept or derive the authoritative effective value, while retaining its existing exact-length traversal and step blockers. The state clears when movement resolves or the turn ends; it does not refill the Artifact.

Atomic ordering:

1. Validate seat, active navigation turn, exact equipped instance, positive charge, stored original roll, chosen ±1, adjusted range, and current movement-state version.
2. Build the adjusted plan and require at least one legal destination; otherwise reject without spend.
3. Atomically store the adjustment and subtract one charge.
4. Project the adjusted total and legal destinations.
5. On destination confirmation, rerun ordinary validation at that adjusted exact distance.

The phone renders only the server-projected −1/+1 eligibility and adjusted plans. It never calculates which destinations become legal. Canceling before activation spends nothing; after a successful adjustment, choosing another destination does not refund the charge. A duplicate or stale adjustment request rejects against the already-mutated instance/turn state.

## Required implementation tests after approval

- Acquisition initializes an exact Compass instance at 2/2; reconnect and duplicate copies follow Phase 4A rules.
- Only the owner with the exact equipped instance can adjust; zero charges, wrong seat, stale instance, wrong phase, or missing movement roll reject without spend.
- Explicit −1 and +1 each spend exactly one charge and create routes at exactly the adjusted total.
- Adjustment never bypasses gates, scenario locks, threats/blockers, adjacency, destination legality, or other step restrictions.
- Reject adjusted totals outside the allowed range or with no legal destination without spending.
- A changed roll/turn/current sector invalidates a stale request without spending.
- Duplicate intent spends/resolves once; reconnect preserves both charge count and an active adjustment.
- Turn/movement completion clears the adjustment but never restores charges.
- Phone shows Charges X/Y, no recharge, explicit ±1 controls, authoritative reasons, and adjusted destination preview.
- TV shows only the adjusted public movement total and existing route preview.
- Void Key, ordinary exact-distance movement, mission lifecycle, passives, consumables, reactions, exhaust items, and tier separation remain unchanged.

## Approval block

Ashen Route Compass:
- Selected option: Option C — Controlled Movement Adjustment
- Maximum charges: 2
- Starting charges: 2
- Cost per use: 1 charge
- Recharge: none
- Final rule text: After rolling for movement, you may spend 1 charge and choose −1 or +1. The adjusted value becomes your exact required movement distance for this movement. All normal route, adjacency, gate, scenario, threat, blocker, and destination rules still apply.

## Unresolved decisions

- Approve A, B, or C.
- If C is selected, confirm the adjusted total may not fall below 1 and may not exceed the normal movement die/system maximum.
- Confirm successful activation is committed and non-refundable even if the player later chooses a different legal destination.
- Confirm whether the adjusted public movement total replaces the displayed die total or appears as `Roll X | Compass ±1 | Move Y`; the latter is recommended for honesty.

No mechanics, content, schema, engine, UI, tests, validation, or existing Artifact behavior is changed by this report.
