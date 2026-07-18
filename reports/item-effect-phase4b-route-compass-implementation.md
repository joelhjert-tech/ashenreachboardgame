# Phase 4B: Ashen Route Compass Implementation

Ashen Route Compass implements the approved Controlled Movement Adjustment rule with two exact-instance charges, one charge per committed adjustment, and no recharge.

The original authoritative movement roll remains in `movementRolls`. A separate turn-scoped `movementAdjustments` record stores the explicit −1/+1 modifier and source instance. The movement planner derives the effective total as original plus modifier and continues to require routes of exactly that length. The adjustment clears when movement resolves or the turn is authoritatively completed; charge state does not reset.

Acquisition initializes the exact owned Compass instance at 2/2 through the shared Phase 4 charge path. Confirmation validates the active seat, navigation phase, recorded roll, exact equipped instance, available charge, explicit modifier, minimum adjusted value of one, and absence of an existing adjustment. State and one-charge spending commit atomically. Preview/cancel, stale requests, zero charges, wrong seats, and duplicate adjustments spend nothing. Multiple instances retain independent charges but cannot stack because movement accepts only one adjustment record.

Phone movement presents explicit Move −1, Move +1, and Keep original roll choices, followed by a spend confirmation and `Roll X | Compass ±1 | Move Y`. Legal destinations come back from the server using the adjusted exact total. Changing destination does not alter or refund the committed adjustment. Inventory continues to display current/maximum charges and depletion through the shared charged-item projection.

TV and public projections receive the original value, modifier, effective movement value, and recalculated route list for compact existing-HUD presentation. No new focus mode is introduced.

Compass does not bypass gates, scenario locks, threats, blockers, adjacency, destination legality, or any movement-step requirement. Void Key remains the only implemented charged gate exception. Gate relics, other charged Artifacts, and recharge remain deferred.
