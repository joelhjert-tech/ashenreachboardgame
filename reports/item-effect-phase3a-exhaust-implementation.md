# Item Effect Phase 3A: Round-Exhaust Companions

## Implemented items

| Artifact | Owned instance | Activation timing | Typed effect | Reset |
|---|---|---|---|---|
| `artifact-lucy-hell-puppy` | `lucy-hell-puppy` follower | Before battle, before taking damage, or during movement | Record the authored ember-pup note | Round |
| `artifact-murkclaw-gravecrow` | `murkclaw-gravecrow` follower | Before threat draw, before battle, or during movement | Record the authored omen note | Round |
| `artifact-rune-eye-raven` | `rune-eye-raven` follower | Before threat draw or during movement | Record the authored route-memory note | Round |

## State and authority

Each acquired follower receives a stable `instanceId` and an `exhausted` boolean on the owned follower object. Successful `USE_FOLLOWER` resolution applies the note first and then marks that exact instance exhausted. Rejected ownership, timing, wrong-seat, stale-instance, or already-exhausted activation leaves state unchanged. Although all three authored companions are Unique, reducer coverage also proves synthetic duplicate instances exhaust independently.

`ROUND_COMPLETED` is the only refresh path. It clears exhaustion only for owned objects declaring `effectModel: exhaust` and `resetWindow: round`. Turn changes, phase changes, battle/encounter closure, serialization, and reconnect do not refresh them. A reconnect reads the stored state; after a real round transition it therefore receives Ready.

## Phone presentation

The private projection provides authoritative timing/exhaustion reasons. Inventory shows `Ready` or `Exhausted`, includes “Refreshes next round,” does not show numeric uses as charges, retains separate Artifact artwork inspection, and exposes Use only in an authored timing window.

## Tests

Coverage verifies ready acquisition state, valid owner activation, wrong-seat and invalid-timing rejection, one note resolution, exact-instance exhaustion, same-round duplicate rejection, serialization persistence, round-only refresh, post-reset serialization, and independent duplicate-instance state.

## Phase 3B remains blocked

`artifact-fandiablos`, `artifact-mirror-reroll-token`, and `artifact-red-march-warbell` remain unchanged pending approval of typed instability rules. No new Heat mechanic was introduced.
