# Phase 1X — four Heat losses converted to Wounds

Status: implemented and verified. The earlier clause-removal preflight correctly stopped because strict enemy and hazard schemas require these outcome fields. The later proposal for a canonical `none` effect was superseded before commit and was fully removed. The approved resolution uses the existing authoritative `{ "type": "take_wound", "amount": 1 }` effect.

## Baseline and decision

The reproducible Phase 1W baseline was 36 Heat-only IDs, 38 Heat-only branches, and 38 Heat-effect occurrences: 25 `gain_heat`, 3 `gain_heat_all`, and 10 `lose_heat`. There were 38 Heat-effect approvals plus 14 other compatibility approvals, or 52 approved IDs.

All four target branches previously contained only `gain_heat 1`, which current gameplay treated as a compatibility no-op. The explicit Phase 1X balance decision activates one real Wound on loss/failure while preserving authored severity 1. No schema, resolver, global Wound rule, prompt, or new discriminator was needed.

## Implemented branches

| ID | Route and frequency | Branch | Before | After | Authored severity | Prevention / recall |
|---|---|---|---|---|---:|---|
| `bell-mask-pilgrim` | blue outer enemy; canonical graph x2 | `woundOnLoss` | `gain_heat 1` no-op | `take_wound 1` | 1 | existing prevention; normal threshold recall |
| `cracked-censer-novice` | blue outer enemy; canonical graph x3 | `woundOnLoss` | `gain_heat 1` no-op | `take_wound 1` | 1 | existing prevention; normal threshold recall |
| `glasswing-midge-cloud` | blue outer enemy; canonical graph x2 | `woundOnLoss` | `gain_heat 1` no-op | `take_wound 1` | 1 | existing prevention; normal threshold recall |
| `roadside-bone-oracle` | blue outer hazard; canonical graph x2 | `failEffect` | `gain_heat 1` no-op | `take_wound 1` | 1 | existing prevention; normal threshold recall |

The three enemies remain unresolved after loss under the existing encounter flow. Roadside Bone Oracle's failure continues through the existing hazard resolution. Its success note is unchanged. Every enemy defeat reward is unchanged. Stable IDs, titles, difficulty, severity, lane, category, art, catalog membership, graph placement, and all sibling branches remain unchanged.

The content's general prose did not assert a Heat result, so no broad lore rewrite was required. Existing resolution presentation truthfully reports `Failure: take 1 wound.` on phone and TV without exposing the raw discriminator. The four resource tags now say `wound` rather than the obsolete `heat` tag.

## Authoritative Wound behavior

The existing server resolution path applies the effect once. Wounds move 0→1 or 1→2, and an operative one Wound below the session threshold reaches the threshold through the normal recall action. Existing Wound prevention runs in its established timing window: Ker's Hold the Line prevents the mutation, records its existing private note, emits no threshold action, and is not applied twice.

The effect does not directly modify Scars. A Scar appears only through the existing recall path. Reconnection round-trips an unresolved branch, preserves its pending effect, and continuation clears that effect after one resolution; continuing again cannot reapply it. No Heat, Risk, Salvage, pressure, Equipment, movement, Contract, note, trophy, or prompt behavior was added.

## Compatibility cleanup and counts

The four IDs have no remaining Heat construct, so their exact `gain_heat` approvals were removed. No unrelated approval changed. Legacy v0 character Heat, archival metadata, Mirror's strict v0/v1 threshold key, current v2, and generic Heat discriminators for remaining content are untouched.

| Measure | Before | After |
|---|---:|---:|
| Heat-only IDs | 36 | 32 |
| Heat-only branches | 38 | 34 |
| Heat effects | 38 | 34 |
| `gain_heat` | 25 | 21 |
| `gain_heat_all` | 3 | 3 |
| `lose_heat` | 10 | 10 |
| Heat compatibility approvals | 52 | 48 |
| Target `take_wound` effects | 0 | 4 |
| All canonical `take_wound` occurrences | 77 | 81 |
| Changed content IDs | 0 | 4 |

