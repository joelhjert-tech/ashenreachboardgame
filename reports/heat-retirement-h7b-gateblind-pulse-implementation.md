# Heat Retirement H7B — Gateblind Pulse guarded escalation implementation

Status: **IMPLEMENTED H7B**.

Approval source: `998e7bf docs: approve gateblind pulse heat retirement` and `reports/heat-retirement-h7a-gateblind-pulse-approval.md`.

Stable ID: `gateblind-pulse`.

## Implemented rule

> On failure, if Global Escalation is not already one step from collapse, advance Global Escalation by 1.

The card now authors one typed `gain_global_escalation_guarded` effect with amount 1 and the `oneBeforeCollapse` guard. Its stable identity, Blue hazard lane, Signal 10 test, art, graph membership, success-side scenario progress, reward behavior, persistence, and card count are unchanged. The obsolete player-facing Heat branch is removed.

## Mode guard table

| Mode | Collapse value | Eligible pre-effect values | Guard value | Result at guard |
|---|---:|---|---:|---|
| Multiplayer | 6 | 0–4 request 1 | 5 | requested 0, actual 0, remains 5 |
| Solo | 8 | 0–6 request 1 | 7 | requested 0, actual 0, remains 7 |

The server derives the active collapse value from the authoritative session mode. Values are not authored separately on the card and are never supplied by a client. Gateblind cannot produce 6 in multiplayer or 8 in solo.

## Authority and ordering

On the authoritative failed Signal result, the engine validates the active Threat, acting seat, source stable ID, source event, and exact typed effect. The room server reads the current shared escalation and mode, applies the guard before any positive-gain modifier or reaction, and derives requested delta 1 below the guard or 0 at the guard. The existing escalation action applies the valid delta, updates the derived difficulty band once, projects the public result, records the source, and lets the Threat lifecycle finalize once.

No Gateblind-specific escalation store, shared pending state, scenario branch, condition-expression engine, or client-authored calculation was added.

## Guarded zero-delta recording

At the guard, the server still commits an authoritative `ESCALATION_ADVANCED` source event containing the Gateblind source, acting seat, previous value, requested 0, actual 0, resulting unchanged value, and typed internal reason `oneBeforeCollapseGuard`. The reducer verifies these derived values. This completed source remains in the existing action ledger, so reconnect, duplicate delivery, reducer replay, or a second phone cannot reconsider the failure later.

Players receive plain public feedback that Gateblind cannot move escalation closer to collapse and that the shared value remains unchanged. Internal guard and source IDs are not projected in player-facing text.

## Modifiers, thresholds, and collapse

The guard is evaluated before positive escalation abilities. A below-guard gain continues through the existing modifier/ability path. Bone Bell’s existing positive-spike cancellation can turn the eligible +1 into actual 0; Signal Witch Choir Lash retains its existing positive-spike notification behavior. Cold Brace remains limited to its existing Wound context. A guarded zero does not open positive-gain reactions and cannot be amplified.

A valid +1 may cross one ordinary Global Escalation difficulty-modifier threshold; the derived difficulty band updates through the existing selector and public projections. The Gateblind branch returns before collapse processing and the reducer rejects any result at or beyond the authoritative collapse value. Other sources, including `shattered-barricade`, retain their existing unconditional, collapse-capable behavior.

## Scenario isolation

Gateblind changes only the existing shared Global Escalation value. It does not directly modify scenario preparation, confrontation progress, victory, loss, center-tile access, or a separate loss-pressure bar. Existing scenario rules may observe the resulting shared value exactly as they did before.

## Replay, reconnect, and presentation

The existing source-event ledger and action-log reconstruction preserve positive and guarded-zero completion, final value, derived difficulty band, and public result across reconnect. Repeated source processing is rejected before a second delta, threshold transition, reward, or Trophy outcome can occur.

Phone and TV reuse the current Threat and public escalation result presentation. Eligible failures report the actual +1 and resulting value. Guarded failures report containment at the collapse boundary and the unchanged value. No Heat, private calculation, internal reason code, or source ID is shown, and no new player control or focus mode is introduced.

## Focused coverage

Focused H7B tests cover:

- exact content identity, typed effect, legacy Heat removal, unchanged success and 109-card totals;
- multiplayer `0 → 1`, `4 → 5`, and guarded `5 → 5`;
- solo `0 → 1`, `6 → 7`, and guarded `7 → 7`;
- ordinary difficulty-threshold crossing once and public projection parity;
- Bone Bell below the guard and the absolute guarded zero;
- wrong-seat, forged-source, duplicate-source, and reconnect reconstruction behavior;
- unchanged collapse-capable `shattered-barricade` behavior; and
- hash-pinned `marrow-tax-auditors` and `memory-tax-gate` definitions.

## Playtest risks

Severity remains 3. Gateblind appears in three canonical graph references and can raise shared test difficulty, so clustered failures remain the main balance risk. Conversely, failure becomes consequence-free at the one-before-collapse guard; that is deliberate because the table is already at maximum nonterminal pressure. Monitor perceived fairness and frequency, but do not add overflow or substitute punishment without a separate approval.

## Verification

The H7B slice passes content validation and typecheck; focused Gateblind, legacy Heat-population, ordinary-threshold, Shattered Barricade, scenario-pressure, and reconnect tests; `test:engine` (48 files / 602 tests); `test:integration` (26 files / 226 tests); `test:client` (26 files / 257 tests); the aggregate `test` command (100 files / 1,085 tests); asset audit (404/404 present); and production build. Both diff checks pass. Client tests emit only the existing deliberate missing-art fallback diagnostics.

## Remaining blocked Heat-linked Threats

- `marrow-tax-auditors` — economy-frequency and starvation risk remains unresolved.
- `memory-tax-gate` — exact private-choice ownership, options, projection, persistence, and cancellation lifecycle remains unresolved.

The +116-card expansion remains unapproved.
