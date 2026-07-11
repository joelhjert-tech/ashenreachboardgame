# Phase 4C Charged Gate Relics

Gate-Saint Key now enters owned inventory at 1/1 and opens a persisted party safe-conduct window after authoritative final-gate validation. The window records a unique ID, source instance, and used seats, closes only at `ROUND_COMPLETED`, and never recharges or permanently unlocks the gate.

Marrow Route Key enters owned inventory at 2/2 and resolves against the persisted failed-movement reaction before consequences. The server revalidates the exact instance, charge, owner, reaction ID, Wound capacity, adjacency, and ordinary destination restrictions. It atomically moves to the selected adjacent legal sector, applies one Wound, spends one charge, clears the pending consequences, and preserves the failed result already recorded by the movement lifecycle.

Both use exact-instance state, survive reconnect serialization, reject stale/duplicate/wrong-seat requests without cost, and remain inert at zero with no recharge. Void Key, Route Compass, ordinary movement, mission lifecycle, and other charged Artifacts remain unchanged. Phone/TV consume public/private authoritative state without adding a focus mode; inventory retains standard charge and inspection presentation.
