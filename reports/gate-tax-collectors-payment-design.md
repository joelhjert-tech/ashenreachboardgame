# Gate-Tax Collectors — payment design

Status: **recommended, pending user approval**. Content remains unchanged.

## Current content reconstruction

| Field | Current value |
|---|---|
| Stable ID | `gate-tax-collectors` |
| Display name | Gate-Tax Collectors |
| File | `content/cards/threats/gate-tax-collectors.json` |
| Category | Enemy Threat; bureaucracy family; yellow lane |
| Placement | Outer region, common rarity, push tempo |
| Activation/test | Command, difficulty 5 |
| Trophy | 4 on defeat |
| Victory branch | `gain_note`: false transit chit |
| Loss branch | `gain_heat 1` compatibility no-op |
| Persistence | Normal unresolved enemy behavior on loss; defeated enemy follows existing trophy/cleanup flow |

Visible copy describes collectors demanding a route writ, Scar tally, and impossible fee. Runtime does not currently ask for payment: victory grants the private note and trophy behavior; loss applies no additional state change because `gain_heat` is a deliberate no-op. At zero Salvage nothing special happens.

The Phase 1D phrase “Pay up to 1 Salvage before reward; floor 0” is not valid payment semantics: “up to” and floor-zero are automatic-loss concepts, while full payment requires affordability. Git history shows the card always used `gain_heat 1`; it never had an implemented toll, passage, or choice rule. History therefore does not authorize a movement gate or reward purchase.

## Exact preferred future interaction

**Required payment after a lost confrontation.**

Player-facing rule:

> **Collector's Levy — After you lose this confrontation, you must pay 1 Salvage if able. If you cannot pay, record the unpaid levy and continue. The Collectors remain unresolved.**

Exact behavior:

- Trigger: final combat result is a loss, before the loss branch completes.
- Cost: exactly 1 Salvage.
- If Salvage is 1 or more: only `Pay 1 Salvage` is legal; full payment is deducted atomically and the encounter loss continues.
- If Salvage is 0: only `Unable to pay` is legal; deduct nothing, add a concise authored note/public result, and continue.
- Refusal while affordable: not allowed. This is a required levy, not an optional bribe.
- Benefit: none. Payment is the authored loss consequence, not a purchase.
- Alternative consequence: no extra resource or movement penalty; the ordinary lost-confrontation state remains. The Collectors remain unresolved under existing enemy rules.
- Movement: unchanged. No passage, gate, displacement, route denial, or rollback is introduced.
- Trophy/victory: unchanged; the payment does not occur on victory and does not buy the false transit chit or trophy.
- Target: active owner only; never another seat or shared Salvage.

This differs from `lose_salvage 1` because it is all-or-nothing, explicitly acknowledged, and cannot partially remove an amount. With a cost of 1 the numeric mutation is similar when affordable, but the authored semantics and future validation boundary remain payment.

## UI and result copy

Phone:

- `Gate-Tax Collectors`
- `The Collectors demand 1 Salvage after your defeat.`
- Current Salvage shown privately.
- Affordable control: `Pay 1 Salvage`.
- Zero-Salvage control: `Unable to pay` with `You have no Salvage. No debt is created.`
- No cancel button while affordable.

TV waiting state: `[Operative] is answering the Gate-Tax Collectors' levy.` Exact private Salvage is hidden.

Public result:

- Paid: `[Operative] paid 1 Salvage to the Gate-Tax Collectors.`
- Unable: `[Operative] could not pay the Gate-Tax Collectors. No debt was created.`

The phone then returns to the existing combat-loss outcome. Reconnect restores the same mandatory option. Stale or duplicate submissions reject without a second deduction.

## Balance and edge cases

| Measure | Result |
|---|---|
| Current effective severity | 0 |
| Proposed severity | 1 |
| Cost | 1 Salvage |
| Frequency | Common outer yellow enemy; only on final combat loss |
| Repeatability | Can recur while the unresolved enemy remains |
| Zero-Salvage behavior | No deduction, no debt, no free benefit |
| Co-op | Owner-only economy impact |
| Rivalry | Cannot target another seat; public outcome reveals no exact remaining total |

Repeated losses can consume additional Salvage, but each requires a fresh authoritative confrontation loss. The zero floor prevents economic lock or negative currency. Paying does not remove the enemy, grant passage, or improve the result, so no reward loop exists. The prompt adds waiting time; one-tap mandatory acknowledgement is preferred over a second confirmation.

## Implementation requirements

- `encounter_payment` in `required` mode on `woundOnLoss`.
- Cost 1; paid result `none`; unaffordable result is a bounded authored note.
- Persisted pending decision and remaining encounter continuation.
- Owner-only phone action, public-safe TV wait/result.
- Tests for zero/exact/excess Salvage, no refusal while affordable, repeated loss, wrong seat, stale/duplicate, reconnect, unchanged movement/trophy/victory, and enemy persistence.

Implementation readiness: **ready after the shared architecture is approved and implemented**. No movement foundation is required.
