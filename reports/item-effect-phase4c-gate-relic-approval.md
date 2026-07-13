# Phase 4C: Remaining Gate Relic Approval

## Scope and locked architecture

This report covers only `artifact-gate-saint-key` and `artifact-marrow-route-key`. It is report-only. Both options assume exact owned-instance `currentCharges`, catalog maximum/starting values, atomic effect-and-charge resolution, no recharge, reconnect persistence, independent copies, no spend on rejection, and server-authoritative prompts.

Neither relic may duplicate Void Key’s personal gate-rule exception or Ashen Route Compass’s ±1 exact-distance control. Neither permanently unlocks a gate, changes adjacency, ignores movement distance, bypasses scenario locks/threats/unrelated blockers, or rolls back resolved consequences.

## Gate-Saint Key options

Recommended identity: safe, sanctified, party-wide final-gate passage for one bounded window.

| Option | Exact player-facing rule | Restriction, scope, and timing | Passage/test/reward | Route and gate state | Authority, phone, and TV | Power risk |
| --- | --- | --- | --- | --- | --- | --- |
| **A — Saint’s Safe Conduct** | “When the party is prompted to attempt an authored final-gate passage test, spend 1 charge. The party passes that gate test without rolling. Gain no bonus reward or progress that would have been awarded for passing the test. This permission covers the current final-gate passage window only.” | Only a typed final-gate passage test, not ordinary movement gates; party-wide; prompt immediately before the roll. Maximum/start 1/1; cost 1 charge. | Automatic passage. Suppress test-success trophies, notes, bonus scenario progress, and optional rewards; apply only the baseline state transition required to pass. | Normal movement distance, adjacency, destination legality, scenario stage, threats, and blockers must already be satisfied. Gate remains locked after the window. Eligible party members do not move simultaneously; each may complete the already-authorized passage during that one server-owned window, which closes at the first relevant phase/window boundary. | Server prompt carries gate/window ID, eligible seats, stage/version, exact Key instance, and baseline transition. Reject stale/wrong gate/wrong seat/zero charge. Owner phone confirms `Spend 1 charge for party safe conduct — no bonus reward`; other eligible phones show temporary permission only after commitment. TV: `Gate-Saint safe conduct granted` and eligible passage status, no charge count. | 3/5 |
| B — Consecrated Retry | “After the party fails an authored final-gate passage test, before consequences, spend 1 charge to reroll it. The second result must be accepted. This does not grant bonus rewards beyond the normal final result.” | Final-gate failure reaction; party-wide result; 1/1, cost 1. | Test remains required; reroll replaces result. Normal reward follows final success, which is a power increase versus A. | Distance/route legality still required; gate remains locked. Permission affects only this test, not later movers. | Persist gate-test reaction and consequences; owner confirms mandatory reroll; TV shows sanctified retry and final result. | 4/5 |
| C — Pilgrim Ward | “After the party fails an authored final-gate passage test, before consequences, spend 1 charge to prevent all Wounds from that failure. The test remains failed and all non-Wound consequences resolve.” | Failure-consequence reaction; party-wide protection for participants in that test; 1/1, cost 1. | Does not pass gate. No bonus reward. | No movement permission; gate remains locked. | Persist typed pending Wound consequences; phone previews prevented Wounds; TV reports the ward and retained failure. | 2/5 |

**Recommendation: Option A — Saint’s Safe Conduct.** It is the clearest sanctified identity: safe party utility, not a personal route exception. The one passage window must be a typed scenario/final-gate lifecycle boundary; it cannot become a free permanent party unlock.

Gate-Saint Key:
- Selected option: Option A — Saint’s Safe Conduct
- Maximum charges: 1
- Starting charges: 1
- Charge cost: 1
- Scope: all allied operatives until the current round ends
- Final rule text: Spend 1 charge when an allied operative reaches the final gate. Until the end of the current round, each allied operative may pass that final gate once without its normal passage test or requirement. No bonus reward is gained from this passage. Movement distance and all other route, destination, threat, blocker, and scenario rules still apply. The gate remains locked afterward.

## Marrow Route Key options

Recommended identity: a dangerous owner-only reaction after failed movement, before consequences. Every option leaves the original test failed for mission/scenario triggers.

