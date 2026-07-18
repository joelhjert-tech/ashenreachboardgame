# Heat Compatibility C5B — Final follower implementation

Date: 2026-07-16
Approval source: `reports/heat-compatibility-c5a-follower-approval.md` at `761f8ac`
Scope: `crownless-advocate` and `saltflat-bone-reader`

## Outcome

C5B replaced the final two authored typed Heat effects with the exact approved owner-private `gain_note` effects. Active authored typed Heat is now **0 occurrences across 0 IDs**.

No compatibility field was deleted. In particular, the legacy `lossCondition: "heat"` metadata on `saltflat-bone-reader` remains parseable and mechanically inert.

## Exact implementation

### `crownless-advocate`

- Removed: `activeEffect: { type: "lose_heat", amount: 1 }`
- Added: `activeEffect: { type: "gain_note", text: "Crownless Advocate: one faction demand or rivalry bargain was softened." }`
- Final rule: `Once per round, record that the Crownless Advocate softened one faction demand or stabilized one rivalry bargain.`
- Preserved: stable ID, `informant` role, loyalty 3, `oncePerRound`, `lossCondition: "choice"`, catalog membership, and all follower lifecycle behavior.

### `saltflat-bone-reader`

- Removed: `activeEffect: { type: "lose_heat", amount: 1 }`
- Added: `activeEffect: { type: "gain_note", text: "Saltflat Bone-Reader: one scar, omen, or void-salt bargain became a safer route note." }`
- Final rule: `Once per round, record a safer route note from one scar, omen, or void-salt bargain.`
- Preserved: stable ID, `ritualist` role, loyalty 2, `oncePerRound`, compatibility-only `lossCondition: "heat"`, catalog membership, and all follower lifecycle behavior.

The active effects were not deleted. This avoids the undocumented role-based fallback in `GameRoomServer.createFollowerUseAction` and makes the approved note authoritative.

## Lifecycle and privacy

- Activation remains an owner-only `USE_FOLLOWER` action during the normal action phase.
- The server derives the effect from the attached canonical follower; the phone submits only the stable follower ID.
- The existing stable-ID `oncePerRound` event-log boundary remains authoritative, including duplicate follower instances.
- The note is applied once to the owner's private notes.
- Other phones and TV receive no private note text.
- Reconnect preserves both the recorded note and the round-use boundary.
- No acquisition source was added. These followers remain reachable only through existing legacy state, tests, or future separately approved content.

## Compatibility and validation boundary

Both follower IDs were removed from `LEGACY_HEAT_EFFECT_APPROVALS`. The remaining two entries in that manifest are non-follower historical text exceptions; they do not authorize an active typed Heat effect.

Repository JSON classification after C5B:

- board: 0
- scenario: 0
- escalation: 0
- followers: 0
- total active authored typed Heat: **0**

Compatibility remains intentionally retained for legacy save parsing, inert follower metadata, old action/type support, and projection stripping. `HEAT_THRESHOLD_REACHED` remains an exact no-op, and no Heat-to-Scar mapping exists.

## No replacement mechanics

C5B added no Wound, Scar, Salvage, payment, Global Escalation, movement, route mutation, Equipment effect, temporary modifier, discard, exhaustion, faction mutation, mission progress, Contract progress, or Rivalry inspection.

## Tests

Focused C5B coverage proves:

- exact stable IDs, text, note effects, roles, loyalty, use limits, legacy metadata, and 24-card follower catalog;
- zero canonical authored typed Heat;
- both IDs absent from `LEGACY_HEAT_EFFECT_APPROVALS`;
- exact owner-private note applied once;
- wrong-seat rejection;
- shared stable-ID once-per-round enforcement across duplicate instances;
- reconnect preservation without replay;
- no Wound, Scar, Salvage, follower-count, or other personal-resource mutation;
- owner phone, other phone, and TV remain Heat-free;
- the private note is absent from non-owner and TV projections.

## Audit verdict

The evidence-backed post-C5B verdict is **CONDITIONAL PASS**:

- active authored Heat effects: zero;
- active player-facing Heat: zero;
- gameplay-mutating Heat reads/writes: zero;
- `HEAT_THRESHOLD_REACHED`: inert;
- Heat-to-Scar conversion: zero;
- phone/TV Heat projection: zero.

PASS is deferred until the remaining compatibility types, dead code/assets, broad historical documentation, and save-version deletion dependencies receive the planned final cleanup audit. Full compatibility deletion was not performed or approved here.

## Verification

- repository JSON typed-Heat search: 0 matches;
- `npm.cmd run validate:content`: passed, including 24 followers and 109 Threats;
- `npm.cmd run typecheck`: passed;
- focused C5B plus containment: 2 files / 10 tests passed;
- legacy validation: 1 file / 23 tests passed;
- `npm.cmd run test:engine`: 60 files / 712 tests passed;
- `npm.cmd run test:integration`: 27 files / 233 tests passed;
- `npm.cmd run test:client`: 26 files / 260 tests passed;
- `npm.cmd run test`: 113 files / 1,205 tests passed;
- reconnect flapping regression passed on the first integration and aggregate runs;
- `npm.cmd run audit:assets`: 422 / 422 present, zero missing, invalid, placeholder, or release-blocking assets;
- `npm.cmd run build`: passed.

Final diff and staged-diff checks are recorded in the commit handoff.
