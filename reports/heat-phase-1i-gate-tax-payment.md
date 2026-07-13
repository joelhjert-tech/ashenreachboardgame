# Phase 1I — Encounter Payment and Gate Tax Collectors

## Outcome

Phase 1I adds one narrow, typed, persisted encounter-payment decision and migrates only `gate-tax-collectors`. `lose_salvage` remains an automatic floor-zero consequence; it is not used for payment. `rust-choir-peddlers` remains unchanged and blocked pending explicit approval of an enforceable benefit.

## Architecture implemented

- **Schema:** `encounter_payment` supports `required` and `optional` modes, positive-integer Salvage costs, stable authored option IDs, owner-facing labels, and the bounded results `none`, `heal_wound 1`, and `gain_note`. Optional decisions require a free alternative; required decisions require an unaffordable result and forbid decline.
- **Session state:** optional `pendingEncounterDecision` stores the decision ID/version, owner seat, source card/resolution/branch, authoritative legal options, costs, bounded effects, and creation time. `resolvedEncounterDecisionIds` prevents replay.
- **Intent/action:** the phone sends only `ENCOUNTER_DECISION_REQUESTED` with decision ID, version, and option ID. The server maps it to the single `ENCOUNTER_DECISION_RESOLVED` reducer action after normal seat-token validation.
- **Validation:** active seat, resolution phase, current source resolution and encounter, exact decision ID/version, authoritative option, affordability, and deterministic effect preconditions are rechecked.
- **Atomicity:** deduction and bounded result occur in one reducer transition. Failure before acceptance changes neither Salvage nor continuation. Resolved IDs prevent a second deduction or result.
- **Continuation:** automatic resolution pauses while the decision exists. Continue requests are rejected until it closes; the existing outcome summary then resumes normally.
- **Projection:** only the owner receives actionable options and authoritative current Salvage. Other phones receive no controls. TV receives a public waiting state without cost tokens, private inventory, or option authority.

## Gate Tax Collectors migration

| Field | Before | After |
|---|---|---|
| Trigger | Lost Command 5 confrontation | Unchanged |
| Authored consequence | `gain_heat 1` | Required `encounter_payment`, 1 Salvage |
| Effective result | Deliberate no-op | Pay exactly 1 Salvage when affordable |
| At zero Salvage | No mutation | No deduction, no debt, authored unpaid summary |
| Enemy lifecycle | Unresolved enemy remains | Unchanged |
| Victory | False transit chit/trophy cleanup | Unchanged |
| Movement/gate behavior | None | None |

The required option cannot be refused when affordable. Payment grants no benefit and does not clear the enemy; it is the post-loss levy. The unaffordable path opens no impossible prompt, emits no false delta, creates no debt, and completes the loss outcome. Paid results report `Paid 1 Salvage`; the authoritative event carries a one-point Salvage deduction.

Stable ID, display name, Command 5 confrontation, yellow-lane placement, common rarity, trophy value, success reward, and art/catalog membership remain unchanged.

## Persistence, reconnect, and security

Pending decisions round-trip through the existing session schema. Rejoining owners receive the same decision ID/version and legal options; other seats cannot act. A resolved decision is removed and recorded, so old pre-reconnect intents, duplicate submissions, manipulated option IDs, and wrong-seat requests reject. Existing saves omit the optional fields safely and receive compatibility defaults.

No client-supplied cost, effect, target, source branch, current Salvage, or benefit is trusted.

## Phone and TV

The owner phone shows the encounter name, prompt, `Pay 1 Salvage`, current Salvage, and one-tap required action. It does not show a decline action for Gate Tax Collectors. The TV shows the acting player is resolving the levy, then the public result. Neither surface exposes Heat, Risk, option IDs, decision tokens, or private remaining inventory beyond existing rules.

## Validation guard

Structured schema validation rejects missing/non-positive/fractional costs, unknown modes, duplicate or missing option identifiers, optional decisions without a free alternative, required decisions without an unavailable result, and unsupported nested results. The legacy Heat guard no longer allowlists Gate Tax Collectors and rejects Heat/Risk wording inside payment definitions. Existing automatic-loss and compatibility rules remain intact.

## Compatibility counts

| Measure | Before | After |
|---|---:|---:|
| Heat-only IDs | 31 | 30 |
| Heat-only branches | 34 | 33 |
| Heat-effect occurrences | 76 | 75 |
| Compatibility allowlist IDs | 100 | 99 |
| `gain_heat` | 60 | 59 |
| `gain_heat_all` | 4 | 4 |
| `lose_heat` | 12 | 12 |
| `lose_salvage` | 7 | 7 |
| Production `encounter_payment` users | 0 | 1 |

The count change is exactly the removed Gate Tax `gain_heat` clause. Rust Choir Peddlers remains allowlisted.

## Tests

Focused Phase 1I coverage verifies schema boundaries, required and optional modes, stable pending state, exact payment, zero-Salvage behavior, wrong-seat/stale/invalid/duplicate rejection, continuation blocking, private/public projection, serialization, authenticated server intent, Gate-only content migration, and Rust Choir preservation. Existing Phase 1E/1F/1G population tests were advanced only to the new 99-ID allowlist boundary. Phone coverage verifies the owner action and authoritative intent.

The known room-server phase mismatch was reproduced and corrected before Phase 1I in commit `538bd26`; the clean Phase 1I baseline was 761/761.

## Four-seat critique

- **New Player:** Pay is explicitly distinguished from Lose, the exact cost and waiting owner are visible, zero Salvage creates no hidden debt, and Heat/Risk do not appear.
- **Optimizer:** payment cannot be refused or client-edited, one decision cannot deduct twice, zero Salvage grants no paid benefit, and enemy cleanup cannot be replayed.
- **Family Player:** the mandatory affordable path is one tap, the TV identifies who must act, and no meter, debt, or manual bookkeeping was added.
- **Rules Lawyer:** full affordability precedes mutation; payment/result are atomic; unaffordable behavior is authored; exact decision versions and resolved IDs settle races; continuation resumes once.

## Explicit non-changes

No shop transaction semantics, automatic `lose_salvage` behavior, Heat field, Mirror threshold, generic Heat discriminator, movement/gate rule, Wound/Scar/pressure/escalation mechanic, new currency, or save migration changed.

Rust Choir Peddlers remains blocked because its proposed heal-1-Wound benefit is not approved. Higher-severity Salvage, equipment, tests/challenges, Wounds, Scar, Loss Pressure, Global Escalation, bespoke rewrites, retirement, mixed Heat clauses, authored defaults, save/schema cleanup, and Mirror-key migration remain later work.
