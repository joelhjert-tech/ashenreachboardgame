# Physical Android Implementation Recommendation

The narrow implementation in this pass is the recommended production direction:

1. Keep `usePhysicalVisualViewport` as the sole phone viewport subscription.
2. Keep `useActiveRoomBackGuard` scoped to authenticated, non-ended rooms.
3. Keep canonical Leave Room authority unchanged.
4. Preserve major-tab top reset and local detail return behavior.
5. Preserve the compact result hierarchy only at short mobile heights.
6. Retain the 384 × 722 / DPR 2.8125 automated profile as regression evidence, not physical certification.

Acceptance requires the physical S21+ check plus the automated client, integration, engine/rules, build, asset, and diff gates.

P18 confirms this direction. Active-room Leave must continue to disconnect the controller without deleting the authoritative operative; lobby and pending late-join release continue to use the original seat-release semantics. Do not replace this with client-only navigation or browser trapping.