| Option | Exact player-facing rule | Failure state and cost | Destination/route effect | Consequences and authority | Phone and TV | Power risk |
| --- | --- | --- | --- | --- | --- | --- |
| **A — Boneway Detour** | “Reaction — After your movement test fails, before failure consequences resolve, spend 1 charge and suffer 1 Wound. Choose one server-offered adjacent legal sector and move there. The movement test still counts as failed. Replace the original movement-failure consequences with the 1-Wound activation cost.” | Exact persisted owner movement failure; before any consequences. Maximum/start 1/1; charge cost 1; activation cost 1 Wound. Reject if Wound cannot legally be suffered. | Server offers only sectors adjacent to the current sector that are ordinarily legal to enter now. This is not the originally rolled route, a teleport, a gate override, or distance adjustment. | Suppress all original failure consequences only after a valid detour commits; retain failed result/triggers. Atomically suffer Wound, spend charge, select/move, and close reaction. Reject stale target, resolved failure, invalid destination, wrong seat, depleted instance, or changed board without cost. | Phone shows `Take Boneway Detour?`, 1 charge + 1 Wound, exact server destinations, and warning that failure still counts. TV shows `Marrow detour` and final public movement, not private alternatives/count. | 4/5 |
| B — Shorten the Fall | “Reaction — After your movement test fails, before consequences, spend 1 charge and suffer 1 Wound to move along the validated failed route to the last legal sector before the failure point. The test remains failed and original failure consequences are suppressed.” | Persisted failed route with at least one traversable step; 1/1 charge, 1 Wound. | Move only to last legal sector already present in authoritative route trace; remain if none. | Replaces original consequences with Wound; requires storing failed route and failure edge. | Phone previews the exact fallback sector; TV shows shortened movement. | 3/5 |
| C — Feed the Wrong Turn | “Reaction — After your movement test fails, before consequences, spend 1 charge and suffer 1 Wound to remain in place and ignore the original failure consequences. The test remains failed.” | Any eligible pending movement failure; 1/1 charge, 1 Wound. | No movement or reroute. | Simplest reaction: replace failure consequences with activation Wound. | Phone confirms stay/cost; TV reports the Key consumed the route harm. | 2/5 |

**Recommendation: Option A — Boneway Detour.** It best preserves the dangerous wrong-turn identity and creates a real route decision. The adjacent destination set must come from ordinary server validation; gates, scenario locks, threats, and blockers remain effective. The Wound is an activation cost, while the failed result remains available to mission/scenario triggers.

Marrow Route Key:
- Selected option: Option A — Boneway Detour
- Maximum charges: 2
- Starting charges: 2
- Charge cost: 1
- Wound cost: 1
- Final rule text: Reaction — After you fail a movement test, but before its failure consequences resolve, spend 1 charge and suffer 1 Wound. Choose one adjacent legal sector and move there instead of resolving the original failure consequences. The test still counts as failed. Gates, scenario locks, threats, blockers, and destination restrictions still apply.

## Identity separation proof

| Artifact | Mechanical identity | Changes distance? | Overrides gate rule? | Failure reaction? | Scope / persistence |
| --- | --- | ---: | ---: | ---: | --- |
| Void Key | Personal gate-rule override for one otherwise-legal movement | No | Yes, exactly one supported restriction | No | Owner; one movement; gate remains locked |
| Ashen Route Compass | Explicit ±1 authoritative exact-distance adjustment | Yes | No | No | Owner; rest of current movement |
| Gate-Saint Key | Safe sanctioned final-gate passage without bonus reward | No | Does not alter ordinary movement gates; resolves a typed final-gate test | No | Party; one passage window; no permanent unlock |
| Marrow Route Key | Dangerous detour after a failed movement test | Does not alter roll; selects adjacent fallback | No | Yes | Owner; one pending failure; failure still counts |

## Implementation implications after approval

Gate-Saint Key requires an owned Artifact instance instead of its current note-only acquisition, plus a typed final-gate passage prompt/window, eligible-party permission, baseline-versus-bonus reward separation, and public window projection. The principal risk is accidentally turning a bounded scenario passage into a permanent movement unlock.

Marrow Route Key requires an owned instance instead of immediate scenario progress, a persisted failed-movement reaction containing the original result/consequences and current-sector version, server-generated adjacent legal destinations, Wound affordability validation, and one atomic detour resolution. `gateRelicsHeld` semantics must be migrated separately and cannot treat acquisition notes as spendable charges.

## Unresolved decisions

- Select one option for each relic and approve final text.
- Confirm recommended charge counts (1/1, cost 1 for both).
- Gate-Saint: define the exact final-gate test(s), passage-window close event, eligible party members, and baseline transition versus suppressed bonus rewards.
- Marrow: confirm 1-Wound cost, adjacent destination predicate, and that all original failure consequences are replaced while the failed result still counts.
- Confirm both remain owned but depleted at zero and never recharge.

No mechanics, content, schema, UI, tests, Void Key behavior, or Ashen Route Compass behavior changed during this pass.