Active character-Heat reads/writes, projection Heat keys, and player-facing Heat/Risk routes remain zero. Snapshot versions remain v0/v1/v2.

## Balance assessment

| ID | Current effective severity | New consequence | Proposed severity | Recall risk | Prevention access |
|---|---:|---|---:|---|---|
| `bell-mask-pilgrim` | 0 | suffer 1 Wound on combat loss | 1 | only when already one below threshold | standard existing prevention |
| `cracked-censer-novice` | 0 | suffer 1 Wound on combat loss | 1 | only when already one below threshold | standard existing prevention |
| `glasswing-midge-cloud` | 0 | suffer 1 Wound on combat loss | 1 | only when already one below threshold | standard existing prevention |
| `roadside-bone-oracle` | 0 | suffer 1 Wound on failed Signal test | 1 | only when already one below threshold | standard existing prevention |

Maximum catalog exposure is four additional Wounds if one operative encounters and fails all four once; repeat draws can increase exposure under existing deck rules. A typical session sees only a subset of their nine graph placements, so expected exposure is lower. Early play becomes meaningfully more dangerous because low recovery reserves make each Wound matter. Late play has more healing and prevention access but also greater recall proximity. Cooperative play can distribute encounters and support recovery; Rivalry keeps each Wound owner-scoped. No values were adjusted in this phase. Broad playtesting should watch cumulative blue-lane Wound density and recall frequency.

## Tests and verification

The focused Phase 1X suite contains 15 tests covering exact content, stable availability/art, four successful one-Wound mutations, four Ker prevention paths, four recall-threshold paths, unchanged sibling branches, phone/TV summaries, unresolved-state round-trip, one-time continuation, and replay resistance. The legacy validation suite adds 22 checks and confirms 34 Heat-effect approvals / 48 total approval IDs.

Regression coverage retains Void-Salt Sickness, Rust Choir Peddlers, Gate Tax Collectors, prior Salvage migrations, snapshots v0/v1/v2, archival metadata, Mirror reflection pressure, and Heat-free projections. Full command results are recorded in the Phase 1X handoff.

## Four-seat critique

- **New Player:** losing or failing now visibly costs exactly 1 Wound through the existing health display. Heat and Risk remain absent.
- **Optimizer:** prevention remains server-authoritative and single-use under its existing rules. Reconnect and continuation cannot duplicate the Wound or recall. No reward became free.
- **Family Player:** the result is immediate, uses familiar healing, and introduces no prompt or bookkeeping.
- **Rules Lawyer:** the required branches stay structurally present; `take_wound 1` resolves at the former Heat position, prevention precedes actual mutation through existing server logic, recall uses the session threshold, enemy persistence and hazard continuation remain deterministic, and summaries match the applied mutation.

## Files changed

- Four canonical threat JSON files: replace only `gain_heat 1` with `take_wound 1` and change the obsolete resource tag from `heat` to `wound`.
- `scripts/legacy-heat-validation.ts` and its count tests: remove exactly four obsolete approvals.
- `src/game/engine/__tests__/heatPhase1xFourWoundConversions.test.ts`: focused content, engine, prevention, recall, presentation, availability, and reconnect coverage.
- Three prior Heat-retirement regression tests: update the precise approval total from 52 to 48.
- This report and the two decision registers: record the superseding Wound decision and implementation.
- Seven Phase 1W reports: carried forward unchanged into the implementation commit.

## Remaining reconstructed work

The original remove-without-replacement batch is closed by this superseding Wound decision. Pending Phase 1W recommendations remain: Salvage gain 2; automatic Salvage loss 5; Wound gain 6; Wound healing 3; Scar 1; Loss Pressure 2; Global Escalation 2; Equipment 2; tests/challenges 1; temporary modifiers 3; movement/gate 1; bespoke rewrites 4. Legacy parser/support-window decisions, archival-metadata closure, and stable discriminator cleanup remain separate.
